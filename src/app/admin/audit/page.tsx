import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const fmt = (d: string) =>
  new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const LABELS: Record<string, string> = {
  suspend_user: "Suspended user",
  restore_user: "Restored user",
  edit_profile: "Edited profile",
  remove_request: "Removed request",
  restore_request: "Restored request",
  delete_account: "Deleted account",
  dismiss_report: "Dismissed report",
  hide_review: "Hid review",
  verify_artist: "Verified artist",
  reject_artist: "Rejected artist",
  reset_verification: "Reset verification",
};

type Row = {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: string | null;
  created_at: string;
  admin: { name: string | null; email: string | null } | { name: string | null; email: string | null }[] | null;
};

export default async function AdminAuditPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_actions")
    .select("id, action, target_type, target_id, detail, created_at, admin:profiles!admin_actions_admin_id_fkey(name, email)")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <div className="admin-head">
        <h2>Audit Log</h2>
      </div>
      <p className="app-sub" style={{ margin: "0 0 18px" }}>
        Every admin action - suspensions, edits, removals, deletions and moderation.
      </p>
      {rows.length === 0 ? (
        <div className="app-card">No admin actions recorded yet.</div>
      ) : (
        <div className="app-card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const who = Array.isArray(r.admin) ? r.admin[0] : r.admin;
                const isUser = r.target_type === "user" && r.target_id;
                return (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmt(r.created_at)}</td>
                    <td>{who?.name || who?.email || "-"}</td>
                    <td style={{ fontWeight: 700 }}>{LABELS[r.action] ?? r.action}</td>
                    <td>
                      {isUser ? (
                        <Link href={`/admin/users/${r.target_id}`} style={{ color: "var(--violet)", fontWeight: 700 }}>
                          {r.detail || `${r.target_type} ↗`}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>{r.detail || r.target_type || "-"}</span>
                      )}
                    </td>
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
