"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { geocode } from "@/lib/geo";
import { EMAIL_CATEGORIES } from "@/lib/notification-prefs";
import { SITE_URL } from "@/lib/site";

/** Save the user's default tattoo-request location + travel radius. These
 *  pre-fill the request wizard. Geocodes the postcode (or town) so distance
 *  matching works without re-geocoding each request. */
export async function updateRequestDefaults(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const postcode = String(formData.get("request_postcode") ?? "").trim() || null;
  const area = String(formData.get("request_area") ?? "").trim() || null;
  const radiusRaw = parseInt(String(formData.get("request_radius") ?? ""), 10);
  const radius = Number.isFinite(radiusRaw) ? Math.min(100, Math.max(1, radiusRaw)) : 15;

  let lat: number | null = null;
  let lng: number | null = null;
  const geoQuery = postcode || area;
  if (geoQuery) {
    const point = await geocode(geoQuery);
    lat = point?.lat ?? null;
    lng = point?.lng ?? null;
  }

  await supabase
    .from("profiles")
    .update({
      request_postcode: postcode,
      request_area: area,
      request_lat: lat,
      request_lng: lng,
      request_radius: radius,
    })
    .eq("id", user.id);
  revalidatePath("/account");
  redirect("/account?tab=requests&saved=requests");
}

export async function updateContact(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  await supabase.from("profiles").update({ name, phone }).eq("id", user.id);
  revalidatePath("/account");
  redirect("/account?tab=contact&saved=contact");
}

export async function updateNotifications(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Merge onto existing settings so unknown/legacy keys aren't wiped, and only
  // the rendered email categories are toggled (keys match EmailCategory).
  const { data: prof } = await supabase
    .from("profiles")
    .select("notification_settings")
    .eq("id", user.id)
    .maybeSingle();
  const settings: Record<string, unknown> = { ...((prof?.notification_settings as Record<string, unknown> | null) ?? {}) };
  for (const k of EMAIL_CATEGORIES) settings[k] = formData.get(`notif_${k}`) === "on";

  await supabase.from("profiles").update({ notification_settings: settings }).eq("id", user.id);
  revalidatePath("/account");
  redirect("/account?tab=notif&saved=notif");
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const password = String(formData.get("password") ?? "");
  if (password.length < 6) redirect("/account?tab=manage&error=Password must be at least 6 characters");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/account?tab=manage&error=${encodeURIComponent(error.message)}`);
  redirect("/account?tab=manage&saved=password");
}

export async function changeEmail(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    redirect("/account?tab=manage&error=" + encodeURIComponent("Please enter a valid email address."));
  }
  if (email === (user.email ?? "").toLowerCase()) {
    redirect("/account?tab=manage&error=" + encodeURIComponent("That's already your email address."));
  }

  // Supabase sends a confirmation link to the NEW address; the change only takes
  // effect once it's clicked (handled by /auth/confirm, type=email_change).
  // profiles.email stays as-is until then, and self-heals on the next account load.
  const next = encodeURIComponent("/account?tab=manage&emailchanged=1");
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${SITE_URL}/auth/confirm?next=${next}` },
  );
  if (error) redirect(`/account?tab=manage&error=${encodeURIComponent(error.message)}`);
  redirect("/account?tab=manage&saved=email");
}

export async function deleteAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // require explicit typed confirmation
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    redirect("/account?error=Type DELETE to confirm account deletion");
  }

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(user.id); // cascades profile + related rows
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
