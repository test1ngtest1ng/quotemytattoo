/* eslint-disable @next/next/no-img-element */
import "@/styles/account.css";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppHeader } from "@/components/AppHeader";
import { zoneLabel } from "@/lib/wizard";
import { SIZE_OPTIONS } from "@/lib/constants";
import { titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "Your Leads",
  robots: { index: false, follow: false },
};

const sizeLabel = (v: string | null) => SIZE_OPTIONS.find((s) => s.value === v)?.label ?? null;

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/artist/leads");

  const { data: artist } = await supabase
    .from("artists")
    .select("id, profile_complete")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!artist) redirect("/artist/onboarding");

  // Read via admin (scoped to this artist) so booked leads stay visible -
  // RLS otherwise only exposes 'live' requests to matched artists.
  const admin = createAdminClient();

  // Touch the responsiveness signal - opening leads = active. Tolerant of the
  // column not existing yet (pre-0021); errors are ignored, not awaited-checked.
  await admin.from("artists").update({ last_active: new Date().toISOString() }).eq("id", artist.id);
  const { data: matches } = await admin
    .from("request_matches")
    .select(
      "status, request:tattoo_requests!request_matches_request_id_fkey(id, title, size_category, location_area, style, placement_zone, status, removed, booked_artist_id, expires_at, created_at, customer:profiles!tattoo_requests_customer_id_fkey(name), request_images(storage_path, created_at))",
    )
    .eq("artist_id", artist.id)
    .order("created_at", { ascending: false });

  // Leads this artist is already connected to stay visible regardless of status.
  const { data: conns } = await admin.from("connections").select("request_id").eq("artist_id", artist.id);
  const connectedReqIds = new Set((conns ?? []).map((c) => c.request_id as string));

  // Requests with a message the artist hasn't read yet (drives the unread dot).
  const { data: convs } = await admin
    .from("conversations")
    .select("request_id, messages(sender_id, read_at)")
    .eq("artist_id", artist.id);
  const unreadReqIds = new Set<string>();
  for (const c of convs ?? []) {
    const hasUnread = ((c.messages as { sender_id: string | null; read_at: string | null }[]) ?? [])
      .some((m) => m.read_at === null && m.sender_id !== user.id);
    if (hasUnread) unreadReqIds.add(c.request_id as string);
  }

  const nowIso = new Date().toISOString();
  type Stage = "accepted" | "new" | "quoted" | "booked" | "lost" | "passed";
  const stageOf = (r: Record<string, unknown>, matchStatus: string, connected: boolean): Stage => {
    const bookedBy = (r.booked_artist_id as string | null) ?? null;
    if (bookedBy === artist.id) return "booked";
    if (bookedBy || r.status === "closed" || r.status === "booked") return "lost";
    if (connected) return "accepted";
    if (matchStatus === "declined") return "passed";
    return matchStatus === "responded" ? "quoted" : "new";
  };

  const filtered = (matches ?? [])
    .map((m) => {
      const r = m.request as unknown as (Record<string, string | null> & {
        customer?: { name?: string | null };
        request_images?: { storage_path: string; created_at: string }[] | null;
      }) | null;
      const connected = !!r && connectedReqIds.has(r.id as string);
      return { matchStatus: m.status, r, customerName: r?.customer?.name ?? null, connected };
    })
    .filter((m) => {
      if (!m.r) return false;
      if ((m.r as Record<string, unknown>).removed) return false;
      // Keep leads this artist is already connected to (regardless of status).
      if (m.connected) return true;
      // Otherwise: live, but hide once expired (even if the daily sweep hasn't run).
      return m.r.status === "live" && !(m.r.expires_at && m.r.expires_at < nowIso);
    });

  // Sign the first reference image per lead (private bucket → admin signed URL).
  const leads = await Promise.all(
    filtered.map(async (m) => {
      const imgs = m.r?.request_images ?? [];
      const first = [...imgs].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
      let thumbnail: string | null = null;
      if (first) {
        const { data } = await admin.storage
          .from("request-images")
          .createSignedUrl(first.storage_path, 3600);
        thumbnail = data?.signedUrl ?? null;
      }
      const stage = stageOf(m.r as Record<string, unknown>, m.matchStatus, m.connected);
      const unread = unreadReqIds.has((m.r as Record<string, string | null>).id as string);
      return { ...m, thumbnail, stage, unread };
    }),
  );

  type Lead = (typeof leads)[number];
  const BADGE: Record<Stage, { label: string; style: React.CSSProperties }> = {
    accepted: { label: "✓ Accepted", style: { background: "#EAF7F1", color: "#0A8A5B" } },
    new: { label: "New lead", style: { background: "#F2EAF8", color: "#6A2E96" } },
    quoted: { label: "Quoted", style: { background: "#FAEEDA", color: "#854F0B" } },
    booked: { label: "★ Booked", style: { background: "#EAF7F1", color: "#0A8A5B" } },
    lost: { label: "Lost", style: { background: "#F1EFE8", color: "#5F5E5A" } },
    passed: { label: "Passed", style: { background: "#F1EFE8", color: "#5F5E5A" } },
  };
  const SECTIONS: { stage: Stage; heading: string }[] = [
    { stage: "accepted", heading: "Accepted - get in touch" },
    { stage: "new", heading: "New leads" },
    { stage: "quoted", heading: "Quoted - awaiting reply" },
    { stage: "booked", heading: "Booked" },
    { stage: "lost", heading: "Lost" },
    { stage: "passed", heading: "Passed" },
  ];

  const renderCard = ({ r, customerName, thumbnail, stage, unread }: Lead) => {
    const rr = r as Record<string, string | null>;
    const posted = rr.created_at
      ? new Date(rr.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
      : null;
    const badge = BADGE[stage];
    return (
      <Link key={rr.id as string} href={`/artist/leads/${rr.id}`} className="app-card">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
          <div style={{ display: "flex", gap: 14, minWidth: 0 }}>
            <span
              style={{
                width: 56, height: 56, flex: "none", borderRadius: 10, overflow: "hidden",
                background: "#F2EAF8", display: "grid", placeItems: "center", color: "var(--violet)",
              }}
            >
              {thumbnail ? (
                <img src={thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M5 17l4-4 3 3 3-4 4 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <div style={{ minWidth: 0 }}>
              {customerName && (
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--violet)", marginBottom: 2 }}>
                  {customerName}{posted ? ` · ${posted}` : ""}
                </div>
              )}
              <h3>{titleCase(rr.title ?? "Tattoo request")}</h3>
              <div className="lead-meta">
                {rr.style && <span>{rr.style}</span>}
                {sizeLabel(rr.size_category) && <span>{sizeLabel(rr.size_category)}</span>}
                {zoneLabel(rr.placement_zone) && <span>{zoneLabel(rr.placement_zone)}</span>}
                {rr.location_area && <span>{rr.location_area}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flex: "none" }}>
            <span className="lead-badge" style={badge.style}>{badge.label}</span>
            {unread && (
              <span className="lead-badge" style={{ background: "#6A2E96", color: "#fff" }}>💬 New message</span>
            )}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <>
      <AppHeader />
      <main className="page">
        <div className="wrap app-narrow">
          <h1 className="ptitle">Your Leads</h1>
          <p className="app-sub">Tattoo requests matched to your styles and area.</p>

          {!artist.profile_complete && (
            <div className="app-card">
              Finish your profile to respond to leads.{" "}
              <Link href="/artist/onboarding" style={{ color: "var(--violet)", fontWeight: 700 }}>Complete profile</Link>
            </div>
          )}

          {leads.length === 0 ? (
            <div className="app-card" style={{ textAlign: "center", color: "var(--muted)", padding: "40px 26px" }}>
              No leads yet. As customers post requests matching your styles and area, they&apos;ll appear here.
            </div>
          ) : (
            SECTIONS.map(({ stage, heading }) => {
              const group = leads.filter((l) => l.stage === stage);
              if (group.length === 0) return null;
              return (
                <section key={stage}>
                  <div className="leads-section-h">{heading} ({group.length})</div>
                  {group.map(renderCard)}
                </section>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}
