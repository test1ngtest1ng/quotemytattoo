"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** The artist ids the signed-in user has saved (empty if logged out). */
export async function getSavedArtistIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("saved_artists")
    .select("artist_id")
    .eq("customer_id", user.id);
  return (data ?? []).map((r) => r.artist_id as string);
}

/** Toggle a saved artist for the signed-in user; returns the new saved state. */
export async function toggleSavedArtist(artistId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: existing } = await supabase
    .from("saved_artists")
    .select("artist_id")
    .eq("customer_id", user.id)
    .eq("artist_id", artistId)
    .maybeSingle();

  if (existing) {
    await supabase.from("saved_artists").delete().eq("customer_id", user.id).eq("artist_id", artistId);
  } else {
    await supabase.from("saved_artists").insert({ customer_id: user.id, artist_id: artistId });
  }
  revalidatePath("/saved");
  revalidatePath("/artists");
  return !existing;
}
