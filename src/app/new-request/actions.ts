"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveUser } from "@/lib/auth/user";
import { runMatching } from "@/lib/data/matching";
import { geocode } from "@/lib/geo";
import { zoneLabel } from "@/lib/wizard";
import { SIZE_OPTIONS } from "@/lib/constants";
import { titleCase } from "@/lib/format";
import { looksLikeSpam, rateLimit } from "@/lib/antispam";
import { SITE_URL } from "@/lib/site";
import type { SizeCategory } from "@/lib/types";

const SIZE_VALUES = SIZE_OPTIONS.map((s) => s.value);

/** Parse + normalise the wizard fields shared by the logged-in (createRequest)
 *  and guest (submitGuestRequest) flows. Geocodes server-side as a fallback so
 *  distance matching works even if the browser couldn't resolve coordinates. */
async function parseRequestForm(formData: FormData) {
  const note = String(formData.get("note") ?? "").trim() || null;
  const placementId = String(formData.get("placement_id") ?? "").trim() || null;
  const placementView = String(formData.get("placement_view") ?? "").trim() || null;
  const sizeRaw = String(formData.get("size") ?? "").trim();
  const size = (SIZE_VALUES as string[]).includes(sizeRaw) ? (sizeRaw as SizeCategory) : null;
  const loc = String(formData.get("loc") ?? "").trim() || null;
  const targetArtistId = String(formData.get("target_artist_id") ?? "").trim() || null;
  const alsoBroadcast = String(formData.get("broadcast") ?? "") === "true";

  const radiusRaw = parseInt(String(formData.get("travel_radius_miles") ?? ""), 10);
  const travelRadiusMiles = Number.isFinite(radiusRaw) ? Math.min(100, Math.max(1, radiusRaw)) : 15;

  let lat = parseFloat(String(formData.get("latitude") ?? ""));
  let lng = parseFloat(String(formData.get("longitude") ?? ""));
  if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && loc) {
    const point = await geocode(loc);
    if (point) {
      lat = point.lat;
      lng = point.lng;
    }
  }
  const latitude = Number.isFinite(lat) ? lat : null;
  const longitude = Number.isFinite(lng) ? lng : null;

  const sizeLabel = SIZE_OPTIONS.find((s) => s.value === size)?.label ?? "Tattoo";
  const placementLabel = zoneLabel(placementId);
  const title = titleCase(`${sizeLabel} piece${placementLabel ? `, ${placementLabel}` : ""}`);

  return { note, placementId, placementView, size, loc, targetArtistId, alsoBroadcast, travelRadiusMiles, latitude, longitude, title };
}

/** Remember this location + radius as the user's default for their next request. */
async function saveRequestDefault(
  client: SupabaseClient,
  userId: string,
  f: Awaited<ReturnType<typeof parseRequestForm>>,
) {
  if (!f.loc) return;
  const looksPostcode = /\d/.test(f.loc);
  await client
    .from("profiles")
    .update({
      ...(looksPostcode ? { request_postcode: f.loc } : { request_area: f.loc }),
      request_lat: f.latitude,
      request_lng: f.longitude,
      request_radius: f.travelRadiusMiles,
    })
    .eq("id", userId);
}

/** Upload reference image File(s) to the private request-images bucket via the
 *  service-role client (bypasses the authenticated-only insert RLS) and return
 *  the storage paths. Used for the guest flow, where the browser had no session
 *  to upload with directly. */
async function uploadRequestImages(admin: SupabaseClient, files: File[]): Promise<string[]> {
  const paths: string[] = [];
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    const ext = file.type === "image/webp" ? "webp" : file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await admin.storage
      .from("request-images")
      .upload(path, file, { contentType: file.type || undefined });
    if (!error) paths.push(path);
  }
  return paths;
}

