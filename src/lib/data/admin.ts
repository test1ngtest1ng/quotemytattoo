"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";

/** The signed-in admin's own user id (used to prevent self-harm actions). */
async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Append an entry to the admin audit trail. */
async function logAdminAction(
  adminId: string | null,
  action: string,
  targetType: string,
  targetId: string,
  detail?: string,
) {
  await createAdminClient().from("admin_actions").insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    detail: detail ?? null,
  });
}

/** Suspend (reversible ban) or un-suspend an account. */
export async function setSuspended(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("user_id") ?? "");
  const suspended = String(formData.get("suspended") ?? "") === "1";
  if (!id) return;
  const adminId = await currentUserId();
  if (id === adminId) {
    redirect(`/admin/users/${id}?error=${encodeURIComponent("You can't suspend your own account.")}`);
  }
  const admin = createAdminClient();
  await admin.from("profiles").update({ suspended }).eq("id", id);
  // Mirror into auth app_metadata so the proxy can enforce suspension straight
  // from getUser() - no per-request profiles lookup.
  await admin.auth.admin.updateUserById(id, { app_metadata: { suspended } });
  await logAdminAction(adminId, suspended ? "suspend_user" : "restore_user", "user", id);
  revalidatePath(`/admin/users/${id}`);
  revalidatePath("/admin/users");
  redirect(`/admin/users/${id}`);
}

/** Edit an account's basic profile fields (admin fix-ups). */
export async function updateUserProfile(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("user_id") ?? "");
  if (!id) return;
  const name = String(formData.get("name") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const admin = createAdminClient();

  // Keep the auth email and the profile email in sync when it changes.
  if (email) {
    const { data: existing } = await admin.from("profiles").select("email").eq("id", id).maybeSingle();
    if (existing && existing.email !== email) {
      const { error: authErr } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true });
      if (authErr) {
        redirect(`/admin/users/${id}?error=${encodeURIComponent(authErr.message)}`);
      }
    }
  }

  await admin.from("profiles").update({ name, phone, ...(email ? { email } : {}) }).eq("id", id);
  await logAdminAction(await currentUserId(), "edit_profile", "user", id);
  revalidatePath(`/admin/users/${id}`);
  revalidatePath("/admin/users");
  redirect(`/admin/users/${id}?saved=1`);
}

/** Set an artist's verification status (badge only - never gates visibility). */
export async function setArtistVerification(formData: FormData) {
  await requireAdmin();
  const artistId = String(formData.get("artist_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!artistId || !["pending", "verified", "rejected"].includes(status)) return;
  await createAdminClient()
    .from("artists")
    .update({ verification_status: status, verified_at: status === "verified" ? new Date().toISOString() : null })
    .eq("id", artistId);
  await logAdminAction(
    await currentUserId(),
    status === "verified" ? "verify_artist" : status === "rejected" ? "reject_artist" : "reset_verification",
    "artist",
    artistId,
  );
  revalidatePath("/admin/verification");
  revalidatePath("/artists");
  redirect("/admin/verification");
}

/** Soft-delete (or restore) a tattoo request - hides it from artists' leads. */
export async function setRequestRemoved(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("request_id") ?? "");
  const removed = String(formData.get("removed") ?? "") === "1";
  if (!id) return;
  await createAdminClient().from("tattoo_requests").update({ removed }).eq("id", id);
  await logAdminAction(await currentUserId(), removed ? "remove_request" : "restore_request", "request", id);
  revalidatePath("/admin/requests");
  redirect("/admin/requests");
}

/** Permanently delete an account (auth user + cascaded data). Requires the
 *  admin to retype the account's email as a confirmation. */
export async function deleteAccount(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("user_id") ?? "");
  const confirm = String(formData.get("confirm_email") ?? "").trim().toLowerCase();
  if (!id) return;
  if (id === (await currentUserId())) {
    redirect(`/admin/users/${id}?error=${encodeURIComponent("You can't delete your own account.")}`);
  }

  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("email").eq("id", id).maybeSingle();
  if (!prof) redirect("/admin/users");
  if (!confirm || confirm !== (prof.email ?? "").toLowerCase()) {
    redirect(`/admin/users/${id}?error=${encodeURIComponent("Typed email didn't match - account not deleted.")}`);
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    redirect(`/admin/users/${id}?error=${encodeURIComponent(error.message)}`);
  }
  await logAdminAction(await currentUserId(), "delete_account", "user", id, prof.email ?? undefined);
  revalidatePath("/admin/users");
  redirect("/admin/users?deleted=1");
}

type GuestRow = { id: string; customer_id: string | null; request_images?: { storage_path: string }[] | null };

/** Remove uploaded images + delete the given abandoned guest requests. For rows
 *  whose owner never confirmed their email, the auth user is deleted too (which
 *  cascades the profile + their requests). Returns how many were purged. */
async function purgeGuestRequests(admin: ReturnType<typeof createAdminClient>, rows: GuestRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const paths = rows.flatMap((r) => r.request_images ?? []).map((i) => i.storage_path).filter(Boolean);
  if (paths.length) await admin.storage.from("request-images").remove(paths);

  const userIds = [...new Set(rows.map((r) => r.customer_id).filter((x): x is string => !!x))];
  for (const uid of userIds) {
    const { data } = await admin.auth.admin.getUserById(uid);
    if (data?.user && !data.user.email_confirmed_at) {
      await admin.auth.admin.deleteUser(uid); // cascades profile + requests + image rows
    }
  }
  // Delete any request rows whose owner was confirmed (so wasn't removed above).
  await admin.from("tattoo_requests").delete().in("id", rows.map((r) => r.id));
  return rows.length;
}

/** Admin: delete one abandoned guest request now (+ its images + the unconfirmed
 *  account). Guarded to publish_on_verify drafts so it can't touch real requests. */
export async function deleteGuestRequest(formData: FormData) {
  await requireAdmin();
  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) return;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("tattoo_requests")
    .select("id, customer_id, request_images(storage_path)")
    .eq("id", requestId)
    .eq("publish_on_verify", true)
    .maybeSingle();
  if (row) {
    await purgeGuestRequests(admin, [row as GuestRow]);
    await logAdminAction(await currentUserId(), "delete_guest_request", "request", requestId);
  }
  revalidatePath("/admin/guest-requests");
  redirect("/admin/guest-requests");
}

/** Admin: purge ALL abandoned guest requests now (capped per click for safety;
 *  the page shows the remaining count so it can be repeated during a flood). */
export async function purgeAllAbandonedGuestRequests() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("tattoo_requests")
    .select("id, customer_id, request_images(storage_path)")
    .eq("publish_on_verify", true)
    .eq("status", "draft")
    .order("created_at", { ascending: true })
    .limit(200);
  const n = await purgeGuestRequests(admin, (rows ?? []) as GuestRow[]);
  await logAdminAction(await currentUserId(), "purge_guest_requests", "request", "bulk", `purged ${n}`);
  revalidatePath("/admin/guest-requests");
  redirect("/admin/guest-requests");
}
