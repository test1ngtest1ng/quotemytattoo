import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { computeRange, zoneLabel } from "@/lib/wizard";
import { SIZE_OPTIONS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Request sent",
  robots: { index: false, follow: false },
};

export default async function SentPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (!id) redirect("/dashboard");

  const supabase = await createClient();
  const { data: req } = await supabase
    .from("tattoo_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (!req) redirect("/dashboard");

  const { count } = await supabase
    .from("request_matches")
    .select("*", { count: "exact", head: true })
    .eq("request_id", id);

  const matched = count ?? 0;
  const range = computeRange(req.size_category, req.placement_zone);
  const sizeLabel = SIZE_OPTIONS.find((s) => s.value === req.size_category)?.label;
  const placement = zoneLabel(req.placement_zone);

  return (
    <div className="min-h-screen bg-[#faf8fc]">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-[64px] max-w-xl items-center px-4">
          <Logo />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-12 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-trust text-2xl text-white">
          ✓
        </div>
        <h1 className="text-3xl font-extrabold text-plum">Your request is live 🎉</h1>
        <p className="mt-2 text-muted">
          {matched > 0
            ? `We've notified ${matched} matching artist${matched > 1 ? "s" : ""} near ${req.location_area ?? "you"}.`
            : "It's posted, but we couldn't find a matching artist in your area just yet - widening your search distance can reach more artists."}{" "}
          You&apos;ll get quotes by email and in your dashboard as artists respond.
        </p>

        {range && (
          <div className="mt-8 rounded-[14px] border border-line bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-violet">
              Typical price for a piece like yours
            </p>
            <p className="mt-1 text-3xl font-extrabold text-plum">
              £{range.lo} - £{range.hi}
            </p>
            <p className="mt-2 text-sm text-muted">
              Rough guide for a {sizeLabel?.toLowerCase()} piece
              {placement ? `, ${placement.toLowerCase()}` : ""}. Each artist sets their own
              price once they&apos;ve seen your design.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="rounded-[10px] bg-violet px-6 py-3 font-semibold text-white shadow-[0_2px_0_var(--color-violet-dark)] transition hover:bg-violet-dark"
          >
            Go to my dashboard
          </Link>
          <Link
            href="/new-request"
            className="rounded-[10px] border-2 border-violet bg-white px-6 py-3 font-semibold text-violet transition hover:bg-violet hover:text-white"
          >
            Post another idea
          </Link>
        </div>
      </main>
    </div>
  );
}
