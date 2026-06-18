import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { notFound } from "next/navigation";
import { CITIES, getCity } from "@/lib/cities";
import { STYLES, getStyle } from "@/lib/styles";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth/user";
import { businessName } from "@/lib/identity";
import { publicLocation } from "@/lib/geo";

import { SITE_URL as SITE } from "@/lib/site";
const AV_COLORS = ["#6A2E96", "#311A41", "#00855A", "#57247B"];

const Star = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z" />
  </svg>
);
const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "A";

export function generateStaticParams() {
  return CITIES.flatMap((c) => STYLES.map((s) => ({ city: c.slug, style: s.slug })));
}

// Cached per (style, city) for 5 minutes. Public, slow-changing list - skip the
// DB on repeat views. Cookieless admin client (cached fns can't read cookies).
const getStyleCityArtists = unstable_cache(
  async (styleName: string, cityName: string) => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("artists")
      .select("display_name, business_name, slug, bio, styles, rating, review_count, location_area, location_postcode, featured_until, studios!artists_studio_id_fkey(name, location_area, location_postcode)")
      .eq("profile_complete", true)
      .contains("styles", [styleName])
      .ilike("location_area", `%${cityName}%`)
      .order("rating", { ascending: false })
      .limit(30);
    return data ?? [];
  },
  ["style-city-artists"],
  { revalidate: 300, tags: ["artists"] },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; style: string }>;
}): Promise<Metadata> {
  const { city, style } = await params;
  const c = getCity(city);
  const s = getStyle(style);
  if (!c || !s) return {};
  const title = `${s.name} Tattoo Artists in ${c.name} | Get Free Quotes`;
  const description = `Find and compare ${s.name.toLowerCase()} tattoo artists in ${c.name}. View portfolios and reviews, then get free quotes from specialists near you.`;

  // Thin-page guard: a combo with no matching artists is a near-empty doorway
  // page. Keep it crawlable (follow) but out of the index until it has artists.
  // Reuses the cached list so metadata + page share one DB read.
  const count = (await getStyleCityArtists(s.name, c.name)).length;

  return {
    title,
    description,
    alternates: { canonical: `/tattoo-artists/${c.slug}/${s.slug}` },
    openGraph: { title, description, url: `${SITE}/tattoo-artists/${c.slug}/${s.slug}`, type: "website" },
    ...(count === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CityStylePage({
  params,
}: {
  params: Promise<{ city: string; style: string }>;
}) {
  const { city, style } = await params;
  const c = getCity(city);
  const s = getStyle(style);
  if (!c || !s) notFound();

  const [user, all] = [await getUser(), await getStyleCityArtists(s.name, c.name)];

  const nowMs = Date.now();
  const isFeatured = (a: { featured_until?: string | null }) =>
    !!a.featured_until && new Date(a.featured_until).getTime() > nowMs;
  const pool = all ?? [];
  const featured = pool.filter(isFeatured);
  const rest = pool.filter((a) => !isFeatured(a));
  const artists = [...featured, ...rest];

  const faqs = [
    { q: `How much does a ${s.name.toLowerCase()} tattoo cost in ${c.name}?`, a: `Prices depend on size, detail and the artist. Post your idea to get free quotes from ${s.name.toLowerCase()} specialists in ${c.name} and compare.` },
    { q: `How do I find a good ${s.name.toLowerCase()} artist in ${c.name}?`, a: `Look for an artist whose portfolio is full of ${s.name.toLowerCase()} work, read their reviews, and check the studio is licensed. You can compare matched artists on Quote My Tattoo.` },
    { q: `Is ${s.name.toLowerCase()} a good choice for a first tattoo?`, a: `It can be - discuss placement and sizing with your artist. Bolder work tends to age best; your artist will advise on what suits your idea.` },
  ];
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Cities", item: `${SITE}/tattoo-artists` },
      { "@type": "ListItem", position: 3, name: c.name, item: `${SITE}/tattoo-artists/${c.slug}` },
      { "@type": "ListItem", position: 4, name: s.name, item: `${SITE}/tattoo-artists/${c.slug}/${s.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
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

      <section className="hero">
        <div className="wrap">
          <div className="crumb">
            <Link href="/">Home</Link><span>/</span>
            <Link href="/tattoo-artists">Cities</Link><span>/</span>
            <Link href={`/tattoo-artists/${c.slug}`}>{c.name}</Link><span>/</span>{s.name}
          </div>
          <h1>{s.name} tattoo artists in {c.name}</h1>
          <p>
            Looking for {s.name.toLowerCase()} tattoo work in {c.name}? Compare {s.name.toLowerCase()}{" "}
            specialists, view portfolios and reviews, and get free quotes - post your idea once and let the
            right artists come to you.
          </p>
          <div className="cta-row">
            <Link className="btn" href="/new-request">Request a Quote</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="hero-ph" style={{ aspectRatio: "16/5", borderRadius: 14, background: "linear-gradient(135deg,#F2EAF8,#E4F5EE)", display: "grid", placeItems: "center", color: "#6b6475", fontWeight: 600, fontSize: 13, textAlign: "center", padding: 16, marginBottom: 36 }}>
            Image: example of {s.name.toLowerCase()} tattoo work in {c.name}
          </div>

          <h2 style={{ textAlign: "left" }}>{s.name} specialists in {c.name}</h2>
          {artists.length === 0 ? (
            <p className="lead" style={{ textAlign: "left" }}>
              We&apos;re still adding {s.name.toLowerCase()} artists in {c.name}.{" "}
              <Link href="/new-request" style={{ color: "var(--violet)", fontWeight: 700 }}>Post your idea</Link>{" "}
              and we&apos;ll match you with specialists as they join - or{" "}
              <Link href={`/tattoo-artists/${c.slug}`} style={{ color: "var(--violet)", fontWeight: 700 }}>see all {c.name} artists</Link>.
            </p>
          ) : (
            <div className="artists">
              {artists.map((a, i) => {
                const st = a.studios as { name?: string; location_area?: string; location_postcode?: string } | null;
                const name = a.display_name ?? "Tattoo artist";
                const business = businessName({ studioName: st?.name, businessName: a.business_name });
                const heading = business ?? name;
                const loc = publicLocation(st?.location_area ?? a.location_area, st?.location_postcode ?? a.location_postcode);
                const subline = [business ? name : null, loc].filter(Boolean).join(" · ");
                return (
                  <article className="acard" key={a.slug ?? i}>
                    {isFeatured(a) && (
                      <span className="acard-featured"><svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z" /></svg>Featured</span>
                    )}
                    <div className="acard-top">
                      <div className="av" style={{ background: AV_COLORS[i % AV_COLORS.length] }}>{initials(heading)}</div>
                      <div>
                        <h3>{heading}</h3>
                        {subline && <p className="studio">{subline}</p>}
                        <div className="rate">
                          <span className="stars">{Array.from({ length: 5 }).map((_, k) => <Star key={k} />)}</span>{" "}
                          {(a.rating ?? 0) > 0 ? (a.rating ?? 0).toFixed(1) : "New"}{" "}
                          <span className="ct">({a.review_count ?? 0} review{a.review_count === 1 ? "" : "s"})</span>
                        </div>
                      </div>
                    </div>
                    {(a.styles?.length ?? 0) > 0 && (
                      <div className="tags">{a.styles!.slice(0, 3).map((t: string) => <span className="tag" key={t}>{t}</span>)}</div>
                    )}
                    {a.bio && <p className="bio">{a.bio}</p>}
                    <div className="foot">
                      {a.slug && <Link className="btn-ghost" href={`/artists/${a.slug}`}>View Profile</Link>}
                      <Link className="btn" href="/new-request">Get in Touch</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <h2>{s.name} tattoos in {c.name}: FAQs</h2>
          <div style={{ maxWidth: 760, margin: "20px auto 0", display: "grid", gap: 18 }}>
            {faqs.map((f, i) => (
              <div key={i}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--plum)", margin: "0 0 6px" }}>{f.q}</h3>
                <p style={{ color: "var(--text)", lineHeight: 1.6, margin: 0 }}>{f.a}</p>
              </div>
            ))}
          </div>
          <div className="center-cta" style={{ textAlign: "center", marginTop: 40 }}>
            <Link className="btn" href="/new-request">Get {s.name.toLowerCase()} quotes in {c.name}</Link>
          </div>
        </div>
      </section>

      <footer className="bigfoot">
        <div className="wrap">
          <Link className="flogo" href="/">
            <span className="mk"><svg width="22" height="28" viewBox="0 0 100 130" aria-hidden="true"><path d="M50 6 C50 6 86 62 86 88 A36 36 0 1 1 14 88 C14 62 50 6 50 6 Z" /></svg></span>
            <span>quotemytattoo<i>.co.uk</i></span>
          </Link>
          <div className="bf-bar">
            <span><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookie Policy</Link><Link href="/terms">Terms and Conditions</Link></span>
            <span>© 2026 Quote My Tattoo Ltd</span>
          </div>
        </div>
      </footer>
    </>
  );
}
