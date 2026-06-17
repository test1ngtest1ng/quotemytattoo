import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { notFound } from "next/navigation";
import { CITIES, getCity, otherCities, cityFaqs } from "@/lib/cities";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/user";
import { TATTOO_STYLES } from "@/lib/constants";
import { styleSlug } from "@/lib/styles";
import { businessName } from "@/lib/identity";
import { publicLocation } from "@/lib/geo";

import { SITE_URL as SITE } from "@/lib/site";
const AV_COLORS = ["#6A2E96", "#311A41", "#00855A", "#57247B"];

const Star = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z" />
  </svg>
);

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const c = getCity(city);
  if (!c) return {};
  const title = `Tattoo Artists in ${c.name} | Get Free Quotes`;
  const description = `Find and compare licensed tattoo artists in ${c.name}. Upload your design and get free quotes from top-rated studios across ${c.areas.slice(0, 4).join(", ")} and beyond.`;
  return {
    title,
    description,
    alternates: { canonical: `/tattoo-artists/${c.slug}` },
    openGraph: { title, description, url: `${SITE}/tattoo-artists/${c.slug}`, type: "website" },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const c = getCity(city);
  if (!c) notFound();

  const [user, supabase] = [await getUser(), await createClient()];
  const { data: allArtists } = await supabase
    .from("artists")
    .select("display_name, business_name, slug, bio, styles, rating, review_count, location_area, location_postcode, featured_until, studios!artists_studio_id_fkey(name, location_area, location_postcode)")
    .eq("profile_complete", true)
    .ilike("location_area", `%${c.name}%`)
    .order("rating", { ascending: false })
    .limit(60);

  // Featured artists (paid placement) take the top slots, then everyone else.
  // When more are featured than fit, rotate daily so all get fair exposure.
  const nowMs = Date.now();
  const isFeatured = (a: { featured_until?: string | null }) =>
    !!a.featured_until && new Date(a.featured_until).getTime() > nowMs;
  const pool = allArtists ?? [];
  const featured = pool.filter(isFeatured);
  const rest = pool.filter((a) => !isFeatured(a));
  const daySeed = Math.floor(nowMs / 86_400_000) % (featured.length || 1);
  const rotatedFeatured = featured.length
    ? [...featured.slice(daySeed), ...featured.slice(0, daySeed)]
    : featured;
  const artists = [...rotatedFeatured, ...rest].slice(0, 6);

  const faqs = cityFaqs(c.name);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Cities", item: `${SITE}/tattoo-artists` },
      { "@type": "ListItem", position: 3, name: c.name, item: `${SITE}/tattoo-artists/${c.slug}` },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <div className="announce">
        Are you a tattoo artist in {c.name} looking for customers?{" "}
        <Link href="/signup?role=artist">Join for free</Link>
      </div>

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

      {/* hero */}
      <section className="hero">
        <div className="wrap">
          <div className="crumb">
            <Link href="/">Home</Link><span>/</span>
            <Link href="/tattoo-artists">Cities</Link><span>/</span>{c.name}
          </div>
          <h1>Find tattoo artists in {c.name}</h1>
          <p>
            Looking for a tattoo artist in {c.name}? Upload your design and get free, no-obligation
            quotes from licensed artists and studios across the city, from {c.areas.slice(0, 3).join(", ")}{" "}
            and beyond. Compare portfolios, reviews and prices, then choose who you want to book with.
          </p>
          <div className="cta-row">
            <Link className="btn" href="/new-request">Request a Quote</Link>
            <div className="trust">
              <span className="lab">Free to use</span>
              <span className="tiles">
                {[0, 1, 2, 3].map((i) => <span className="tile" key={i}><Star size={13} /></span>)}
                <span className="tile half"><Star size={13} /></span>
              </span>
              <span className="tp">Verified UK artists</span>
            </div>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="section">
        <div className="wrap">
          <h2>How to book a tattoo artist in {c.name}</h2>
          <p className="lead">Getting matched with the right {c.name} artist takes three simple steps, and it is completely free to post.</p>
          <div className="steps">
            <div className="step"><div className="n">1</div><h3>Upload your design</h3><p>Tell us what you want tattooed and where on your body. Add a reference image or describe your idea. It is free and takes a minute.</p></div>
            <div className="step"><div className="n">2</div><h3>Artists respond with quotes</h3><p>Available {c.name} artists who suit your style send you quotes and availability. No phone tag, no chasing.</p></div>
            <div className="step"><div className="n">3</div><h3>Review and choose</h3><p>Browse portfolios, healed work and reviews, then book the artist you trust most. You stay in control the whole way.</p></div>
          </div>
        </div>
      </section>

      {/* popular styles */}
      <section className="section alt">
        <div className="wrap">
          <h2>Popular tattoo styles in {c.name}</h2>
          <p className="lead">{c.name} studios cover every style. Browse by the look you want and we will match you with specialists.</p>
          <div className="chips">
            {TATTOO_STYLES.map((s) => (
              <Link className="chip" href={`/tattoo-artists/${c.slug}/${styleSlug(s)}`} key={s}>{s} {c.name}</Link>
            ))}
          </div>
        </div>
      </section>

      {/* top artists */}
      <section className="section">
        <div className="wrap">
          <h2>Top-rated tattoo artists in {c.name}</h2>
          <p className="lead">Upload your design to get quotes from licensed artists taking bookings across {c.name} right now.</p>

          {artists && artists.length > 0 ? (
            <div className="artists">
              {artists.map((a, i) => {
                const st = a.studios as { name?: string; location_area?: string; location_postcode?: string } | null;
                const studio = st?.name;
                const name = a.display_name ?? "Tattoo artist";
                const business = businessName({ studioName: studio, businessName: a.business_name });
                const heading = business ?? name;
                // Public location: town + outward postcode only (studio's if linked).
                const loc = publicLocation(
                  st?.location_area ?? a.location_area,
                  st?.location_postcode ?? a.location_postcode,
                );
                const subline = [business ? name : null, loc].filter(Boolean).join(" · ");
                return (
                  <article className="acard" key={a.slug ?? i}>
                    {isFeatured(a) && (
                      <span className="acard-featured">
                        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z" /></svg>
                        Featured
                      </span>
                    )}
                    <div className="acard-top">
                      <div className="av" style={{ background: AV_COLORS[i % AV_COLORS.length] }}>{initials(heading)}</div>
                      <div>
                        <h3>{heading}</h3>
                        {subline && <p className="studio">{subline}</p>}
                        <div className="rate">
                          <span className="stars">{Array.from({ length: 5 }).map((_, k) => <Star key={k} />)}</span>{" "}
                          {a.rating > 0 ? a.rating.toFixed(1) : "New"}{" "}
                          <span className="ct">({a.review_count} review{a.review_count === 1 ? "" : "s"})</span>
                        </div>
                      </div>
                    </div>
                    {a.styles?.length > 0 && (
                      <div className="tags">{a.styles.slice(0, 3).map((t: string) => <span className="tag" key={t}>{t}</span>)}</div>
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
          ) : (
            <div className="step" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
              <h3>Be the first {c.name} artist here</h3>
              <p>We&rsquo;re matching new {c.name} artists with customers every week. Post your design and we&rsquo;ll notify local artists as they join - or, if you&rsquo;re an artist, claim your free Founding Member spot.</p>
              <div className="foot" style={{ justifyContent: "center", marginTop: 18 }}>
                <Link className="btn" href="/new-request">Request a Quote</Link>
                <Link className="btn-ghost" href="/signup?role=artist">Join as an Artist</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* why book */}
      <section className="section alt">
        <div className="wrap">
          <h2>Why book a {c.name} tattoo artist with us</h2>
          <p className="lead">We make it easy to find an artist you can trust, with the checks that matter for getting tattooed safely.</p>
          <div className="tstrip">
            <div className="ti"><h3>Licensed and registered</h3><p>Artists declare council registration and hygiene standards on their profile, shown as badges, so you book with confidence.</p></div>
            <div className="ti"><h3>Real reviews and portfolios</h3><p>See healed work and reviews from real customers before you decide who to book in {c.name}.</p></div>
            <div className="ti"><h3>Free, no-obligation quotes</h3><p>Upload your idea once and compare quotes from multiple {c.name} artists. There is no fee and no pressure to book.</p></div>
          </div>
        </div>
      </section>

      {/* areas */}
      <section className="section">
        <div className="wrap">
          <h2>Areas we cover across {c.name}</h2>
          <p className="lead">Find tattoo artists in your part of {c.name}, from central studios to the suburbs.</p>
          <div className="area-grid">
            {c.areas.map((area) => <Link href="/new-request" key={area}>{area}</Link>)}
          </div>
        </div>
      </section>

      {/* faq */}
      <section className="section alt">
        <div className="wrap">
          <h2>Tattoo artists in {c.name}: FAQs</h2>
          <div className="faq">
            {faqs.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}</summary>
                <div className="ans">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="ctaband">
        <div className="wrap">
          <h2>Ready to find your tattoo artist in {c.name}?</h2>
          <Link className="btn" href="/new-request">Request a Quote</Link>
        </div>
      </section>

      {/* footer */}
      <footer className="bigfoot">
        <div className="wrap">
          <Link className="flogo" href="/">
            <span className="mk"><svg width="22" height="28" viewBox="0 0 100 130" aria-hidden="true"><path d="M50 6 C50 6 86 62 86 88 A36 36 0 1 1 14 88 C14 62 50 6 50 6 Z" /></svg></span>
            <span>quotemytattoo<i>.co.uk</i></span>
          </Link>
          <div className="bf-cols">
            <div><h5>For Customers</h5><ul><li><Link href="/new-request">Request a Quote</Link></li><li><Link href="/#how-it-works">How It Works</Link></li><li><Link href="/artists">Directory</Link></li><li><Link href="/quality-standards">Licensing Checks</Link></li><li><Link href="/help">Customer Help</Link></li></ul></div>
            <div><h5>For Artists</h5><ul><li><Link href="/signup?role=artist">Join as an Artist</Link></li><li><Link href="/quality-standards">Quality standards</Link></li><li><Link href="/reviews-policy">Reviews policy</Link></li><li><Link href="/help">Artist help</Link></li></ul></div>
            <div><h5>Company</h5><ul><li><Link href="/about">About Us</Link></li><li><Link href="/press">Press &amp; media</Link></li><li><Link href="/careers">Careers</Link></li><li><Link href="/for-artists">Become a partner</Link></li></ul></div>
            <div><h5>Helpful Resources</h5><ul><li><Link href="/artists">Tattoo styles</Link></li><li><Link href="/tattoo-artists">Cities</Link></li><li><Link href="/guides/how-much-does-a-tattoo-cost-uk">Pricing Guides</Link></li><li><Link href="/guides/how-long-does-a-tattoo-take-to-heal">Aftercare guides</Link></li></ul></div>
          </div>
          <div className="bf-bar">
            <span><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookie Policy</Link><Link href="/terms">Terms and Conditions</Link></span>
            <span>© 2026 Quote My Tattoo Ltd</span>
          </div>
        </div>
      </footer>

      {/* other cities */}
      <section className="seoband">
        <div className="wrap">
          <h2>Find tattoo artists in other cities</h2>
          <div className="links">
            {otherCities(c.slug).map((o) => (
              <Link key={o.slug} href={`/tattoo-artists/${o.slug}`}>{o.name}</Link>
            ))}
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </>
  );
}
