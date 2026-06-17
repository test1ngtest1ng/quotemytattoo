import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { setArtistVerification } from "@/lib/data/admin";
import { businessName } from "@/lib/identity";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export const dynamic = "force-dynamic";

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

type Row = {
  id: string;
  display_name: string | null;
  business_name: string | null;
  slug: string | null;
  location_area: string | null;
  verification_status: string;
  created_at: string;
  studios: { name?: string | null } | { name?: string | null }[] | null;
};

const STATUSES = ["pending", "verified", "rejected"] as const;

export default async function AdminVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status! : "pending";

  const admin = createAdminClient();
  const { data } = await admin
    .from("artists")
    .select("id, display_name, business_name, slug, location_area, verification_status, created_at, studios!artists_studio_id_fkey(name)")
    .eq("profile_complete", true)
    .eq("verification_status", status)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as unknown as Row[];

  const action = (artistId: string, to: string, label: string, bg?: string) => (
    <form action={setArtistVerification}>
      <input type="hidden" name="artist_id" value={artistId} />
      <input type="hidden" name="status" value={to} />
      <button type="submit" className={bg ? "btn" : "btn-ghost-app"} style={bg ? { background: bg } : undefined}>
        {label}
      </button>
    </form>
  );

  return (
    <>
      <div className="admin-head">
        <h2>Artist Verification</h2>
      </div>
      <p className="app-sub" style={{ margin: "0 0 16px" }}>
        Grant the trust badge to legitimate artists. This is badge-only - every onboarded artist already
        appears in the directory and receives leads regardless of status.
      </p>

      <form className="admin-filters" method="get">
        <select name="status" defaultValue={status} aria-label="Filter by status">
          <option value="pending">Pending review</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <button className="btn" type="submit">View</button>
      </form>

      {rows.length === 0 ? (
        <div className="app-card">{status === "pending" ? "Nothing awaiting review 🎉" : `No ${status} artists.`}</div>
      ) : (
        rows.map((r) => {
          const studio = Array.isArray(r.studios) ? r.studios[0] : r.studios;
          const heading = businessName({ studioName: studio?.name, businessName: r.business_name }) ?? r.display_name ?? "Tattoo artist";
          return (
            <div className="app-card" key={r.id} style={{ marginBottom: 14 }}>
              <p style={{ margin: 0, fontWeight: 800, color: "var(--plum)" }}>
                {heading} {r.verification_status === "verified" && <VerifiedBadge />}
              </p>
              <p className="app-sub" style={{ margin: "6px 0" }}>
                {r.display_name && heading !== r.display_name ? `${r.display_name} · ` : ""}
                {r.location_area || "No area"} · submitted {fmt(r.created_at)}
                {r.slug ? <> · <Link href={`/artists/${r.slug}`} style={{ color: "var(--violet)" }}>view public profile ↗</Link></> : null}
              </p>
              <div className="app-actions">
                {r.verification_status !== "verified" && action(r.id, "verified", "✓ Verify", "var(--trust)")}
                {r.verification_status !== "rejected" && action(r.id, "rejected", "Reject", "#b91c1c")}
                {r.verification_status !== "pending" && action(r.id, "pending", "Reset to pending")}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
