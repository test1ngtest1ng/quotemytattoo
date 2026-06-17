import "@/styles/account.css";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { requireProfile } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppHeader } from "@/components/AppHeader";
import { setAvailability } from "@/lib/data/artist-profile";
import { switchMode } from "@/lib/data/mode";
import { NotificationCentre, type CentreItem } from "@/components/artist/NotificationCentre";
import { titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="stat-tile">
      <div className="n">{n}</div>
      <div className="l">{label}</div>
    </div>
  );
}

function accountCard() {
  return (
    <div className="app-card" key="account">
      <h3>Account Settings</h3>
      <p className="app-sub" style={{ margin: "10px 0 0" }}>Update your contact details, notifications and password.</p>
      <div className="app-actions"><Link href="/account" className="btn-ghost-app">Manage Account</Link></div>
    </div>
  );
}

function renderDashboard(greetingName: string, accountType: string, email: string | null, sections: React.ReactNode[], verification: string | null = null) {
  return (
    <>
      <AppHeader />
      <main className="page">
        <div className="wrap app-narrow">
          <h1 className="ptitle">Hi {greetingName} 👋</h1>
          <p className="app-sub" style={{ margin: "6px 0 0" }}>
            <span className="acct-pill">{accountType} account</span>
            {verification === "verified" && (
              <>{" "}<span className="verif-pill verified">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>
                Verified
              </span></>
            )}
            {verification === "pending" && (
              <>{" "}<span className="verif-pill pending">Verification pending</span></>
            )}
            {email && <span style={{ color: "var(--muted)" }}>{" "}· {email}</span>}
          </p>
          {verification === "pending" && (
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)", maxWidth: "62ch", lineHeight: 1.5 }}>
              You can still respond to leads, send quotes and take bookings as normal - verification doesn&apos;t affect any of that. We review new artists within 24 hours.
            </p>
          )}
          <div className="dash-sections">{sections}</div>
        </div>
      </main>
    </>
  );
}

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: artist }, { data: studio }] = await Promise.all([
    supabase.from("artists").select("id, profile_complete, display_name, available, verification_status").eq("profile_id", profile.id).maybeSingle(),
    supabase.from("studios").select("id, name").eq("owner_profile_id", profile.id).maybeSingle(),
  ]);

  const greetingName = artist?.display_name ?? profile.name ?? "there";
  const hasArtist = !!artist;
  const ownsStudio = !!studio;

  // The dashboard follows the active MODE, not just the account type, so an
  // artist viewing in customer mode sees the customer dashboard (and vice versa).
  const cookieMode = (await cookies()).get("qmt-mode")?.value;
  const mode: "artist" | "customer" = hasArtist
    ? cookieMode === "customer"
      ? "customer"
      : "artist"
    : "customer";

  // What kind of account is this? Prefer a real record; fall back to the role
  // chosen at signup (covers accounts that haven't finished onboarding yet).
  const accountType: "Studio" | "Artist" | "Customer" = studio
    ? "Studio"
    : artist || profile.role === "artist"
      ? "Artist"
      : profile.role === "studio_owner"
        ? "Studio"
        : "Customer";

  // Show the customer dashboard for: an artist toggled into customer mode, OR a
  // plain customer account (role-based, so a registered-but-not-yet-onboarded
  // artist/studio still gets their pro setup view rather than a customer one).
  const customerView = (hasArtist && mode === "customer") || accountType === "Customer";

  const sections: React.ReactNode[] = [];

  if (customerView) {
    // ===== CUSTOMER DASHBOARD =====
    if (hasArtist) {
      sections.push(
        <p key="cust-status" className="app-status app-status-info" style={{ marginBottom: 22 }}>
          You&apos;re in <strong>customer mode</strong> - post your own ideas and get quotes. Switch back to artist mode from the top bar.
        </p>,
      );
    }
    const nowIso = new Date().toISOString();
    const sevenDaysIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const [{ count: active }, { count: booked }, { data: myReqs }, { data: myConvs }] = await Promise.all([
      // Active = live and not past expiry (matches the My requests tabs).
      supabase.from("tattoo_requests").select("*", { count: "exact", head: true }).eq("customer_id", profile.id).eq("status", "live").or(`expires_at.is.null,expires_at.gt.${nowIso}`),
      supabase.from("tattoo_requests").select("*", { count: "exact", head: true }).eq("customer_id", profile.id).eq("status", "booked"),
      supabase.from("tattoo_requests").select("id, title, expires_at, quotes(id, created_at), connections(id, created_at)").eq("customer_id", profile.id).eq("status", "live"),
      supabase.from("conversations").select("request_id, artist_id, request:tattoo_requests(title), artist:artists!conversations_artist_id_fkey(display_name), messages(sender_id, read_at, created_at)").eq("customer_id", profile.id),
    ]);

    // Customer notification centre, derived from live state.
    const custItems: CentreItem[] = [];
    for (const r of myReqs ?? []) {
      const id = r.id as string;
      const title = titleCase((r.title as string) ?? "Your request");
      const quotes = (r.quotes as { id: string; created_at: string }[]) ?? [];
      const connections = (r.connections as { id: string; created_at: string }[]) ?? [];
      const latest = (rows: { created_at: string }[]) => rows.map((x) => x.created_at).sort().at(-1) ?? nowIso;
      if (connections.length > 0) {
        custItems.push({ id: `d_${id}`, kind: "decide", primary: "You accepted a quote", sub: `${title} - book or close it`, href: `/requests/${id}`, cta: "Open", at: latest(connections) });
      } else if (quotes.length > 0) {
        custItems.push({ id: `q_${id}`, kind: "new_quote", primary: `${quotes.length} quote${quotes.length === 1 ? "" : "s"} to review`, sub: title, href: `/requests/${id}`, cta: "Compare", at: latest(quotes) });
      }
      const exp = r.expires_at as string | null;
      if (exp && exp > nowIso && exp <= sevenDaysIso) {
        const days = Math.max(1, Math.ceil((new Date(exp).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
        custItems.push({ id: `x_${id}`, kind: "expiring", primary: `Request expires in ${days} day${days === 1 ? "" : "s"}`, sub: title, href: `/requests/${id}`, cta: "Review", at: nowIso });
      }
    }
    for (const c of myConvs ?? []) {
      const msgs = (c.messages as { sender_id: string | null; read_at: string | null; created_at: string }[]) ?? [];
      const unread = msgs.filter((m) => m.read_at === null && m.sender_id !== profile.id);
      if (unread.length === 0) continue;
      const lastAt = unread.map((m) => m.created_at).sort().at(-1) ?? nowIso;
      const artistName = (c.artist as { display_name?: string } | null)?.display_name ?? "An artist";
      const title = titleCase((c.request as { title?: string } | null)?.title ?? "Your request");
      // Deep-link: open the request on this artist's Messages tab.
      const href = `/requests/${c.request_id}?artist=${c.artist_id}&tab=ms`;
      custItems.push({ id: `m_${c.request_id}`, kind: "message", primary: `${artistName} sent you a message`, sub: title, href, cta: "Reply", at: lastAt });
    }

    sections.push(
      <div className="app-card" key="cust-notifications">
        <h3>Notifications</h3>
        <p className="app-sub" style={{ margin: "8px 0 14px" }}>New quotes, messages and requests that need a decision.</p>
        <NotificationCentre items={custItems} />
      </div>,
    );

    sections.push(
      <div key="customer">
        <div className="app-grid">
          <Stat n={active ?? 0} label="Active requests" />
          <Stat n={booked ?? 0} label="Booked" />
        </div>
        <div className="app-actions">
          <Link href="/new-request" className="btn">Post a Tattoo Request</Link>
          <Link href="/my-requests" className="btn-ghost-app">My Requests</Link>
        </div>
      </div>,
    );
    sections.push(accountCard());
    return renderDashboard(greetingName, accountType, profile.email, sections);
  }

  // ===== PRO DASHBOARD (artist mode and/or studio) =====

  // ---- Studio ----
  if (studio) {
    sections.push(
      <div className="app-card" key="studio">
        <h3>{studio.name}</h3>
        <p className="app-sub" style={{ margin: "10px 0 0" }}>Manage your studio profile and invite your artists.</p>
        <div className="app-actions"><Link href="/studio" className="btn">Manage Your Studio</Link></div>
      </div>,
    );
  } else if (accountType === "Studio") {
    sections.push(
      <div className="app-card" key="studio-setup">
        <h3>Register Your Studio</h3>
        <p className="app-sub" style={{ margin: "10px 0 0" }}>Set up your studio profile and invite your artists so they appear under your studio.</p>
        <div className="app-actions"><Link href="/studio/onboarding" className="btn">Register Your Studio</Link></div>
      </div>,
    );
  }

  // ---- Artist ----
  if (artist && !artist.profile_complete) {
    sections.push(
      <div className="app-card" key="artist-incomplete">
        <h3>Finish Your Artist Profile</h3>
        <p className="app-sub" style={{ margin: "10px 0 0" }}>Complete it so customers can find you and you can respond to matched leads.</p>
        <div className="app-actions"><Link href="/artist/onboarding" className="btn">Finish Your Profile</Link></div>
      </div>,
    );
  } else if (artist) {
    // Connections (accepted quotes) read via admin - RLS scopes connections per
    // request owner, so the artist's own client can't read them directly.
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();
    const [{ count: leads }, { count: quotes }, { data: conns }, { data: convs }, { data: openMatches }] = await Promise.all([
      supabase.from("request_matches").select("*", { count: "exact", head: true }).eq("artist_id", artist.id),
      supabase.from("quotes").select("*", { count: "exact", head: true }).eq("artist_id", artist.id),
      admin.from("connections").select("request_id, created_at").eq("artist_id", artist.id),
      admin.from("conversations").select("request_id, request:tattoo_requests(title), customer:profiles!conversations_customer_id_fkey(name), messages(sender_id, read_at, created_at)").eq("artist_id", artist.id),
      admin.from("request_matches").select("status, created_at, request:tattoo_requests!request_matches_request_id_fkey(id, title, status, expires_at, removed)").eq("artist_id", artist.id).eq("status", "notified"),
    ]);

    const acceptedCount = (conns ?? []).length;
    const connAt = new Map<string, string>();
    for (const c of conns ?? []) connAt.set(c.request_id as string, c.created_at as string);

    // Build the notification-centre worklist from LIVE state (so it stays an
    // accurate to-do list, not a stale event log). Each item is one action.
    const items: CentreItem[] = [];

    // Accepted quotes (and bookings won) on requests still in play.
    const acceptedReqIds = [...new Set((conns ?? []).map((c) => c.request_id as string))];
    if (acceptedReqIds.length > 0) {
      const { data: reqs } = await admin
        .from("tattoo_requests")
        .select("id, title, status, booked_artist_id, customer:profiles!tattoo_requests_customer_id_fkey(name)")
        .in("id", acceptedReqIds);
      for (const r of reqs ?? []) {
        if (r.status === "closed") continue;
        const bookedBy = (r.booked_artist_id as string | null) ?? null;
        if (bookedBy && bookedBy !== artist.id) continue; // booked someone else - not actionable
        const customer = (r.customer as { name?: string } | null)?.name ?? "A customer";
        const title = titleCase((r.title as string) ?? "Tattoo request");
        const at = connAt.get(r.id as string) ?? nowIso;
        if (bookedBy === artist.id) {
          items.push({ id: `b_${r.id}`, kind: "booked", primary: `Booked by ${customer}`, sub: title, href: `/artist/leads/${r.id}`, cta: "Open", at });
        } else {
          items.push({ id: `a_${r.id}`, kind: "accepted", primary: `${customer} accepted your quote`, sub: title, href: `/artist/leads/${r.id}`, cta: "Message", at });
        }
      }
    }

    // Unread messages.
    for (const c of convs ?? []) {
      const msgs = (c.messages as { sender_id: string | null; read_at: string | null; created_at: string }[]) ?? [];
      const unread = msgs.filter((m) => m.read_at === null && m.sender_id !== profile.id);
      if (unread.length === 0) continue;
      const lastAt = unread.map((m) => m.created_at).sort().at(-1) ?? nowIso;
      const customer = (c.customer as { name?: string } | null)?.name ?? "A customer";
      const title = titleCase((c.request as { title?: string } | null)?.title ?? "Tattoo request");
      items.push({ id: `m_${c.request_id}`, kind: "message", primary: `${customer} sent you a message`, sub: title, href: `/artist/leads/${c.request_id}#chat`, cta: "Reply", at: lastAt });
    }

    // New leads awaiting a quote.
    for (const m of openMatches ?? []) {
      const r = m.request as unknown as { id?: string; title?: string; status?: string; expires_at?: string | null; removed?: boolean } | null;
      if (!r || r.removed || r.status !== "live" || (r.expires_at && r.expires_at < nowIso)) continue;
      items.push({ id: `nl_${r.id}`, kind: "new_lead", primary: "New lead - awaiting your quote", sub: titleCase((r.title as string) ?? "Tattoo request"), href: `/artist/leads/${r.id}`, cta: "Quote", at: (m.created_at as string) ?? nowIso });
    }

    sections.push(
      <div className="app-card" key="notifications">
        <h3>Notifications</h3>
        <p className="app-sub" style={{ margin: "8px 0 14px" }}>Accepted quotes, messages and new leads to act on.</p>
        <NotificationCentre items={items} />
      </div>,
    );

    const available = artist.available !== false;
    sections.push(
      <div key="artist">
        <p className="app-status" style={{ marginBottom: 22 }}>
          {available
            ? "✓ Your artist profile is live - you appear in searches and matched leads."
            : "⏸ You're paused - you won't receive new matched leads or lead emails until you resume."}
        </p>
        <div className="app-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
          <div>
            <h3 style={{ margin: 0 }}>{available ? "Available for new work" : "Paused"}</h3>
            <p className="app-sub" style={{ margin: "6px 0 0" }}>
              {available ? "Pause this when you're booked up to stop new lead emails." : "Your existing leads and chats are unaffected."}
            </p>
          </div>
          <form action={setAvailability}>
            <input type="hidden" name="available" value={available ? "false" : "true"} />
            <button type="submit" className={available ? "btn-ghost-app" : "btn"}>{available ? "Pause new leads" : "Resume taking leads"}</button>
          </form>
        </div>
        <div className="app-grid">
          <Stat n={leads ?? 0} label="Matched leads" />
          <Stat n={quotes ?? 0} label="Quotes sent" />
          <Stat n={acceptedCount} label="Quotes accepted" />
        </div>
        <div className="app-actions">
          <Link href="/artist/leads" className="btn">View Your Leads</Link>
          <Link href="/artist/profile" className="btn-ghost-app">My Profile</Link>
        </div>
      </div>,
    );
  } else if (accountType === "Artist") {
    // Artist account that never finished onboarding.
    sections.push(
      <div className="app-card" key="artist-setup">
        <h3>Set Up Your Artist Profile</h3>
        <p className="app-sub" style={{ margin: "10px 0 0" }}>You&apos;re almost there. Add your styles, location and portfolio so customers can find you and you start receiving matched leads.</p>
        <div className="app-actions"><Link href="/artist/onboarding" className="btn">Set Up My Profile</Link></div>
      </div>,
    );
  }

  // Studio owner who isn't yet an artist - offer it
  if (studio && !artist) {
    sections.push(
      <div className="app-card" key="become-artist">
        <h3>Take bookings yourself?</h3>
        <p className="app-sub" style={{ margin: "10px 0 0" }}>Set up your own artist profile under the studio to receive leads.</p>
        <div className="app-actions"><Link href="/artist/onboarding" className="btn-ghost-app">Set Up My Artist Profile</Link></div>
      </div>,
    );
  }

  // ---- Looking for a tattoo yourself (artists only - entry to customer mode) ----
  if (hasArtist) {
    sections.push(
      <div className="app-card" key="also-customer">
        <h3>Looking for a tattoo yourself?</h3>
        <p className="app-sub" style={{ margin: "10px 0 0" }}>Post your own idea and get quotes from other artists. This switches you to customer mode.</p>
        <div className="app-actions">
          <form action={switchMode}>
            <input type="hidden" name="mode" value="customer" />
            <input type="hidden" name="to" value="/new-request" />
            <button type="submit" className="btn-ghost-app">Post a Request</button>
          </form>
          <form action={switchMode}>
            <input type="hidden" name="mode" value="customer" />
            <input type="hidden" name="to" value="/my-requests" />
            <button type="submit" className="btn-ghost-app">My Requests</button>
          </form>
        </div>
      </div>,
    );
  }

  sections.push(accountCard());
  return renderDashboard(greetingName, accountType, profile.email, sections, artist?.verification_status ?? null);
}