export async function createRequest(formData: FormData) {
  const supabase = await createClient();
  const user = await requireActiveUser();

  // Anti-spam (invisible): honeypot + timing, plus a soft per-user post cap.
  if (looksLikeSpam(formData)) redirect("/dashboard");
  if (rateLimit(`request:${user.id}`, 12, 60 * 60 * 1000))
    redirect("/new-request?error=" + encodeURIComponent("You're posting very quickly - please wait a little while."));

  const f = await parseRequestForm(formData);
  const isDraft = String(formData.get("intent") ?? "post") === "draft";
  const expiresAt = isDraft ? null : new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000).toISOString();

  // Anti-spam: cap how many live requests one account can have open at once.
  if (!isDraft) {
    const { count } = await supabase
      .from("tattoo_requests")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", user.id)
      .eq("status", "live");
    if ((count ?? 0) >= 10) {
      redirect("/new-request?error=" + encodeURIComponent("You already have 10 open requests. Please close some from your dashboard before posting more."));
    }
  }

  const { data: req, error } = await supabase
    .from("tattoo_requests")
    .insert({
      customer_id: user.id,
      title: f.title,
      note: f.note,
      placement_zone: f.placementId,
      placement_view: f.placementView,
      size_category: f.size,
      location_text: f.loc,
      location_area: f.loc,
      latitude: f.latitude,
      longitude: f.longitude,
      travel_radius_miles: f.travelRadiusMiles,
      status: isDraft ? "draft" : "live",
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !req) {
    redirect("/new-request?error=" + encodeURIComponent("Sorry, we couldn't post your request just now. Please try again."));
  }

  if (f.targetArtistId) {
    await supabase.from("tattoo_requests").update({ target_artist_id: f.targetArtistId }).eq("id", req.id);
  }

  await saveRequestDefault(supabase, user.id, f);

  // Reference images were uploaded to Storage from the browser; we get paths only.
  let imagePaths: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("image_paths") ?? "[]"));
    if (Array.isArray(parsed)) imagePaths = parsed.filter((p): p is string => typeof p === "string");
  } catch {
    imagePaths = [];
  }
  if (imagePaths.length > 0) {
    await supabase.from("request_images").insert(
      imagePaths.map((path) => ({ request_id: req.id, storage_path: path, kind: "reference" })),
    );
  }

  if (isDraft) {
    redirect("/my-requests");
  }

  await runMatching(req.id, { targetArtistId: f.targetArtistId, broadcast: f.alsoBroadcast });
  redirect(`/new-request/sent?id=${req.id}`);
}

/**
 * Guest flow: a logged-out visitor fills the whole wizard, then creates an
 * account (or signs in) at the final step. The request is created server-side
 * via the admin client (so it works whether or not a session exists yet) and the
 * reference images are uploaded here too. A brand-new account that still needs to
 * confirm its email gets the request saved as a draft (publish_on_verify) which
 * /auth/confirm publishes on confirmation. Returns { error } for inline display;
 * redirects on success.
 */
export async function submitGuestRequest(
  formData: FormData,
): Promise<{ error: string } | void> {
  if (looksLikeSpam(formData)) return { error: "Something went wrong. Please try again." };

  const authMode = String(formData.get("auth_mode") ?? "signup") === "signin" ? "signin" : "signup";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!email || !password) return { error: "Enter your email and password." };
  if (authMode === "signup" && password.length < 6) return { error: "Password must be at least 6 characters." };

  const supabase = await createClient();
  let userId: string | null = null;
  let hasSession = false;

  if (authMode === "signin") {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: "We couldn't sign you in. Check your email and password." };
    userId = data.user.id;
    hasSession = true;
  } else {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: "customer" }, emailRedirectTo: `${SITE_URL}/auth/confirm?next=/dashboard` },
    });
    if (error) {
      const dup = /already|registered|exists/i.test(error.message);
      return {
        error: dup
          ? "That email already has an account - switch to \"I already have an account\" to sign in."
          : error.message,
      };
    }
    userId = data.user?.id ?? null;
    hasSession = !!data.session;
  }
  if (!userId) return { error: "Sorry, something went wrong creating your account." };

  const f = await parseRequestForm(formData);
  const admin = createAdminClient();

  const files = formData.getAll("images").filter((x): x is File => x instanceof File && x.size > 0);
  const imagePaths = await uploadRequestImages(admin, files);

  // New signup that hasn't confirmed its email yet -> hold as a draft and let
  // /auth/confirm publish it. Signed-in users (or signups with confirmation off)
  // go live immediately.
  const isDraft = authMode === "signup" && !hasSession;
  const expiresAt = isDraft ? null : new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: req, error: insErr } = await admin
    .from("tattoo_requests")
    .insert({
      customer_id: userId,
      title: f.title,
      note: f.note,
      placement_zone: f.placementId,
      placement_view: f.placementView,
      size_category: f.size,
      location_text: f.loc,
      location_area: f.loc,
      latitude: f.latitude,
      longitude: f.longitude,
      travel_radius_miles: f.travelRadiusMiles,
      status: isDraft ? "draft" : "live",
      expires_at: expiresAt,
      publish_on_verify: isDraft,
      ...(f.targetArtistId ? { target_artist_id: f.targetArtistId } : {}),
    })
    .select("id")
    .single();
  if (insErr || !req) return { error: "Sorry, we couldn't save your request. Please try again." };

  if (imagePaths.length > 0) {
    await admin.from("request_images").insert(
      imagePaths.map((path) => ({ request_id: req.id, storage_path: path, kind: "reference" })),
    );
  }
  await saveRequestDefault(admin, userId, f);

  if (isDraft) {
    redirect("/check-email?pending=1");
  }

  await runMatching(req.id, { targetArtistId: f.targetArtistId, broadcast: f.alsoBroadcast });
  redirect(`/new-request/sent?id=${req.id}`);
}
