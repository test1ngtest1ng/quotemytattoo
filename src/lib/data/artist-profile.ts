"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { geocode } from "@/lib/geo";
import { MAX_ARTIST_STYLES } from "@/lib/constants";

async function currentArtist() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!artist) redirect("/artist/onboarding");
  return { supabase, artistId: artist.id as string, userId: user.id };
}

/** Toggle whether the artist is taking new work. When false they're skipped in
 *  matching and receive no new-lead emails. */
export async function setAvailability(formData: FormData) {
  const { supabase, artistId } = await currentArtist();
  const available = String(formData.get("available")) === "true";
  await supabase.from("artists").update({ available }).eq("id", artistId);
  revalidatePath("/dashboard");
  revalidatePath("/artist/profile");
  revalidateTag("artists"); // bust cached public directory/profile pages
  redirect("/dashboard");
}

export async function updateArtist(formData: FormData) {
  const { supabase, artistId, userId } = await currentArtist();

  let styles: string[] = [];
  try {
    styles = (JSON.parse(String(formData.get("styles") ?? "[]")) as string[]).slice(0, MAX_ARTIST_STYLES);
  } catch {
    styles = [];
  }
  const travelAreas = String(formData.get("travel_areas") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const flag = (k: string) => formData.get(k) === "on" || formData.get(k) === "true";

  const update: Record<string, unknown> = {
    display_name: String(formData.get("display_name") ?? "").trim() || null,
    business_name: String(formData.get("business_name") ?? "").trim() || null,
    bio: String(formData.get("bio") ?? "").trim() || null,
    location_area: String(formData.get("location_area") ?? "").trim() || null,
    location_postcode: String(formData.get("location_postcode") ?? "").trim() || null,
    address_line: String(formData.get("address_line") ?? "").trim() || null,
    travel_areas: travelAreas,
    instagram_url: String(formData.get("instagram_url") ?? "").trim() || null,
    tiktok_url: String(formData.get("tiktok_url") ?? "").trim() || null,
    insured: flag("insured"),
    licensed: flag("licensed"),
    hygiene_certified: flag("hygiene_certified"),
    first_aid: flag("first_aid"),
  };
  if (styles.length) {
    update.styles = styles;
    update.primary_style = styles[0];
  }

  // Re-geocode whenever a location is provided (fails soft to null).
  const geoQuery =
    (update.location_postcode as string | null) || (update.location_area as string | null);
  if (geoQuery) {
    const point = await geocode(geoQuery);
    update.latitude = point?.lat ?? null;
    update.longitude = point?.lng ?? null;
  }

  await supabase.from("artists").update(update).eq("id", artistId);

  // keep the account name in sync with the public display name
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (displayName) await supabase.from("profiles").update({ name: displayName }).eq("id", userId);

  revalidatePath("/artist/profile");
  revalidateTag("artists"); // bust cached public directory/profile pages
  redirect("/artist/profile?saved=1");
}

export async function addPortfolioImages(formData: FormData) {
  const { supabase, artistId } = await currentArtist();

  const files = formData
    .getAll("portfolio")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, 10);

  // append after existing
  const { count } = await supabase
    .from("portfolio_images")
    .select("*", { count: "exact", head: true })
    .eq("artist_id", artistId);
  let position = count ?? 0;

  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${artistId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("portfolio")
      .upload(path, file, { contentType: file.type || undefined });
    if (!error) {
      await supabase
        .from("portfolio_images")
        .insert({ artist_id: artistId, storage_path: path, position: position++ });
    }
  }
  revalidatePath("/artist/profile");
  revalidateTag("artists"); // bust cached public directory/profile pages
  redirect("/artist/profile?saved=portfolio");
}

export async function removePortfolioImage(formData: FormData) {
  const { supabase, artistId } = await currentArtist();
  const imageId = String(formData.get("image_id") ?? "");
  const path = String(formData.get("storage_path") ?? "");
  if (!imageId) redirect("/artist/profile");

  await supabase.from("portfolio_images").delete().eq("id", imageId).eq("artist_id", artistId);
  if (path) await supabase.storage.from("portfolio").remove([path]);
  revalidatePath("/artist/profile");
  revalidateTag("artists"); // bust cached public directory/profile pages
  redirect("/artist/profile?saved=portfolio");
}
