import "@/styles/account.css";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { SaveArtistButton } from "@/components/artists/SaveArtistButton";
import { businessName } from "@/lib/identity";
import { publicLocation } from "@/lib/geo";

export const metadata: Metadata = {
  title: "Saved Artists",
  robots: { index: false, follow: false },
};

type SavedArtist = {
  id: string;
  display_name: string | null;
  business_name: string | null;
  slug: string | null;
  rating: number | null;
  review_count: number | null;
  location_area: string | null;
  location_postcode: string | null;
  styles: string[] | null;
  studios: { name?: string; location_area?: string; location_postcode?: string } | null;
};

export default async function SavedArtistsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/saved");

  // Two queries (no FK-embed guessing): saved ids in order, then the artists.
  const { data: rows } = await supabase
    .from("saved_artists")
    .select("artist_id, created_at")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });
  const ids = (rows ?? []).map((r) => r.artist_id as string);

  let saved: SavedArtist[] = [];
  if (ids.length) {
    const { data: arts } = await supabase
      .from("artists")
      .select(
        "id, display_name, business_name, slug, rating, review_count, location_area, location_postcode, styles, studios!artists_studio_id_fkey(name, location_area, location_postcode)",
      )
      .in("id", ids);
    const byId = new Map((arts ?? []).map((a) => [a.id as string, a as unknown as SavedArtist]));
    saved = ids.map((id) => byId.get(id)).filter(Boolean) as SavedArtist[];
  }

  return (
    <>
      <AppHeader />
      <main className="page">
        <div className="wrap">
          <h1 className="ptitle">Saved Artists</h1>
          {saved.length === 0 ? (
            <div className="app-card">
              <h3>No Saved Artists Yet</h3>
              <p className="app-sub" style={{ margin: "10px 0 0" }}>
                Browse the <Link href="/artists" style={{ color: "var(--violet)", fontWeight: 700 }}>directory</Link> and tap the heart to shortlist artists while you compare.
              </p>
              <div className="app-actions"><Link className="btn" href="/artists">Browse the Directory</Link></div>
            </div>
          ) : (
            <div className="saved-grid">
              {saved.map((a) => {
                const st = a.studios;
                const name = a.display_name ?? "Tattoo artist";
                const business = businessName({ studioName: st?.name, businessName: a.business_name });
                const heading = business ?? name;
                const loc = publicLocation(st?.location_area ?? a.location_area, st?.location_postcode ?? a.location_postcode);
                const sub = [business ? name : null, loc].filter(Boolean).join(" · ");
                return (
                  <div className="app-card" key={a.id}>
                    <h3>{heading}</h3>
                    {sub && <p className="app-sub" style={{ margin: "8px 0 0" }}>{sub}</p>}
                    <p style={{ margin: "10px 0 0", color: "var(--star)", fontWeight: 700 }}>
                      ★ <span style={{ color: "var(--ink)" }}>{(a.rating ?? 0) > 0 ? (a.rating ?? 0).toFixed(1) : "New"}</span>
                      <span style={{ color: "var(--muted)", fontWeight: 500 }}> · {a.review_count ?? 0} review{a.review_count === 1 ? "" : "s"}</span>
                    </p>
                    <div className="app-actions">
                      <Link className="btn" href={`/new-request?artist=${a.id}`}>Request a Quote</Link>
                      {a.slug && <Link className="btn-ghost-app" href={`/artists/${a.slug}`}>View Profile</Link>}
                      <SaveArtistButton artistId={a.id} initialSaved={true} isLoggedIn next="/saved" variant="labelled" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
