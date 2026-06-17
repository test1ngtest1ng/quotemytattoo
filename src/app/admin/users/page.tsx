import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const role = sp.role ?? "";
  const status = sp.status ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  // Strip PostgREST filter metacharacters so search text can't break the query.
  const safe = q.replace(/[,()%*]/g, " ").trim();

  const admin = createAdminClient();
  let query = admin.from("profiles").select("id, name, email, role, suspended, created_at", { count: "exact" });
  if (safe) query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%`);
  if (role) query = query.eq("role", role);
  if (status === "suspended") query = query.eq("suspended", true);
  if (status === "active") query = query.eq("suspended", false);

  const from = (page - 1) * PER_PAGE;
  const { data: rows, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PER_PAGE - 1);

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasFilters = !!(q || role || status);

  // Build a URL keeping current filters, overriding the page.
  const pageUrl = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (role) u.set("role", role);
    if (status) u.set("status", status);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return "/admin/users" + (s ? `?${s}` : "");
  };

  return (
    <>
      <div className="admin-head">
        <h2>Users</h2>
        <a className="btn-ghost-app" href="/admin/export/signups">Download CSV</a>
      </div>

      <form className="admin-filters" method="get">
        <input type="search" name="q" defaultValue={q} placeholder="Search name or email…" aria-label="Search users" />
        <select name="role" defaultValue={role} aria-label="Filter by role">
          <option value="">All roles</option>
          <option value="customer">Customer</option>
          <option value="artist">Artist</option>
          <option value="studio_owner">Studio owner</option>
        </select>
        <select name="status" defaultValue={status} aria-label="Filter by status">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button className="btn" type="submit">Search</button>
        {hasFilters && <a className="btn-ghost-app" href="/admin/users">Clear</a>}
      </form>

      {total === 0 ? (
        <div className="app-card">{hasFilters ? "No users match your search." : "No accounts yet."}</div>
      ) : (
        <div className="app-card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Joined</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => (
                <tr key={r.id as string}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmt(r.created_at as string)}</td>
                  <td>{(r.name as string) || "-"}</td>
                  <td>{r.email as string}</td>
                  <td style={{ textTransform: "capitalize" }}>{String(r.role ?? "").replace("_", " ")}</td>
                  <td>
                    {r.suspended ? (
                      <span style={{ color: "#b91c1c", fontWeight: 700 }}>Suspended</span>
                    ) : (
                      <span style={{ color: "var(--trust)", fontWeight: 700 }}>Active</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <Link href={`/admin/users/${r.id}`} style={{ color: "var(--violet)", fontWeight: 700 }}>
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="admin-pager">
          <span>{total} {total === 1 ? "user" : "users"} · page {page} of {pages}</span>
          {page > 1 && <a className="btn-ghost-app" href={pageUrl(page - 1)}>← Prev</a>}
          {page < pages && <a className="btn-ghost-app" href={pageUrl(page + 1)}>Next →</a>}
        </div>
      )}
    </>
  );
}
