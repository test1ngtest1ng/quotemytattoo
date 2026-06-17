import "@/styles/account-detail.css";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicLocation } from "@/lib/geo";
import { zoneLabel } from "@/lib/wizard";
import { SIZE_OPTIONS } from "@/lib/constants";
import { titleCase } from "@/lib/format";
import { AppHeader } from "@/components/AppHeader";
import { RequestDetailView, type DetailArtist, type Msg } from "@/components/requests/RequestDetailView";
import { markConversationsRead } from "@/lib/data/messages";

export const metadata: Metadata = {
  title: "Your Request",
  robots: { index: false, follow: false },
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const AV_COLORS = ["#6A2E96", "#311A41", "#00855A", "#57247B"];
const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const portfolioUrl = (path: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/portfolio/${path}`;
const reviewWhen = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/requests/${id}`);

  const { data: req } = await supabase
    .from("tattoo_requests")
    .select("id, title, status, customer_id, note, style, size_category, placement_zone, location_area, created_at, booked_artist_id, closed_reason")
    .eq("id", id)
    .maybeSingle();
  if (!req || req.customer_id !== user.id) redirect("/my-requests");

  // Who marked it booked (separate query so the page still renders if migration
  // 0019 hasn't run yet - the column is then simply absent).
  let bookedBy: string | null = null;
  {
    const { data: bb } = await supabase.from("tattoo_requests").select("booked_by").eq("id", id).maybeSingle();
    bookedBy = (bb?.booked_by as string | null) ?? null;
  }

  // The customer's own reference images (private bucket → signed URLs).
  const { data: imgRows } = await supabase
    .from("request_images")
    .select("storage_path")
    .eq("request_id", id);
  const referenceImages: string[] = [];
  for (const im of imgRows ?? []) {
    const { data: signed } = await supabase.storage
      .from("request-images")
      .createSignedUrl(im.storage_path, 3600);
    if (signed?.signedUrl) referenceImages.push(signed.signedUrl);
  }

  const requestSummary = {
    note: req.note ?? null,
    style: req.style ?? null,
    size: SIZE_OPTIONS.find((s) => s.value === req.size_category)?.label ?? null,
    placement: zoneLabel(req.placement_zone) ?? null,
    location: req.location_area ?? null,
    posted: req.created_at
      ? new Date(req.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : null,
  };

  const { data: quotes } = await supabase
    .from("quotes")
    .select(
      "id, price_estimate, price_note, status, artist_id, artists!quotes_artist_id_fkey(id, display_name, business_name, slug, rating, review_count, styles, bio, location_area, location_postcode, instagram_url, tiktok_url, insured, licensed, hygiene_certified, first_aid, created_at, studios!artists_studio_id_fkey(name, location_area, location_postcode), portfolio_images(storage_path, position), reviews(rating, title, body, created_at, hidden))",
    )
    .eq("request_id", id);

  const { data: convos } = await supabase
    .from("conversations")
    .select("id, artist_id, messages(id, sender_id, body, created_at, image_url)")
    .eq("request_id", id);

  // Viewing the request = reading any artist replies on it.
  if (convos && convos.length > 0) {
    await markConversationsRead(
      convos.map((c) => c.id as string),
      user.id,
    );
  }

  // Connections = artists whose contact has been shared on this request. Reveal
  // each connected artist's full address + contact (admin: cross-user read).
  const { data: connections } = await supabase
    .from("connections")
    .select("artist_id")
    .eq("request_id", id);
  const connectedIds = (connections ?? []).map((c) => c.artist_id as string);
  const revealedByArtist = new Map<string, NonNullable<DetailArtist["revealed"]>>();
  if (connectedIds.length > 0) {
    const admin = createAdminClient();
    const { data: revRows } = await admin
      .from("artists")
      .select(
        "id, address_line, location_area, location_postcode, studios!artists_studio_id_fkey(address_line, location_area, location_postcode), profiles!artists_profile_id_fkey(phone, email)",
      )
      .in("id", connectedIds);
    for (const ba of revRows ?? []) {
      const st = ba.studios as { address_line?: string; location_area?: string; location_postcode?: string } | null;
      const prof = ba.profiles as { phone?: string; email?: string } | null;
      revealedByArtist.set(ba.id as string, {
        address: st?.address_line ?? (ba.address_line as string) ?? null,
        area: st?.location_area ?? (ba.location_area as string) ?? null,
        postcode: st?.location_postcode ?? (ba.location_postcode as string) ?? null,
        phone: prof?.phone ?? null,
        email: prof?.email ?? null,
      });
    }
  }

  // Which artists the customer has reviewed already.
  const { data: reviewRows } = await supabase
    .from("reviews")
    .select("artist_id")
    .eq("request_id", id)
    .eq("customer_id", user.id);
  const reviewedIds = new Set((reviewRows ?? []).map((r) => r.artist_id as string));

  // Which artists the customer has actually messaged (gates the review form).
  const messagedIds = new Set(
    (convos ?? [])
      .filter((c) => ((c.messages as Msg[]) ?? []).some((m) => m.sender_id === user.id))
      .map((c) => c.artist_id as string),
  );

  const convoByArtist = new Map(
    (convos ?? []).map((c) => [
      c.artist_id,
      {
        id: c.id as string,
        messages: ([...((c.messages as Msg[]) ?? [])] as Msg[]).sort((a, b) =>
          a.created_at.localeCompare(b.created_at),
        ),
      },
    ]),
  );

  const artists: DetailArtist[] = (quotes ?? []).map((q, i) => {
    const a = q.artists as unknown as Record<string, unknown>;
    const studio = a.studios as { name?: string; location_area?: string; location_postcode?: string } | null;
    const convo = convoByArtist.get(q.artist_id);
    const name = (a.display_name as string) ?? "Tattoo artist";
    const pics = ((a.portfolio_images as { storage_path: string; position: number }[]) ?? [])
      .sort((x, y) => x.position - y.position)
      .map((p) => portfolioUrl(p.storage_path));
    const revs = ((a.reviews as { rating: number; title: string | null; body: string | null; created_at: string; hidden: boolean | null }[]) ?? [])
      .filter((r) => !r.hidden)
      .map((r) => ({ rating: r.rating, title: r.title, body: r.body, when: reviewWhen(r.created_at) }));
    return {
      id: q.artist_id,
      name,
      businessName: (a.business_name as string) ?? null,
      slug: (a.slug as string) ?? null,
      initials: initials(name),
      color: AV_COLORS[i % AV_COLORS.length],
      rating: (a.rating as number) ?? 0,
      reviewCount: (a.review_count as number) ?? 0,
      styles: (a.styles as string[]) ?? [],
      bio: (a.bio as string) ?? null,
      studioName: studio?.name ?? null,
      location: publicLocation(
        studio?.location_area ?? (a.location_area as string | null),
        studio?.location_postcode ?? (a.location_postcode as string | null),
      ),
      instagram: (a.instagram_url as string) ?? null,
      tiktok: (a.tiktok_url as string) ?? null,
      badges: {
        insured: !!a.insured,
        licensed: !!a.licensed,
        hygiene: !!a.hygiene_certified,
        firstAid: !!a.first_aid,
      },
      memberSince: a.created_at ? new Date(a.created_at as string).getFullYear().toString() : null,
      portfolio: pics,
      reviews: revs,
      quotePrice: (q.price_estimate as number) ?? null,
      quoteNote: (q.price_note as string) ?? null,
      quoteId: q.id as string,
      quoteStatus: (q.status as string) ?? "pending",
      conversationId: convo?.id ?? null,
      messages: convo?.messages ?? [],
      revealed: revealedByArtist.get(q.artist_id) ?? null,
      canReview: messagedIds.has(q.artist_id),
      hasReviewed: reviewedIds.has(q.artist_id),
    };
  });

  return (
    <>
      <AppHeader />
      <main className="page">
        <div className="wrap">
          <Link className="back" href="/my-requests">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
            My requests
          </Link>
          <h1 className="title">Quotes for your request: {titleCase(req.title)}</h1>
          <RequestDetailView
            requestId={req.id}
            requestTitle={req.title ?? "Tattoo request"}
            requestStatus={req.status}
            currentUserId={user.id}
            artists={artists}
            bookedArtistId={req.booked_artist_id ?? null}
            bookedBy={bookedBy}
            requestSummary={requestSummary}
            referenceImages={referenceImages}
          />
        </div>
      </main>
    </>
  );
}
