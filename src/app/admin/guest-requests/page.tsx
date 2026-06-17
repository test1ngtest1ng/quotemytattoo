import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteGuestRequest, purgeAllAbandonedGuestRequests } from "@/lib/data/admin";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";

export const metadata: Metadata = {
  title: "Guest requests",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "under an hour ago";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** How many of the rows were started in the last 24 hours. */
function countLast24(rows: { created_at: unknown }[]): number {
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  return rows.filter((r) => new Date(r.created_at as string).getTime() >= dayAgo).length;
}

export default async function AdminGuestRequestsPage() {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("tattoo_requests")
    .select("id, customer_id, title, created_at, request_images(id)")
    .eq("publish_on_verify", true)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(500);

  const list = rows ?? [];

  // Resolve owner emails in one shot.
  const ownerIds = [...new Set(list.map((r) => r.customer_id).filter((x): x is string => !!x))];
  const emailById = new Map<string, string>();
  if (ownerIds.length) {
    const { data: profs } = await admin.from("profiles").select("id, email").in("id", ownerIds);
    for (const p of profs ?? []) emailById.set(p.id as string, (p.email as string) ?? "");
  }

  const last24 = countLast24(list);
  const spike = last24 >= 10;

  return (
    <>
      <div className="admin-head">
        <h2>Guest requests</h2>
        {list.length > 0 && (
          <form action={purgeAllAbandonedGuestRequests}>
            <ConfirmSubmit
              confirm={`Permanently delete all ${list.length} abandoned guest request(s), their uploaded images, and the unconfirmed accounts? This cannot be undone.`}
              style={{ background: "#b91c1c", boxShadow: "0 2px 0 #7f1d1d" }}
            >
              Purge all abandoned ({list.length})
            </ConfirmSubmit>
          </form>
        )}
      </div>

      <p className="app-sub" style={{ margin: "0 0 14px" }}>
        Requests started by a guest who created an account but never confirmed their email,
        so they never went live. The daily cron clears these after 7 days; this page lets you
        remove them now (with their uploaded images and the unconfirmed account) if it looks
        like spam or an attack.
      </p>

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <div className="stat-tile">
          <div className="n">{list.length.toLocaleString("en-GB")}</div>
          <div className="l">Abandoned (total)</div>
        </div>
        <div className="stat-tile" style={spike ? { outline: "2px solid #b91c1c" } : undefined}>
          <div className="n" style={spike ? { color: "#b91c1c" } : undefined}>
            {last24.toLocaleString("en-GB")}
          </div>
          <div className="l">{spike ? "Last 24h ⚠ spike" : "Last 24h"}</div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="app-card">No abandoned guest requests 🎉</div>
      ) : (
        list.map((r) => {
          const images = Array.isArray(r.request_images) ? r.request_images.length : 0;
          const email = (r.customer_id && emailById.get(r.customer_id)) || "(unknown / deleted)";
          return (
            <div className="app-card" key={r.id as string} style={{ marginBottom: 12 }}>
              <p style={{ margin: 0, fontWeight: 800, color: "var(--plum)" }}>
                {(r.title as string)?.trim() || "(untitled request)"}
              </p>
              <p className="app-sub" style={{ margin: "6px 0" }}>
                {email} · {images} image{images === 1 ? "" : "s"} · started {ago(r.created_at as string)}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                {new Date(r.created_at as string).toLocaleString("en-GB")}
              </p>
              <div className="app-actions">
                <form action={deleteGuestRequest}>
                  <input type="hidden" name="request_id" value={r.id as string} />
                  <ConfirmSubmit
                    confirm="Delete this abandoned guest request, its images, and the unconfirmed account?"
                    style={{ background: "#b91c1c" }}
                  >
                    Delete
                  </ConfirmSubmit>
                </form>
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
