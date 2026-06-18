"use server";

import { redirect } from "next/navigation";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runMatching } from "@/lib/data/matching";

async function publishPendingDrafts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await admin
    .from("tattoo_requests")
    .update({ status: "live", expires_at: expiresAt, publish_on_verify: false })
    .eq("customer_id", user.id)
    .eq("publish_on_verify", true)
    .eq("status", "draft")
    .select("id, target_artist_id");
  for (const r of rows ?? []) {
    try {
      await runMatching(r.id as string, {
        targetArtistId: (r.target_artist_id as string | null) ?? null,
      });
    } catch {
      /* non-critical */
    }
  }
}

export async function confirmEmail(formData: FormData) {
  const token_hash = formData.get("token_hash") as string | null;
  const type = formData.get("type") as EmailOtpType | null;
  const next = (formData.get("next") as string | null) ?? "/dashboard";

  if (!token_hash || !type) {
    redirect("/login?error=" + encodeURIComponent("Missing confirmation details."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    redirect("/login?error=" + encodeURIComponent("That link is invalid or has expired. Please request a new one."));
  }

  if (type !== "recovery" && type !== "email_change") {
    await publishPendingDrafts();
  }

  redirect(next);
}
