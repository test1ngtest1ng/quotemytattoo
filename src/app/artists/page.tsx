import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth/user";
import { businessName } from "@/lib/identity";
import { publicLocation, geocode, haversineMiles } from "@/lib/geo";
import { DirectorySearch } from "@/components/artists/DirectorySearch";
import { SaveArtistButton } from "@/components/artists/SaveArtistButton";
import { getSavedArtistIds } from "@/lib/data/saved";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { lastActiveLabel } from "@/lib/format";

const AV_COLORS = ["#6A2E96", "#311A41", "#00855A", "#57247B"];

const Star = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z" />
  </svg>
);
const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "A";

type ArtistRow = {
  id: string;
  display_name: string | null;
  business_name: string | null;
  slug: string | null;
  bio: string | null;
  styles: string[] | null;
  rating: number | null;
  review_count: number | null;
  location_area: string | null;
  location_postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  featured_until: string | null;
  verification_status: string | null;
  studios: { name?: string; location_area?: string; location_postcode?: string } | null;
};
type StudioRow = {
  name: string | null;
  slug: string | null;
  bio: string | null;
  location_area: string | null;
  location_postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  featured_until: string | null;
  artists: { count: number }[] | null;
};
type Item =
  | { kind: "artist"; featured: boolean; distance: number | null; a: ArtistRow }
  | { kind: "studio"; featured: boolean; distance: number | null; s: StudioRow };

