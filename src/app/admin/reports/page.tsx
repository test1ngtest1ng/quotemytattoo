import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { dismissReport, hideReportedReview } from "@/lib/data/reports";
import { setSuspended } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Reports",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const admin = createAdminClient();
  const { data: reports } = await admin
    .from("reports")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const enriched = [] as Array<Record<string, unknown> & { context: string; userId: string | null }>;
  for (const r of reports ?? []) {
    let context = "";
    let userId: string | null = null;
    if (r.target_type === "review") {
      const { data: rev } = await admin.from("reviews").select("title, body, rating, customer_id").eq("id", r.target_id).maybeSingle();
      context = rev ? `★${rev.rating} ${rev.title ? `“${rev.title}” ` : ""}${rev.body ?? ""}`.slice(0, 180) : "(review not found / already removed)";
      userId = (rev?.customer_id as string) ?? null;
    } else if (r.target_type === "artist") {
      const { data: art } = await admin.from("artists").select("display_name, slug, profile_id").eq("id", r.target_id).maybeSingle();
      context = art ? `Artist: ${art.display_name}${art.slug ? ` (/artists/${art.slug})` : ""}` : "(artist not found)";
      userId = (art?.profile_id as string) ?? null;
    } else if (r.target_type === "message") {
      const { data: msg } = await admin.from("messages").select("body, sender_id").eq("id", r.target_id).maybeSingle();
      context = msg ? `Message: “${(msg.body ?? "").slice(0, 160)}”` : "(message not found)";
      userId = (msg?.sender_id as string) ?? null;
    } else if (r.target_type === "studio") {
      const { data: st } = await admin.from("studios").select("name, owner_profile_id").eq("id", r.target_id).maybeSingle();
      context = st ? `Studio: ${st.name}` : "(studio not found)";
      userId = (st?.owner_profile_id as string) ?? null;
    }
    enriched.push({ ...r, context, userId });
  }

  return (
    <>
      <div className="admin-head">
        <h2>Reports</h2>
        <a className="btn-ghost-app" href="/admin/export/reports">Download CSV</a>
      </div>
      {enriched.length === 0 ? (
        <div className="app-card">No open reports 🎉</div>
      ) : (
        enriched.map((r) => (
          <div className="app-card" key={r.id as string} style={{ marginBottom: 14 }}>
            <p style={{ margin: 0, fontWeight: 800, color: "var(--plum)", textTransform: "capitalize" }}>
              {String(r.target_type)} · {String(r.reason)}
            </p>
            <p className="app-sub" style={{ margin: "6px 0" }}>{r.context}</p>
            {!!r.details && <p style={{ margin: "0 0 6px", fontStyle: "italic" }}>“{String(r.details)}”</p>}
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
              {new Date(r.created_at as string).toLocaleString("en-GB")}
            </p>
            <div className="app-actions">
              <form action={dismissReport}>
                <input type="hidden" name="report_id" value={r.id as string} />
                <button className="btn-ghost-app" type="submit">Dismiss</button>
              </form>
              {r.userId && (
                <Link href={`/admin/users/${r.userId}`} className="btn-ghost-app">View user →</Link>
              )}
              {r.userId && (
                <form action={setSuspended}>
                  <input type="hidden" name="user_id" value={r.userId as string} />
                  <input type="hidden" name="suspended" value="1" />
                  <button className="btn" type="submit" style={{ background: "#b91c1c" }}>Suspend User</button>
                </form>
              )}
              {r.target_type === "review" && (
                <form action={hideReportedReview}>
                  <input type="hidden" name="report_id" value={r.id as string} />
                  <input type="hidden" name="review_id" value={r.target_id as string} />
                  <button className="btn" type="submit" style={{ background: "#b91c1c", boxShadow: "0 2px 0 #7f1d1d" }}>
                    Hide this review
                  </button>
                </form>
              )}
            </div>
          </div>
        ))
      )}
    </>
  );
}
