import { createAdminClient } from "@/lib/supabase/admin";
import { setRequestRemoved } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const safe = q.replace(/[,()%*]/g, " ").trim();

  const admin = createAdminClient();
  let query = admin
    .from("tattoo_requests")
    .select("id, title, style, location_area, status, removed, created_at", { count: "exact" });
  if (safe) query = query.or(`title.ilike.%${safe}%,location_area.ilike.%${safe}%`);
  if (status === "removed") query = query.eq("removed", true);
  else if (status) query = query.eq("status", status);

  const from = (page - 1) * PER_PAGE;
  const { data: rows, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PER_PAGE - 1);

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasFilters = !!(q || status);

  const pageUrl = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (status) u.set("status", status);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return "/admin/requests" + (s ? `?${s}` : "");
  };

  return (
    <>
      <div className="admin-head">
        <h2>Leads / Requests</h2>
        <a className="btn-ghost-app" href="/admin/export/requests">Download CSV</a>
      </div>

      <form className="admin-filters" method="get">
        <input type="search" name="q" defaultValue={q} placeholder="Search title or area…" aria-label="Search requests" />
        <select name="status" defaultValue={status} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="live">Live</option>
          <option value="booked">Booked</option>
          <option value="closed">Closed</option>
          <option value="draft">Draft</option>
          <option value="removed">Removed</option>
        </select>
        <button className="btn" type="submit">Search</button>
        {hasFilters && <a className="btn-ghost-app" href="/admin/requests">Clear</a>}
      </form>

      {total === 0 ? (
        <div className="app-card">{hasFilters ? "No requests match your search." : "No requests yet."}</div>
      ) : (
        <div className="app-card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Style</th>
                <th>Area</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => (
                <tr key={r.id as string} style={r.removed ? { opacity: 0.55 } : undefined}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmt(r.created_at as string)}</td>
                  <td>{(r.title as string) || "-"}</td>
                  <td>{(r.style as string) || "-"}</td>
                  <td>{(r.location_area as string) || "-"}</td>
                  <td style={{ textTransform: "capitalize" }}>
                    {r.removed ? <span style={{ color: "#b91c1c", fontWeight: 700 }}>Removed</span> : (r.status as string)}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <form action={setRequestRemoved}>
                      <input type="hidden" name="request_id" value={r.id as string} />
                      <input type="hidden" name="removed" value={r.removed ? "0" : "1"} />
                      <button
                        type="submit"
                        style={{
                          background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: 0,
                          color: r.removed ? "var(--violet)" : "#b91c1c",
                        }}
                      >
                        {r.removed ? "Restore" : "Remove"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="admin-pager">
          <span>{total} {total === 1 ? "request" : "requests"} · page {page} of {pages}</span>
          {page > 1 && <a className="btn-ghost-app" href={pageUrl(page - 1)}>← Prev</a>}
          {page < pages && <a className="btn-ghost-app" href={pageUrl(page + 1)}>Next →</a>}
        </div>
      )}
    </>
  );
}
