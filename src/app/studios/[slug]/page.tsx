import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth/user";
import { publicLocation } from "@/lib/geo";

import { SITE_URL as SITE } from "@/lib/site";
const AV_COLORS = ["#6A2E96", "#311A41", "#00855A", "#57247B"];
const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "S";

const Star = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z" />
  </svg>
);

type StudioRow = {
  id: string;
  name: string | null;
  slug: string | null;
  bio: string | null;
  location_area: string | null;
  location_postcode: string | null;
  featured_until: string | null;
  created_at: string | null;
};
type ArtistRow = {
  display_name: string | null;
  business_name: string | null;
  slug: string | null;
  styles: string[] | null;
  rating: number | null;
  review_count: number | null;
};

async function getStudio(slug: string) {
  const admin = createAdminClient();
  const { data: studio } = await admin
    .from("studios")
    .select("id, name, slug, bio, location_area, location_postcode, featured_until, created_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!studio) return null;
  const { data: artists } = await admin
    .from("artists")
    .select("display_name, business_name, slug, styles, rating, review_count")
    .eq("studio_id", (studio as StudioRow).id)
    .eq("profile_complete", true)
    .order("rating", { ascending: false });
  return { studio: studio as StudioRow, artists: (artists ?? []) as ArtistRow[] };
}

export async function generateStaticParams() {
  const admin = createAdminClient();
  const { data } = await admin.from("studios").select("slug").not("slug", "is", null);
  return (data ?? []).map((s) => ({ slug: s.slug as string }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const res = await getStudio(slug);
  if (!res) return {};
  const loc = publicLocation(res.studio.location_area, res.studio.location_postcode);
  const title = `${res.studio.name} - Tattoo Studio${loc ? ` in ${loc.split(",")[0]}` : ""}`;
  return {
    title,
    description:
      res.studio.bio?.trim().slice(0, 155) ||
      `${res.studio.name} tattoo studio${loc ? ` in ${loc.split(",")[0]}` : ""}. Meet the artists, view their work and request a free quote on Quote My Tattoo.`,
    alternates: { canonical: `/studios/${slug}` },
  };
}

export default async function StudioProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [res, user] = [await getStudio(slug), await getUser()];
  if (!res) notFound();
  const { studio, artists } = res;

  const loc = publicLocation(studio.location_area, studio.location_postcode);
  const town = loc?.split(",")[0]?.trim();
  const color = AV_COLORS[(studio.name?.charCodeAt(0) ?? 0) % AV_COLORS.length];
  const featured = !!studio.featured_until && new Date(studio.featured_until).getTime() > Date.now();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TattooParlor",
    name: studio.name,
    url: `${SITE}/studios/${slug}`,
    ...(studio.bio ? { description: studio.bio.slice(0, 300) } : {}),
    ...(town ? { address: { "@type": "PostalAddress", addressLocality: town, addressCountry: "GB" } } : {}),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Find artists", item: `${SITE}/artists` },
      { "@type": "ListItem", position: 3, name: studio.name, item: `${SITE}/studios/${slug}` },
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
            { href: "/new-request", label: "Request a quote", cta: true },
          ]} />
        </div>
      </header>

      <main className="ap-main">
        <div className="ap-wrap">
          <nav className="ap-crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link><span>/</span>
            <Link href="/artists">Directory</Link><span>/</span>
            <span style={{ color: "var(--text)" }}>{studio.name}</span>
          </nav>

          <div className="ap-head">
            <span className="ap-av" style={{ background: color }}>{initials(studio.name ?? "Studio")}</span>
            <div className="ap-id">
              <h1 className="ap-biz">{studio.name}</h1>
              <div className="ap-meta">
                <span className="ap-person" style={{ margin: 0 }}>Tattoo studio</span>
                {loc && (
                  <span className="ap-loc">
                    <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.6" /></svg>
                    {loc}
                  </span>
                )}
                {featured && (
                  <span className="acard-featured" style={{ position: "static" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z" /></svg>
                    Featured
                  </span>
                )}
              </div>
            </div>
            <div className="ap-cta">
              <Link className="btn" href="/new-request">Request a Quote</Link>
              <span className="note">Free, no obligation</span>
            </div>
          </div>

          {studio.bio && (
            <section className="ap-section">
              <h2>About {studio.name}</h2>
              <p className="ap-bio">{studio.bio}</p>
            </section>
          )}

          <section className="ap-section">
            <h2>Artists at this studio{artists.length ? ` (${artists.length})` : ""}</h2>
            {artists.length === 0 ? (
              <p className="ap-empty">No artists listed here yet.</p>
            ) : (
              <div className="artists">
                {artists.map((a, i) => {
                  const name = a.display_name ?? "Tattoo artist";
                  const heading = a.business_name || name;
                  return (
                    <article className="acard" key={a.slug ?? i}>
                      <div className="acard-top">
                        <div className="av" style={{ background: AV_COLORS[i % AV_COLORS.length] }}>{initials(heading)}</div>
                        <div>
                          <h3>{heading}</h3>
                          {a.business_name && <p className="studio">{name}</p>}
                          <div className="rate">
                            <span className="stars">{Array.from({ length: 5 }).map((_, k) => <Star key={k} />)}</span>{" "}
                            {(a.rating ?? 0) > 0 ? (a.rating ?? 0).toFixed(1) : "New"}{" "}
                            <span className="ct">({a.review_count ?? 0} review{a.review_count === 1 ? "" : "s"})</span>
                          </div>
                        </div>
                      </div>
                      {(a.styles?.length ?? 0) > 0 && (
                        <div className="tags">{a.styles!.slice(0, 3).map((t) => <span className="tag" key={t}>{t}</span>)}</div>
                      )}
                      <div className="foot">
                        {a.slug && <Link className="btn-ghost" href={`/artists/${a.slug}`}>View Profile</Link>}
                        <Link className="btn" href="/new-request">Get in Touch</Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section className="ap-bottom">
          <div className="inner">
            <h2>Want a tattoo from {studio.name}?</h2>
            <p>Post your idea and get a free quote from {studio.name}{town ? ` and other artists in ${town}` : ""}.</p>
            <Link className="btn" href="/new-request">Request a Quote</Link>
          </div>
        </section>
      </main>

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
