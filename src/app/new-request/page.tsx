import type { Metadata } from "next";
import Link from "next/link";
import { getProfile } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { RequestWizard } from "@/components/wizard/RequestWizard";

export const metadata: Metadata = {
  title: "Post your tattoo idea",
  robots: { index: false, follow: false },
};

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ artist?: string; error?: string }>;
}) {
  // Guests can fill the whole wizard; they create an account / sign in at the
  // final step (handled in RequestWizard + submitGuestRequest).
  const profile = await getProfile();
  const loggedIn = !!profile;
  const supabase = await createClient();
  const sp = await searchParams;

  // Targeted request: requesting a quote from a specific artist (?artist=<id>).
  let targetArtist: { id: string; name: string } | null = null;
  if (sp.artist) {
    const { data: ta } = await supabase
      .from("artists")
      .select("id, display_name, business_name")
      .eq("id", sp.artist)
      .eq("profile_complete", true)
      .maybeSingle();
    if (ta) targetArtist = { id: ta.id as string, name: (ta.business_name as string) || (ta.display_name as string) || "this artist" };
  }

  // Pre-fill location + radius from the user's saved request defaults (logged-in only).
  let defaultLoc = "";
  let defaultCoords: { lat: number; lng: number } | null = null;
  let defaultRadius = 15;
  if (profile) {
    const { data: defaults } = await supabase
      .from("profiles")
      .select("request_postcode, request_area, request_lat, request_lng, request_radius")
      .eq("id", profile.id)
      .maybeSingle();
    defaultLoc = defaults?.request_area || defaults?.request_postcode || "";
    defaultCoords =
      typeof defaults?.request_lat === "number" && typeof defaults?.request_lng === "number"
        ? { lat: defaults.request_lat, lng: defaults.request_lng }
        : null;
    defaultRadius = defaults?.request_radius ?? 15;
  }

  const backHref = !profile ? "/" : profile.role === "customer" ? "/dashboard" : "/";

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex h-[64px] max-w-xl items-center justify-between px-4">
          <Logo />
          <Link href="/dashboard" className="text-sm font-semibold text-muted hover:text-ink">
            Exit
          </Link>
        </div>
      </header>
      <main className="px-4 py-10">
        {sp.error && (
          <div className="mx-auto mb-6 max-w-xl rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {sp.error}
          </div>
        )}
        <RequestWizard
          backHref={backHref}
          loggedIn={loggedIn}
          defaultLoc={defaultLoc}
          defaultRadius={defaultRadius}
          defaultCoords={defaultCoords}
          targetArtist={targetArtist}
        />
      </main>
    </div>
  );
}
