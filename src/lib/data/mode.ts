"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MODE_COOKIE = "qmt-mode";

/**
 * Switch between "artist" and "customer" mode. Presentation/navigation only
 * (recolours the header + swaps which nav links show) - never gates data/access.
 * Persisted in a cookie so the header renders the right mode server-side.
 *
 * Optional `to` lets a customer-action link (e.g. "Post a request" on the artist
 * dashboard) flip to customer mode AND land on its destination. When the mode
 * actually changed we append `?switched=<mode>` so a toast confirms the switch.
 */
export async function switchMode(formData: FormData) {
  const target = String(formData.get("mode") ?? "") === "customer" ? "customer" : "artist";
  const to = String(formData.get("to") ?? "");

  const store = await cookies();
  const prev = store.get(MODE_COOKIE)?.value ?? "artist";
  const changed = prev !== target;
  store.set(MODE_COOKIE, target, {
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  revalidatePath("/", "layout");

  // Explicit destination (customer-action link) - go there, toast if mode changed.
  if (to.startsWith("/") && !to.startsWith("//")) {
    if (!changed) redirect(to);
    const sep = to.includes("?") ? "&" : "?";
    redirect(`${to}${sep}switched=${target}`);
  }

  // Plain toggle (header) - no toast (the colour change is the feedback).
  if (target === "artist") redirect("/dashboard");

  // Switching to customer mode - nudge first-time buyers to complete their
  // request details so a tattoo request can be matched.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("request_postcode, request_area")
      .eq("id", user.id)
      .maybeSingle();
    const incomplete = !p?.request_postcode && !p?.request_area;
    if (incomplete) redirect("/account?tab=requests&prompt=customer");
  }
  redirect("/my-requests");
}
