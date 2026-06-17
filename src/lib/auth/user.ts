import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Returns the current auth user (or null). */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Returns the current user's profile row (or null if not signed in). */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile | null) ?? null;
}

/** Redirects to /login if not signed in; otherwise returns the profile. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Returns the current user for a mutating action, or redirects. Enforces
 *  account suspension here too: proxy.ts only bounces suspended users on
 *  navigation, so server actions must re-check or a suspended user could keep
 *  posting/quoting/reviewing until their token expires. */
export async function requireActiveUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  const suspended = (user.app_metadata as Record<string, unknown> | undefined)?.suspended === true;
  if (suspended) {
    redirect("/login?error=" + encodeURIComponent("This account has been suspended. Please contact support."));
  }
  return user;
}
