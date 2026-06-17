"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runMatching } from "@/lib/data/matching";

/** Resolve the signed-in user's own request (admin read, ownership-checked). */
async function ownedRequest(requestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my-requests");

  const admin = createAdminClient();
  const { data: req } = await admin
    .from("tattoo_requests")
    .select("id, customer_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req || req.customer_id !== user.id) redirect("/my-requests");
  return { admin, req };
}

/** Permanently delete a request. All related rows (images, matches, quotes,
 *  conversations, messages, bookings, reviews) cascade in the DB; we also clear
 *  the uploaded reference images from Storage. */
export async function deleteRequest(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) redirect("/my-requests");
  const { admin } = await ownedRequest(requestId);

  const { data: imgs } = await admin
    .from("request_images")
    .select("storage_path")
    .eq("request_id", requestId);
  const paths = (imgs ?? []).map((i) => i.storage_path).filter(Boolean);
  if (paths.length) await admin.storage.from("request-images").remove(paths);

  await admin.from("tattoo_requests").delete().eq("id", requestId);

  revalidatePath("/my-requests");
  redirect("/my-requests?deleted=1");
}

/** Unpublish a live request: move it to drafts so it stops appearing in artist
 *  leads. (Existing quotes/chats are kept in case it's re-posted.) */
export async function moveRequestToDraft(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) redirect("/my-requests");
  const { admin, req } = await ownedRequest(requestId);
  if (req.status === "booked") redirect("/my-requests"); // can't unpublish a booking

  await admin.from("tattoo_requests").update({ status: "draft" }).eq("id", requestId);

  revalidatePath("/my-requests");
  redirect("/my-requests");
}

/** Post a draft: make it live. If it has never been matched, run matching now
 *  (so artists are notified); otherwise just re-activate without re-emailing. */
export async function publishRequest(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) redirect("/my-requests");
  const { admin } = await ownedRequest(requestId);

  // Posting (or re-posting) starts a fresh 6-week window.
  const expiresAt = new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000).toISOString();
  await admin
    .from("tattoo_requests")
    .update({ status: "live", expires_at: expiresAt })
    .eq("id", requestId);

  const { count } = await admin
    .from("request_matches")
    .select("*", { count: "exact", head: true })
    .eq("request_id", requestId);
  if (!count) await runMatching(requestId);

  revalidatePath("/my-requests");
  redirect(`/requests/${requestId}`);
}
