"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { geocode } from "@/lib/geo";
import { matchOpenRequestsToArtist } from "@/lib/data/matching";
import { MAX_ARTIST_STYLES } from "@/lib/constants";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Builds a unique artist slug, appending -2, -3… on collision. */
async function uniqueSlug(base: string, profileId: string): Promise<string> {
  const admin = createAdminClient();
  const root = base || "artist";
  let slug = root;
  let n = 1;
  // up to a sane number of attempts
  while (n < 50) {
    const { data } = await admin
      .from("artists")
      .select("id, profile_id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data || data.profile_id === profileId) return slug;
    n++;
    slug = `${root}-${n}`;
  }
  return `${root}-${profileId.slice(0, 6)}`;
}

export async function createArtistProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/artist/onboarding");

  const displayName = String(formData.get("display_name") ?? "").trim();
  let styles: string[] = [];
  try {
    styles = (JSON.parse(String(formData.get("styles") ?? "[]")) as string[]).slice(0, MAX_ARTIST_STYLES);
  } catch {
    styles = [];
  }
  if (!displayName || styles.length === 0) {
    redirect("/artist/onboarding?error=Please add your name and at least one style");
  }

  const bio = String(formData.get("bio") ?? "").trim() || null;
  const area = String(formData.get("location_area") ?? "").trim() || null;
  const postcode = String(formData.get("location_postcode") ?? "").trim() || null;
  const addressLine = String(formData.get("address_line") ?? "").trim() || null;
  const travelAreas = String(formData.get("travel_areas") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const instagram = String(formData.get("instagram_url") ?? "").trim() || null;
  const tiktok = String(formData.get("tiktok_url") ?? "").trim() || null;
  const businessName = String(formData.get("business_name") ?? "").trim() || null;
  const flag = (k: string) => formData.get(k) === "true";

  const slug = await uniqueSlug(slugify(displayName), user.id);

  // Geocode the studio location (postcode preferred, else town) for distance
  // matching. Fails soft - matching falls back to area names if this is null.
  const point = await geocode(postcode || area || "");

  // If this user owns a studio, auto-link their artist listing to it.
  const { data: ownedStudio } = await supabase
    .from("studios")
    .select("id")
    .eq("owner_profile_id", user.id)
    .maybeSingle();

  // Was this artist already discoverable? Drives the one-time lead backfill below
  // so profile *edits* don't re-trigger it.
  const { data: prevArtist } = await supabase
    .from("artists")
    .select("profile_complete")
    .eq("profile_id", user.id)
    .maybeSingle();
  const wasComplete = !!prevArtist?.profile_complete;

  const { data: artist, error } = await supabase
    .from("artists")
    .upsert(
      {
        profile_id: user.id,
        display_name: displayName,
        business_name: businessName,
        slug,
        bio,
        ...(ownedStudio ? { studio_id: ownedStudio.id } : {}),
        primary_style: styles[0] ?? null,
        styles,
        location_area: area,
        location_postcode: postcode,
        address_line: addressLine,
        latitude: point?.lat ?? null,
        longitude: point?.lng ?? null,
        travel_areas: travelAreas,
        instagram_url: instagram,
        tiktok_url: tiktok,
        insured: flag("insured"),
        licensed: flag("licensed"),
        hygiene_certified: flag("hygiene_certified"),
        first_aid: flag("first_aid"),
        profile_complete: true,
      },
      { onConflict: "profile_id" },
    )
    .select("id")
    .single();

  if (error || !artist) {
    throw new Error(`Could not save profile: ${error?.message ?? "unknown"}`);
  }

  // keep the account name in sync with the public display name
  await supabase.from("profiles").update({ name: displayName }).eq("id", user.id);

  // if they own the studio, record them as a member too
  if (ownedStudio) {
    await supabase
      .from("studio_members")
      .upsert(
        { studio_id: ownedStudio.id, artist_id: artist.id, role: "owner" },
        { onConflict: "studio_id,artist_id" },
      );
  }

  // Portfolio images (up to 10) → public portfolio bucket
  const files = formData
    .getAll("portfolio")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, 10);

  let position = 0;
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${artist.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("portfolio")
      .upload(path, file, { contentType: file.type || undefined });
    if (!upErr) {
      await supabase
        .from("portfolio_images")
        .insert({ artist_id: artist.id, storage_path: path, position: position++ });
    } else {
      console.warn(`portfolio upload failed: ${upErr.message}`);
    }
  }

  // First time this artist becomes discoverable: surface the open requests they
  // match but missed (posted before they joined). Only on the transition to
  // complete, never on later edits. Fails soft - must not block onboarding.
  if (!wasComplete) {
    try {
      await matchOpenRequestsToArtist(artist.id);
    } catch (e) {
      console.warn("backfill match failed", e);
    }
  }

  updateTag("artists"); // bust cached public directory/profile pages
  redirect("/dashboard");
}
