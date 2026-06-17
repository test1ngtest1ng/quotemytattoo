/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppHeader } from "@/components/AppHeader";
import { Chat } from "@/components/chat/Chat";
import { sendQuote, passLead, unpassLead } from "@/lib/data/leads";
import { artistUnmarkBooked } from "@/lib/data/connections";
import { markConversationsRead } from "@/lib/data/messages";
import { SubmitButton } from "@/components/SubmitButton";
import { MarkBookedButton } from "@/components/artist/MarkBookedButton";
import { publicArea } from "@/lib/geo";
import { zoneLabel } from "@/lib/wizard";
import { SIZE_OPTIONS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Lead",
  robots: { index: false, follow: false },
};

const input =
  "w-full rounded-[10px] border border-line px-4 py-3 outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/20";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/artist/leads/${id}`);

  const { data: artist } = await supabase
    .from("artists")
    .select("id, profile_complete")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!artist) redirect("/artist/onboarding");

  // Read via admin (scoped to this artist's match) so booked leads stay
  // accessible - RLS otherwise only exposes 'live' requests to artists.
  const admin = createAdminClient();
  const { data: match } = await admin
    .from("request_matches")
    .select("id, status")
    .eq("request_id", id)
    .eq("artist_id", artist.id)
    .maybeSingle();
  if (!match) redirect("/artist/leads");
  const passed = match.status === "declined";

  const { data: req } = await admin
    .from("tattoo_requests")
    .select("id, title, note, style, size_category, placement_zone, location_area, status, removed, booked_artist_id")
    .eq("id", id)
    .maybeSingle();
  if (!req || req.removed) redirect("/artist/leads");

  // reference images (sign via admin - private bucket)
  const { data: imgs } = await admin
    .from("request_images")
    .select("storage_path")
    .eq("request_id", id);
  const signed: string[] = [];
  for (const im of imgs ?? []) {
    const { data } = await admin.storage
      .from("request-images")
      .createSignedUrl(im.storage_path, 3600);
    if (data?.signedUrl) signed.push(data.signedUrl);
  }

  const { data: existingQuote } = await supabase
    .from("quotes")
    .select("price_estimate, price_note, message, status")
    .eq("request_id", id)
    .eq("artist_id", artist.id)
    .maybeSingle();

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, messages(id, sender_id, body, created_at, image_url)")
    .eq("request_id", id)
    .eq("artist_id", artist.id)
    .maybeSingle();

  // Opening the lead = reading the customer's messages here.
  if (convo?.id) await markConversationsRead([convo.id], user.id);

  const messages = (convo?.messages ?? []).sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      a.created_at.localeCompare(b.created_at),
  );
  const sizeLabel = SIZE_OPTIONS.find((s) => s.value === req.size_category)?.label;

  // Reveal the customer's contact once they've shared it with THIS artist (a connection).
  let customer: { name: string | null; phone: string | null; email: string | null } | null = null;
  const { data: conn } = await admin
    .from("connections")
    .select("id")
    .eq("request_id", id)
    .eq("artist_id", artist.id)
    .maybeSingle();
  if (conn) {
    const { data: c } = await admin
      .from("tattoo_requests")
      .select("profiles!tattoo_requests_customer_id_fkey(name, phone, email)")
      .eq("id", id)
      .maybeSingle();
    const p = c?.profiles as { name?: string; phone?: string; email?: string } | null;
    if (p) customer = { name: p.name ?? null, phone: p.phone ?? null, email: p.email ?? null };
  }

  return (
    <div className="min-h-screen bg-[#faf8fc]">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/artist/leads" className="text-sm font-semibold text-violet">← All leads</Link>
        <h1 className="mt-3 text-2xl font-extrabold text-plum">{req.title}</h1>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
          {req.style && <span>{req.style}</span>}
          {sizeLabel && <span>{sizeLabel}</span>}
          {zoneLabel(req.placement_zone) && <span>{zoneLabel(req.placement_zone)}</span>}
          {publicArea(req.location_area) && <span>{publicArea(req.location_area)}</span>}
        </div>
        {req.note && <p className="mt-4 rounded-[10px] bg-white p-4 text-ink">{req.note}</p>}

        {customer && (
          <section className="mt-4 rounded-[14px] border border-trust/40 bg-trust/5 p-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-trust">Customer shared their contact</h2>
            <div className="mt-2 grid gap-1.5 text-sm">
              {customer.name && <div><span className="text-muted">Name:</span> <span className="font-semibold text-ink">{customer.name}</span></div>}
              {customer.phone && <div><span className="text-muted">Phone:</span> <a href={`tel:${customer.phone}`} className="font-semibold text-violet">{customer.phone}</a></div>}
              {customer.email && <div><span className="text-muted">Email:</span> <a href={`mailto:${customer.email}`} className="font-semibold text-violet">{customer.email}</a></div>}
              {!customer.phone && !customer.email && <div className="text-muted">No contact details on file - reach them in the chat below.</div>}
            </div>
          </section>
        )}

        {/* Booking (Phase 2): once the customer has accepted, the artist can mark the job booked. */}
        {req.booked_artist_id === artist.id ? (
          <section className="mt-4 rounded-[14px] border border-trust/40 bg-trust/5 p-5">
            <p className="font-extrabold text-trust">★ You&apos;re booked for this job</p>
            <p className="mt-1 text-sm text-muted">The customer&apos;s request is closed and marked as yours. They can leave you a verified review.</p>
            <form action={artistUnmarkBooked} className="mt-3">
              <input type="hidden" name="request_id" value={req.id} />
              <SubmitButton className="rounded-[10px] border border-line bg-white px-5 py-2.5 font-semibold text-ink transition hover:border-violet hover:text-violet" pendingText="Undoing…">Undo booking</SubmitButton>
            </form>
          </section>
        ) : conn && req.status === "live" ? (
          <section className="mt-4 rounded-[14px] border border-line bg-white p-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-plum">Agreed the booking?</h2>
            <p className="mt-1 text-sm text-muted">If you&apos;ve settled this job in the chat, mark it as booked. It closes the customer&apos;s request and unlocks a verified review.</p>
            <div className="mt-3"><MarkBookedButton requestId={req.id} /></div>
          </section>
        ) : null}

        {signed.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {signed.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt="Reference" className="h-28 w-28 rounded-lg border border-line object-cover" />
              </a>
            ))}
          </div>
        )}

        {/* Quote */}
        <section className="mt-8 rounded-[14px] border border-line bg-white p-6">
          <h2 className="text-lg font-extrabold text-plum">
            {existingQuote ? "Update Your Quote" : "Send a Quote"}
          </h2>
          {!artist.profile_complete ? (
            <p className="mt-2 text-sm text-muted">
              <Link href="/artist/onboarding" className="font-semibold text-violet">Complete your profile</Link>{" "}
              to respond to leads.
            </p>
          ) : (
            <form action={sendQuote} className="mt-4 space-y-4">
              <input type="hidden" name="request_id" value={req.id} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">Estimate from (£)</label>
                  <input name="price_estimate" type="text" inputMode="numeric" defaultValue={existingQuote?.price_estimate ?? ""} placeholder="e.g. 220" className={input + " mt-1.5"} />
                </div>
                <div>
                  <label className="text-sm font-semibold">Price note</label>
                  <input name="price_note" type="text" defaultValue={existingQuote?.price_note ?? ""} placeholder="e.g. one session" className={input + " mt-1.5"} />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold">Message to the customer</label>
                <textarea name="message" required defaultValue={existingQuote?.message ?? ""} placeholder="Introduce yourself and ask anything you need." className={input + " mt-1.5 min-h-[90px]"} />
              </div>
              <SubmitButton
                className="rounded-[10px] bg-violet px-6 py-3 font-semibold text-white shadow-[0_2px_0_var(--color-violet-dark)] transition hover:bg-violet-dark"
                pendingText="Sending…"
              >
                {existingQuote ? "Update quote" : "Send quote"}
              </SubmitButton>
            </form>
          )}
        </section>

        {/* Chat */}
        {convo && (
          <section className="mt-6 scroll-mt-24" id="chat">
            <h2 className="mb-2 text-lg font-extrabold text-plum">Chat With the Customer</h2>
            <Chat conversationId={convo.id} currentUserId={user.id} initialMessages={messages} />
          </section>
        )}

        {/* Pass / un-pass this lead */}
        {passed ? (
          <section className="mt-8 rounded-[14px] border border-line bg-[#faf8fc] p-5">
            <p className="text-sm text-muted">You passed on this lead, so it&apos;s hidden from your active leads.</p>
            <form action={unpassLead} className="mt-2">
              <input type="hidden" name="request_id" value={req.id} />
              <SubmitButton className="rounded-[10px] border border-line bg-white px-5 py-2.5 font-semibold text-ink transition hover:border-violet hover:text-violet" pendingText="…">Bring it back</SubmitButton>
            </form>
          </section>
        ) : !existingQuote && !conn && req.booked_artist_id !== artist.id ? (
          <div className="mt-8 text-center">
            <form action={passLead}>
              <input type="hidden" name="request_id" value={req.id} />
              <button type="submit" className="text-sm font-semibold text-muted underline underline-offset-2 transition hover:text-ink">Not the right fit? Pass on this lead</button>
            </form>
          </div>
        ) : null}
      </main>
    </div>
  );
}
