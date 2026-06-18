import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PublicNav } from "@/components/PublicNav";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth/user";
import { getSavedArtistIds } from "@/lib/data/saved";
import { SaveArtistButton } from "@/components/artists/SaveArtistButton";
import { ReportButton } from "@/components/ReportButton";
import { businessName } from "@/lib/identity";
import { publicLocation } from "@/lib/geo";
import { ProfileGallery } from "@/components/artists/ProfileGallery";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { lastActiveLabel } from "@/lib/format";

import { SITE_URL as SITE } from "@/lib/site";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const AV_COLORS = ["#6A2E96", "#311A41", "#00855A", "#57247B"];

const portfolioUrl = (path: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/portfolio/${path}`;
const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "A";
const reviewWhen = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

const Star = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z" />
  </svg>
);

type ProfileRow = {
  id: string;
  display_name: string | null;
  business_name: string | null;
  verification_status: string | null;
  slug: string | null;
  bio: string | null;
  styles: string[] | null;
  rating: number | null;
  review_count: number | null;
  location_area: string | null;
  location_postcode: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  insured: boolean | null;
  licensed: boolean | null;
  hygiene_certified: boolean | null;
  first_aid: boolean | null;
  created_at: string | null;
  studios: { name?: string; slug?: string; location_area?: string; location_postcode?: string } | null;
  portfolio_images: { storage_path: string; position: number }[] | null;
  reviews: { id: string; rating: number; title: string | null; body: string | null; created_at: string; hidden: boolean | null; artist_reply: string | null; request: { booked_artist_id: string | null } | { booked_artist_id: string | null }[] | null }[] | null;
};

const SELECT =
  "id, display_name, business_name, slug, bio, styles, rating, review_count, location_area, location_postcode, instagram_url, tiktok_url, insured, licensed, hygiene_certified, first_aid, verification_status, created_at, studios!artists_studio_id_fkey(name, slug, location_area, location_postcode), portfolio_images(storage_path, position), reviews(id, rating, title, body, created_at, hidden, artist_reply, request:tattoo_requests!reviews_request_id_fkey(booked_artist_id))";

// Cached per slug for 5 minutes. The artist profile is public, read-heavy and
// rarely changes, so we skip the DB on repeat views. Profile edits appear within
// the revalidate window. Uses the cookieless admin client (required: a cached
// function must not read request cookies).
const getArtist = unstable_cache(
  async (slug: string): Promise<ProfileRow | null> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("artists")
      .select(SELECT)
      .eq("slug", slug)
      .eq("profile_complete", true)
      .maybeSingle();
    return (data as unknown as ProfileRow) ?? null;
  },
  ["artist-profile-by-slug"],
  { revalidate: 300, tags: ["artists"] },
);

export async function generateStaticParams() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("artists")
    .select("slug")
    .eq("profile_complete", true)
    .not("slug", "is", null);
  return (data ?? []).map((a) => ({ slug: a.slug as string }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArtist(slug);
  if (!a) return {};
  const heading =
    businessName({ studioName: a.studios?.name, businessName: a.business_name }) ??
    a.display_name ??
    "Tattoo artist";
  const loc = publicLocation(
    a.studios?.location_area ?? a.location_area,
    a.studios?.location_postcode ?? a.location_postcode,
  );
  const styleStr = (a.styles ?? []).slice(0, 3).join(", ");
  const title = `${heading} - Tattoo Artist${loc ? ` in ${loc.split(",")[0]}` : ""}`;
  const description =
    (a.bio?.trim().slice(0, 155) ||
      `View ${heading}'s tattoo portfolio${styleStr ? ` (${styleStr})` : ""}${loc ? ` in ${loc.split(",")[0]}` : ""}, read reviews and request a free quote on Quote My Tattoo.`).trim();
  const image = a.portfolio_images?.[0] ? portfolioUrl(a.portfolio_images[0].storage_path) : undefined;
  return {
    title,
    description,
    alternates: { canonical: `/artists/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE}/artists/${slug}`,
      type: "profile",
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function ArtistProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [a, user] = [await getArtist(slug), await getUser()];
  if (!a) notFound();
  const saved = user ? (await getSavedArtistIds()).includes(a.id) : false;

  // Responsiveness signal. Fetched separately + tolerantly (pre-0021 = no badge).
  const { data: la } = await createAdminClient()
    .from("artists")
    .select("last_active")
    .eq("id", a.id)
    .maybeSingle();
  const activeLabel = lastActiveLabel((la as { last_active?: string | null } | null)?.last_active ?? null);

  const name = a.display_name ?? "Tattoo artist";
  const business = businessName({ studioName: a.studios?.name, businessName: a.business_name });
  const heading = business ?? name;
  const loc = publicLocation(
    a.studios?.location_area ?? a.location_area,
    a.studios?.location_postcode ?? a.location_postcode,
  );
  const color = AV_COLORS[(heading.charCodeAt(0) || 0) % AV_COLORS.length];
  const styles = a.styles ?? [];
  const rating = a.rating ?? 0;
  const reviewCount = a.review_count ?? 0;
  const memberSince = a.created_at ? new Date(a.created_at).getFullYear() : null;
  const portfolio = (a.portfolio_images ?? [])
    .slice()
    .sort((x, y) => x.position - y.position)
    .map((p) => portfolioUrl(p.storage_path));
  const reviews = (a.reviews ?? [])
    .filter((r) => !r.hidden) // moderated-out reviews aren't shown publicly
    .slice()
    .sort((x, y) => y.created_at.localeCompare(x.created_at));

  // Review photos. Fetched separately + tolerantly (pre-0022 = no photos).
  const reviewImages = new Map<string, string[]>();
  if (reviews.length) {
    const { data: ri } = await createAdminClient()
      .from("reviews")
      .select("id, image_urls")
      .in("id", reviews.map((r) => r.id));
    for (const row of ri ?? []) {
      const urls = (row as { image_urls?: string[] | null }).image_urls ?? [];
      if (urls?.length) reviewImages.set(row.id as string, urls);
    }
  }

  const badges = [
    a.licensed && "Licensed / council-registered",
    a.insured && "Public liability insurance",
    a.hygiene_certified && "Hygiene certified",
    a.first_aid && "First-aid trained",
  ].filter(Boolean) as string[];

  // JSON-LD: a tattoo business with reviews (locality only - no street address public).
  const town = loc?.split(",")[0]?.trim();
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TattooParlor",
    name: heading,
    url: `${SITE}/artists/${slug}`,
    ...(portfolio[0] ? { image: portfolio[0] } : {}),
    ...(a.bio ? { description: a.bio.slice(0, 300) } : {}),
    ...(town ? { address: { "@type": "PostalAddress", addressLocality: town, addressCountry: "GB" } } : {}),
    ...(reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.toFixed(1),
            reviewCount,
          },
          review: reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            ...(r.title ? { name: r.title } : {}),
            ...(r.body ? { reviewBody: r.body } : {}),
            datePublished: r.created_at.slice(0, 10),
          })),
        }
      : {}),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Find artists", item: `${SITE}/tattoo-artists` },
      { "@type": "ListItem", position: 3, name: heading, item: `${SITE}/artists/${slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <header className="hdr">
        <div className="wrap">
          <Link className="logo" href="/">
            <span className="mk"><svg width="22" height="28" viewBox="0 0 100 130" aria-hidden="true"><path d="M50 6 C50 6 86 62 86 88 A36 36 0 1 1 14 88 C14 62 50 6 50 6 Z" /></svg></span>
            <span>quotemytattoo<i>.co.uk</i></span>
          </Link>
          <PublicNav links={[
            { href: "/artists", label: "Directory" },
            { href: "/new-request", label: "Request a quote" },
            { href: user ? "/dashboard" : "/login", label: user ? "Dashboard" : "Log in" },
            { href: "/signup?role=artist", label: "Sign up as an artist", cta: true },
          ]} />
        </div>
      </header>

      <main className="ap-main">
        <div className="ap-wrap">
          <nav className="ap-crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link><span>/</span>
            <Link href="/artists">Directory</Link><span>/</span>
            <span style={{ color: "var(--text)" }}>{heading}</span>
          </nav>

          <div className="ap-head">
            <span className="ap-av" style={{ background: color }}>{initials(heading)}</span>
            <div className="ap-id">
              <h1 className="ap-biz">{heading}</h1>
              {business && <p className="ap-person">{name}</p>}
              <div className="ap-meta">
                {a.verification_status === "verified" && <VerifiedBadge />}
                <span className="ap-rate">
                  <span className="ap-stars">{Array.from({ length: 5 }).map((_, k) => <Star key={k} size={15} />)}</span>{" "}
                  {reviewCount > 0 ? <><b>{rating.toFixed(1)}</b> <span className="ct">({reviewCount} review{reviewCount === 1 ? "" : "s"})</span></> : <span className="ct">New artist</span>}
                </span>
                {loc && (
                  <span className="ap-loc">
                    <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.6" /></svg>
                    {loc}
                  </span>
                )}
                {activeLabel && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: "#00855A" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1FB46A" }} />
                    {activeLabel}
                  </span>
                )}
                {memberSince && <span className="ct" style={{ color: "var(--muted)", fontWeight: 600 }}>Member since {memberSince}</span>}
                {a.studios?.slug && (
                  <Link href={`/studios/${a.studios.slug}`} style={{ color: "var(--violet)", fontWeight: 700, textDecoration: "none" }}>View studio →</Link>
                )}
              </div>
              {styles.length > 0 && (
                <div className="ap-tags">
                  {styles.map((s, i) => <span key={s} className={`ap-tag${i === 0 ? " primary" : ""}`}>{s}</span>)}
                </div>
              )}
              {badges.length > 0 && (
                <div className="ap-badges">
                  {badges.map((b) => (
                    <span key={b} className="ap-badge">
                      <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="ap-cta">
              <Link className="btn" href={`/new-request?artist=${a.id}`}>Request a Quote</Link>
              <SaveArtistButton artistId={a.id} initialSaved={saved} isLoggedIn={!!user} next={`/artists/${a.slug ?? slug}`} variant="labelled" />
              <span className="note">Free, no obligation</span>
            </div>
          </div>

          {a.bio && (
            <section className="ap-section">
              <h2>About {name}</h2>
              <p className="ap-bio">{a.bio}</p>
              {(a.instagram_url || a.tiktok_url) && (
                <div className="ap-socials">
                  {a.instagram_url && <a className="ap-soc" href={a.instagram_url} target="_blank" rel="noreferrer nofollow">Instagram</a>}
                  {a.tiktok_url && <a className="ap-soc" href={a.tiktok_url} target="_blank" rel="noreferrer nofollow">TikTok</a>}
                </div>
              )}
            </section>
          )}

          <section className="ap-section">
            <h2>Portfolio</h2>
            <ProfileGallery images={portfolio} />
          </section>

          <section className="ap-section">
            <h2>Reviews{reviewCount > 0 ? ` (${reviewCount})` : ""}</h2>
            {reviews.length === 0 ? (
              <p className="ap-empty">No reviews yet - be the first to book {name}.</p>
            ) : (
              <div className="ap-reviews">
                {reviews.map((r) => {
                  const rr = (Array.isArray(r.request) ? r.request[0] : r.request) as { booked_artist_id?: string | null } | null;
                  const verified = !!rr?.booked_artist_id && rr.booked_artist_id === a.id;
                  return (
                    <div className="ap-rev" key={r.id}>
                      <div className="rh">
                        <span className="ap-stars">{Array.from({ length: r.rating }).map((_, k) => <Star key={k} size={14} />)}</span>
                        <span className="when">{reviewWhen(r.created_at)}</span>
                        {verified
                          ? <span style={{ color: "var(--trust)", fontWeight: 800, fontSize: 12 }}>✓ Verified booking</span>
                          : <span style={{ color: "var(--muted)", fontSize: 12 }}>after enquiry</span>}
                        <ReportButton targetType="review" targetId={r.id} isLoggedIn={!!user} label="Report" />
                      </div>
                      {r.title && <h4>{r.title}</h4>}
                      {r.body && <p>{r.body}</p>}
                      {(reviewImages.get(r.id) ?? []).length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                          {reviewImages.get(r.id)!.slice(0, 4).map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer">
                              <Image src={url} alt="Customer tattoo photo" width={88} height={88} style={{ objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} />
                            </a>
                          ))}
                        </div>
                      )}
                      {r.artist_reply && (
                        <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--wash)", borderRadius: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--violet)" }}>Response from {heading}</div>
                          <p style={{ margin: "4px 0 0" }}>{r.artist_reply}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          <p style={{ marginTop: 22 }}>
            <ReportButton targetType="artist" targetId={a.id} isLoggedIn={!!user} label="Report this artist" />
          </p>
          {badges.length > 0 && (
            <p style={{ marginTop: 18, fontSize: 12.5, fontStyle: "italic", color: "var(--muted)", lineHeight: 1.5, maxWidth: "70ch" }}>
              * Credentials shown (licensing, insurance, hygiene, first aid) are self-declared by the artist and have not been independently verified by Quote My Tattoo. Please confirm these directly with the artist before booking.
            </p>
          )}
        </div>

        <section className="ap-bottom">
          <div className="inner">
            <h2>Want a tattoo like this?</h2>
            <p>Post your idea and get a free quote from {heading}{loc ? ` and other artists in ${loc.split(",")[0]}` : ""}.</p>
            <Link className="btn" href={`/new-request?artist=${a.id}`}>Request a Quote</Link>
          </div>
        </section>
      </main>

      <footer className="bigfoot">
        <div className="wrap">
          <Link className="flogo" href="/">
            <span className="mk"><svg width="22" height="28" viewBox="0 0 100 130" aria-hidden="true"><path d="M50 6 C50 6 86 62 86 88 A36 36 0 1 1 14 88 C14 62 50 6 50 6 Z" /></svg></span>
            <span>quotemytattoo<i>.co.uk</i></span>
          </Link>
          <div className="bf-cols">
            <div><h5>For Customers</h5><ul><li><Link href="/new-request">Request a Quote</Link></li><li><Link href="/#how-it-works">How It Works</Link></li><li><Link href="/artists">Directory</Link></li></ul></div>
            <div><h5>For Artists</h5><ul><li><Link href="/for-artists">Join as an Artist</Link></li><li><Link href="/signup?role=studio">Register Your Studio</Link></li></ul></div>
            <div><h5>Company</h5><ul><li><Link href="/about">About Us</Link></li><li><Link href="/careers">Careers</Link></li></ul></div>
            <div><h5>Helpful Resources</h5><ul><li><Link href="/tattoo-artists">Cities</Link></li><li><Link href="/guides/how-much-does-a-tattoo-cost-uk">Pricing Guides</Link></li></ul></div>
          </div>
          <div className="bf-bar">
            <span><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookie Policy</Link><Link href="/terms">Terms and Conditions</Link></span>
            <span>© 2026 Quote My Tattoo Ltd</span>
          </div>
        </div>
      </footer>
    </>
  );
}