const fmtDistance = (mi: number | null) =>
  mi == null ? "" : mi < 0.1 ? "under 0.1 mi away" : `${mi.toFixed(1)} mi away`;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ style?: string; location?: string; q?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = !!(sp.style || sp.location || sp.q);
  const title = sp.style
    ? `${sp.style} Tattoo Artists${sp.location ? ` in ${sp.location}` : ""} | Quote My Tattoo`
    : "Find a Tattoo Artist or Studio | Browse & Compare UK";
  return {
    title,
    description:
      "Browse and compare tattoo artists and studios across the UK. Filter by style, area and distance, read reviews and portfolios, and request free quotes.",
    alternates: { canonical: "/artists" },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

const nowMs = () => Date.now();
const isFeatured = (x: { featured_until: string | null }) =>
  !!x.featured_until && new Date(x.featured_until).getTime() > nowMs();

export default async function ArtistsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; style?: string; location?: string; radius?: string; sort?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const style = (sp.style ?? "").trim();
  const location = (sp.location ?? "").trim();
  // Name search. Strip PostgREST .or() control chars to avoid filter injection.
  const q = (sp.q ?? "").trim();
  const qSafe = q.replace(/[,()%*]/g, "").trim();
  const radiusChosen = parseInt(sp.radius ?? "", 10) || 0;
  const sort = sp.sort === "reviews" ? "reviews" : sp.sort === "rating" ? "rating" : "closest";
  const type = sp.type === "artists" || sp.type === "studios" ? sp.type : "all";

  const [user, supabase] = [await getUser(), await createClient()];
  const savedIds = new Set(user ? await getSavedArtistIds() : []);
  // Where to send a logged-out user back to after they sign in to save.
  const here = "/artists" + (() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (location) p.set("location", location);
    if (sp.radius) p.set("radius", sp.radius);
    if (style) p.set("style", style);
    if (type !== "all") p.set("type", type);
    if (sort !== "closest") p.set("sort", sort);
    const qs = p.toString();
    return qs ? `?${qs}` : "";
  })();

  // Geocode the typed location once and search by distance - so "London" finds
  // everyone nearby (e.g. Tower Hamlets), not just literal "London".
  // Falls back to area-name matching only if the location can't be geocoded.
  const geo = location ? await geocode(location) : null;
  const matchArea = geo?.area ?? location;
  const useRadius = !!geo;
  const radiusMiles = radiusChosen || 5;

  // ---- Artists ----
  let artistsPool: ArtistRow[] = [];
  if (type !== "studios") {
    let aq = supabase
      .from("artists")
      .select(
        "id, display_name, business_name, slug, bio, styles, rating, review_count, location_area, location_postcode, latitude, longitude, featured_until, verification_status, studios!artists_studio_id_fkey(name, location_area, location_postcode)",
      )
      .eq("profile_complete", true);
    if (style) aq = aq.contains("styles", [style]);
    if (qSafe) aq = aq.or(`display_name.ilike.%${qSafe}%,business_name.ilike.%${qSafe}%`);
    if (location && !useRadius) aq = aq.ilike("location_area", `%${matchArea}%`);
    aq = aq.order(sort === "reviews" ? "review_count" : "rating", { ascending: false }).limit(60);
    const { data } = await aq;
    artistsPool = (data ?? []) as ArtistRow[];
    if (useRadius && geo) {
      artistsPool = artistsPool.filter(
        (a) =>
          typeof a.latitude === "number" &&
          typeof a.longitude === "number" &&
          haversineMiles(geo.lat, geo.lng, a.latitude, a.longitude) <= radiusMiles,
      );
    }
  }

  // ---- Studios (matched by area name; no coordinates to distance-filter) ----
  let studiosPool: StudioRow[] = [];
  if (type !== "artists") {
    const admin = createAdminClient();
    let sq = admin
      .from("studios")
      .select("name, slug, bio, location_area, location_postcode, latitude, longitude, featured_until, artists!artists_studio_id_fkey(count)")
      .not("slug", "is", null);
    if (qSafe) sq = sq.ilike("name", `%${qSafe}%`);
    if (location && !useRadius) sq = sq.ilike("location_area", `%${matchArea}%`);
    const { data } = await sq.limit(60);
    studiosPool = (data ?? []) as StudioRow[];
    if (useRadius && geo) {
      studiosPool = studiosPool.filter(
        (s) =>
          typeof s.latitude === "number" &&
          typeof s.longitude === "number" &&
          haversineMiles(geo.lat, geo.lng, s.latitude, s.longitude) <= radiusMiles,
      );
    }
  }

  // Responsiveness signal per artist. Fetched separately + tolerantly so a
  // pre-0021 schema (no last_active column) just yields no badge, never an error.
  const activeById = new Map<string, string | null>();
  if (artistsPool.length) {
    const admin = createAdminClient();
    const { data: la } = await admin
      .from("artists")
      .select("id, last_active")
      .in("id", artistsPool.map((a) => a.id));
    for (const row of la ?? []) {
      activeById.set(row.id as string, (row as { last_active?: string | null }).last_active ?? null);
    }
  }

  // Distance from the searched location (null if no location or no coords).
  const distOf = (lat: number | null, lng: number | null) =>
    geo && typeof lat === "number" && typeof lng === "number"
      ? haversineMiles(geo.lat, geo.lng, lat, lng)
      : null;

  // ---- Combine: featured first (paid placement), then the rest by chosen sort ----
  const items: Item[] = [
    ...artistsPool.map((a): Item => ({ kind: "artist", featured: isFeatured(a), distance: distOf(a.latitude, a.longitude), a })),
    ...studiosPool.map((s): Item => ({ kind: "studio", featured: isFeatured(s), distance: distOf(s.latitude, s.longitude), s })),
  ];

  const ratingOf = (x: Item) => (x.kind === "artist" ? x.a.rating ?? 0 : 0);
  const reviewsOf = (x: Item) => (x.kind === "artist" ? x.a.review_count ?? 0 : 0);
  const cmp = (x: Item, y: Item) => {
    if (sort === "closest" && geo) return (x.distance ?? Infinity) - (y.distance ?? Infinity);
    if (sort === "reviews") return reviewsOf(y) - reviewsOf(x);
    return ratingOf(y) - ratingOf(x); // top rated (also the fallback when no location)
  };
  // Featured (paid placement) get the top slots, but capped + rotated so that if
  // more than FEATURED_CAP are featured in this area they share the exposure
  // fairly (the cohort shown rotates each hour). Overflow featured drop into the
  // normal pool (still badged, just not boosted).
  const FEATURED_CAP = 6;
  const featuredAll = items.filter((x) => x.featured).sort(cmp);
  const nonFeatured = items.filter((x) => !x.featured).sort(cmp);

  let featuredTop = featuredAll;
  let featuredOverflow: Item[] = [];
  if (featuredAll.length > FEATURED_CAP) {
    const offset = Math.floor(Date.now() / 3_600_000) % featuredAll.length; // rotates hourly
    const rotated = [...featuredAll.slice(offset), ...featuredAll.slice(0, offset)];
    featuredTop = rotated.slice(0, FEATURED_CAP);
    featuredOverflow = rotated.slice(FEATURED_CAP);
  }

  const results = [...featuredTop, ...[...featuredOverflow, ...nonFeatured].sort(cmp)];

  const hasFilters = !!(style || location || qSafe);
  const locLabel = location ? (useRadius ? `within ${radiusMiles} mi of ${location}` : location) : "";

  return (
    <>
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
          <div className="crumb"><Link href="/">Home</Link><span>/</span>Directory</div>
          <h1>Find a tattoo artist or studio</h1>
          <p>Browse and compare tattoo artists and studios across the UK. Filter by style, area and distance, read reviews and portfolios, then request free quotes.</p>
          <DirectorySearch initial={{ q, location, style, radius: sp.radius, sort, type }} />
          {hasFilters && <p className="dir-clear"><Link href="/artists">Clear filters</Link></p>}
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2 style={{ textAlign: "left" }}>
            {results.length} {results.length === 1 ? "result" : "results"}
            {qSafe ? ` · "${qSafe}"` : ""}{style ? ` · ${style}` : ""}{locLabel ? ` · ${locLabel}` : ""}
          </h2>

          {results.length === 0 ? (
            <p className="lead" style={{ textAlign: "left" }}>
              Nothing matches yet. Try a wider distance or area - or{" "}
              <Link href="/new-request" style={{ color: "var(--violet)", fontWeight: 700 }}>post a request</Link> and let artists come to you.
            </p>
          ) : (
            <div className="artists">
              {results.map((it, i) => {
                if (it.kind === "studio") {
                  const s = it.s;
                  const loc = publicLocation(s.location_area, s.location_postcode);
                  const count = s.artists?.[0]?.count ?? 0;
                  return (
                    <article className="acard" key={`s-${s.slug ?? i}`}>
                      {it.featured && (
                        <span className="acard-featured"><svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z" /></svg>Featured</span>
                      )}
                      <div className="acard-top">
                        <div className="av" style={{ background: AV_COLORS[i % AV_COLORS.length] }}>{initials(s.name ?? "S")}</div>
                        <div>
                          <h3>{s.name}</h3>
                          <p className="studio">Studio{loc ? ` · ${loc}` : ""}{it.distance != null ? ` · ${fmtDistance(it.distance)}` : ""}</p>
                          <div className="rate"><span className="ct">{count} {count === 1 ? "artist" : "artists"}</span></div>
                        </div>
                      </div>
                      {s.bio && <p className="bio">{s.bio}</p>}
                      <div className="foot">
                        {s.slug && <Link className="btn-ghost" href={`/studios/${s.slug}`}>View Studio</Link>}
                        <Link className="btn" href="/new-request">Get in Touch</Link>
                      </div>
                    </article>
                  );
                }
                const a = it.a;
                const st = a.studios;
                const name = a.display_name ?? "Tattoo artist";
                const business = businessName({ studioName: st?.name, businessName: a.business_name });
                const heading = business ?? name;
                const loc = publicLocation(st?.location_area ?? a.location_area, st?.location_postcode ?? a.location_postcode);
                const subline = [business ? name : null, loc, it.distance != null ? fmtDistance(it.distance) : null].filter(Boolean).join(" · ");
                return (
                  <article className="acard" key={`a-${a.slug ?? i}`}>
                    {it.featured && (
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
                        {a.verification_status === "verified" && (
                          <div style={{ marginTop: 7 }}><VerifiedBadge /></div>
                        )}
                        {(() => {
                          const label = lastActiveLabel(activeById.get(a.id));
                          return label ? (
                            <div style={{ marginTop: 7, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: "#00855A" }}>
                              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1FB46A" }} />
                              {label}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    {(a.styles?.length ?? 0) > 0 && (
                      <div className="tags">{a.styles!.slice(0, 3).map((t) => <span className="tag" key={t}>{t}</span>)}</div>
                    )}
                    {a.bio && <p className="bio">{a.bio}</p>}
                    <div className="foot">
                      {a.slug && <Link className="btn-ghost" href={`/artists/${a.slug}`}>View Profile</Link>}
                      <Link className="btn" href={`/new-request?artist=${a.id}`}>Get in Touch</Link>
                      <SaveArtistButton artistId={a.id} initialSaved={savedIds.has(a.id)} isLoggedIn={!!user} next={here} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
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
