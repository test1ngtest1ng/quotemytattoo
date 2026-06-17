import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  revealed_at: string | null;
  initiated_by: string | null;
  artist_id: string;
  request: { id: string; title: string | null; booked_artist_id: string | null; customer: { id: string; name: string | null } | null } | null;
  artist: { id: string; display_name: string | null; profile_id: string | null } | null;
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default async function AdminConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();
  const admin = createAdminClient();
  const { data } = await admin
    .from("connections")
    .select(
      "id, revealed_at, initiated_by, artist_id, request:tattoo_requests!connections_request_id_fkey(id, title, booked_artist_id, customer:profiles!tattoo_requests_customer_id_fkey(id, name)), artist:artists!connections_artist_id_fkey(id, display_name, profile_id)",
    )
    .order("revealed_at", { ascending: false })
    .limit(300);
  const all = (data ?? []) as unknown as Row[];

  const needle = q.toLowerCase();
  const rows = needle
    ? all.filter(
        (c) =>
          (c.request?.customer?.name ?? "").toLowerCase().includes(needle) ||
          (c.artist?.display_name ?? "").toLowerCase().includes(needle) ||
          (c.request?.title ?? "").toLowerCase().includes(needle),
      )
    : all;

  return (
    <>
      <div className="admin-head">
        <h2>Connections</h2>
        <a className="btn-ghost-app" href="/admin/export/connections">Download CSV</a>
      </div>
      <p className="app-sub" style={{ margin: "0 0 16px" }}>
        Every contact reveal between a customer and an artist (the lead event). A <strong>Booked</strong> badge means the customer
        confirmed that artist.
      </p>

      <form className="admin-filters" method="get">
        <input type="search" name="q" defaultValue={q} placeholder="Search customer, artist or request…" aria-label="Search connections" />
        <button className="btn" type="submit">Search</button>
        {q && <a className="btn-ghost-app" href="/admin/connections">Clear</a>}
      </form>

      {rows.length === 0 ? (
        <div className="app-card">{q ? "No connections match your search." : "No connections yet."}</div>
      ) : (
        <div className="app-card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Revealed</th>
                <th>Customer</th>
                <th>Artist</th>
                <th>Request</th>
                <th>By</th>
                <th>Booked?</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const booked = c.request?.booked_artist_id && c.request.booked_artist_id === c.artist_id;
                return (
                  <tr key={c.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmt(c.revealed_at)}</td>
                    <td>
                      {c.request?.customer ? (
                        <Link href={`/admin/users/${c.request.customer.id}`} style={{ color: "var(--violet)", fontWeight: 700 }}>
                          {c.request.customer.name ?? "—"}
                        </Link>
                      ) : "—"}
                    </td>
                    <td>
                      {c.artist?.profile_id ? (
                        <Link href={`/admin/users/${c.artist.profile_id}`} style={{ color: "var(--violet)", fontWeight: 700 }}>
                          {c.artist.display_name ?? "—"}
                        </Link>
                      ) : (c.artist?.display_name ?? "—")}
                    </td>
                    <td>{c.request?.title ?? "—"}</td>
                    <td style={{ textTransform: "capitalize" }}>{c.initiated_by ?? "—"}</td>
                    <td>{booked ? <span style={{ color: "var(--trust)", fontWeight: 800 }}>Booked</span> : <span style={{ color: "var(--muted)" }}>—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
