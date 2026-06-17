import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { ArtistOnboarding } from "@/components/artist/ArtistOnboarding";

export const metadata: Metadata = {
  title: "Set Up Your Artist Profile",
  robots: { index: false, follow: false },
};

export default async function ArtistOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signup?role=artist&next=/artist/onboarding");

  const { data: artist } = await supabase
    .from("artists")
    .select("profile_complete")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (artist?.profile_complete) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex h-[64px] max-w-xl items-center justify-between px-4">
          <Logo />
          <Link href="/dashboard" className="text-sm font-semibold text-muted hover:text-ink">
            Save &amp; exit
          </Link>
        </div>
      </header>
      <main className="px-4 py-10">
        <ArtistOnboarding defaultName={profile?.name ?? ""} />
      </main>
    </div>
  );
}
