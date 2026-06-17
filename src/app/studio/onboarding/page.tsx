import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { StudioLocationFields } from "@/components/studio/StudioLocationFields";
import { createStudio } from "@/lib/data/studio";

export const metadata: Metadata = {
  title: "Register Your Studio",
  robots: { index: false, follow: false },
};

const input =
  "w-full rounded-[10px] border border-line px-4 py-3 outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/20";

export default async function StudioOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signup?role=studio&next=/studio/onboarding");

  const { data: studio } = await supabase
    .from("studios")
    .select("id")
    .eq("owner_profile_id", user.id)
    .maybeSingle();
  if (studio) redirect("/studio");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();
  const ownerName = profile?.name ?? "";

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex h-[64px] max-w-xl items-center justify-between px-4">
          <Logo />
          <Link href="/dashboard" className="text-sm font-semibold text-muted hover:text-ink">Save &amp; exit</Link>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-[14px] border border-violet/30 bg-violet/5 p-4 text-center text-sm font-semibold text-violet">
          Free during launch · Founding Studios lock in 50% off for life
        </div>
        <h1 className="mt-6 text-2xl font-extrabold text-plum">Register Your Studio</h1>
        <p className="mt-2 text-muted">Set up your studio, then invite your artists to join.</p>

        <form action={createStudio} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold">Studio name</label>
            <input name="name" required className={input + " mt-1.5"} placeholder="e.g. Iron & Ink" />
          </div>
          <div>
            <label className="text-sm font-semibold">Your name <span className="font-normal text-muted">(owner / manager)</span></label>
            <input name="owner_name" required defaultValue={ownerName} className={input + " mt-1.5"} placeholder="e.g. Sam Carter" />
          </div>
          <StudioLocationFields />
          <div>
            <label className="text-sm font-semibold">About the studio <span className="font-normal text-muted">(optional)</span></label>
            <textarea name="bio" className={input + " mt-1.5 min-h-[90px]"} placeholder="Tell customers about your studio." />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-line p-4">
            <input type="checkbox" name="also_artist" className="mt-0.5 h-5 w-5 accent-violet" />
            <span>
              <span className="font-semibold text-ink">I&apos;m also a tattoo artist taking bookings here</span>
              <span className="mt-0.5 block text-sm text-muted">We&apos;ll set up your own artist profile under the studio next, so you can receive leads. You can add more artists anytime.</span>
            </span>
          </label>
          <SubmitButton pendingText="Creating…">Create studio</SubmitButton>
        </form>
      </main>
    </div>
  );
}
