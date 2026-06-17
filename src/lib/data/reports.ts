"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";

export type ReportTarget = "artist" | "studio" | "review" | "message";

/** File a report (called from the client report button). */
export async function submitReport(input: {
  targetType: ReportTarget;
  targetId: string;
  reason: string;
  details?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { targetType, targetId, reason } = input;
  const details = input.details?.trim() || null;
  if (!["artist", "studio", "review", "message"].includes(targetType) || !targetId || !reason.trim()) {
    return { ok: false, error: "Please choose a reason." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to report." };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason: reason.trim(),
    details,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Append an entry to the admin audit trail. */
async function logAdminAction(action: string, targetType: string, targetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await createAdminClient().from("admin_actions").insert({
    admin_id: user?.id ?? null,
    action,
    target_type: targetType,
    target_id: targetId,
  });
}

/** Admin: mark a report dismissed (no action needed). */
export async function dismissReport(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("report_id") ?? "");
  if (id) {
    await createAdminClient().from("reports").update({ status: "dismissed" }).eq("id", id);
    await logAdminAction("dismiss_report", "report", id);
  }
  revalidatePath("/admin/reports");
  redirect("/admin/reports");
}

/** Admin: hide a reported review (removes it from public + the rating) and close the report. */
export async function hideReportedReview(formData: FormData) {
  await requireAdmin();
  const reportId = String(formData.get("report_id") ?? "");
  const reviewId = String(formData.get("review_id") ?? "");
  const admin = createAdminClient();
  if (reviewId) await admin.from("reviews").update({ hidden: true }).eq("id", reviewId);
  if (reportId) await admin.from("reports").update({ status: "actioned" }).eq("id", reportId);
  if (reviewId) await logAdminAction("hide_review", "review", reviewId);
  revalidatePath("/admin/reports");
  redirect("/admin/reports");
}
