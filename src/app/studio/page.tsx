import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { signOut } from "@/lib/auth/actions";
import { inviteArtist } from "@/lib/data/studio";

export const metadata: Metadata = {
  title: "Your Studio",
  robots: { index: false, follow: false },
};

const input =
  "flex-1 rounded-[10px] border border-line px-4 py-3 outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/20";

export default async function StudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/studio");

  const { data: studio } = await supabase
    .from("studios")
    .select("id, name, location_area, is_founding_member, founding_number")
    .eq("owner_profile_id", user.id)
    .maybeSingle();
  if (!studio) redirect("/studio/onboarding");

  const { data: members } = await supabase
    .from("studio_members")
    .select("artist_id, role, artists!studio_members_artist_id_fkey(display_name, location_area)")
    .eq("studio_id", studio.id);

  const { data: invites } = await supabase
    .from("studio_invites")
    .select("email, status, created_at")
    .eq("studio_id", studio.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#faf8fc]">
      <header className="flex items-center justify-between border-b border-line bg-white px-6 py-4">
        <Logo />
        <form action={signOut}>
          <button className="rounded-[10px] border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-violet hover:text-violet">Log out</button>
        </form>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-extrabold text-plum">{studio.name}</h1>
        <p className="mt-1 text-muted">
          {studio.location_area ?? "Studio"} ·{" "}
          {studio.is_founding_member ? (
            <span className="font-semibold text-violet">Founding Studio #{studio.founding_number}</span>
          ) : (
            "Studio"
          )}
        </p>

        {/* Invite artists */}
        <section className="mt-8 rounded-[14px] border border-line bg-white p-6">
          <h2 className="text-lg font-extrabold text-plum">Invite Your Artists</h2>
          <p className="mt-1 text-sm text-muted">They&rsquo;ll get an email to join your studio. They can accept once they&rsquo;ve set up their artist profile.</p>
          <form action={inviteArtist} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input name="email" type="email" required placeholder="artist@email.com" className={input} />
            <SubmitButton pendingText="Sending…">Send invite</SubmitButton>
          </form>
        </section>

        {/* Members */}
        <section className="mt-6 rounded-[14px] border border-line bg-white p-6">
          <h2 className="text-lg font-extrabold text-plum">Artists in Your Studio</h2>
          {members && members.length > 0 ? (
            <ul className="mt-3 divide-y divide-line">
              {members.map((m) => {
                const a = m.artists as { display_name?: string; location_area?: string } | null;
                return (
                  <li key={m.artist_id} className="flex items-center justify-between py-3">
                    <span className="font-semibold text-ink">{a?.display_name ?? "Artist"}</span>
                    <span className="text-sm text-muted">{m.role}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No artists have joined yet.</p>
          )}
        </section>

        {/* Pending invites */}
        {invites && invites.length > 0 && (
          <section className="mt-6 rounded-[14px] border border-line bg-white p-6">
            <h2 className="text-lg font-extrabold text-plum">Invites</h2>
            <ul className="mt-3 divide-y divide-line">
              {invites.map((inv, i) => (
                <li key={i} className="flex items-center justify-between py-3">
                  <span className="text-ink">{inv.email}</span>
                  <span className={`text-sm font-semibold ${inv.status === "accepted" ? "text-trust" : "text-muted"}`}>{inv.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-8 text-center text-sm text-muted">
          <Link href="/dashboard" className="font-semibold text-violet">← Back to dashboard</Link>
        </p>
      </main>
    </div>
  );
}
