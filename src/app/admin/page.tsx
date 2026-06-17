import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getStats() {
  const admin = createAdminClient();
  const head = (table: string) =>
    admin.from(table).select("*", { count: "exact", head: true });
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const results = await Promise.all([
    head("profiles"),
    head("profiles").eq("role", "customer"),
    head("profiles").eq("role", "artist"),
    head("profiles").eq("role", "studio_owner"),
    head("artists").eq("profile_complete", true),
    head("studios"),
    head("tattoo_requests"),
    head("tattoo_requests").gte("created_at", sevenDaysAgo),
    head("connections"),
    head("reports").eq("status", "open"),
    head("tattoo_requests").eq("publish_on_verify", true).eq("status", "draft"),
    head("tattoo_requests").eq("publish_on_verify", true).eq("status", "draft").gte("created_at", oneDayAgo),
  ]);

  const [
    accounts,
    customers,
    artistsRole,
    studioOwners,
    onboardedArtists,
    studios,
    requests,
    requests7,
    bookings,
    openReports,
    guestAbandoned,
    guestAbandoned24,
  ] = results.map((r) => r.count ?? 0);

  return {
    accounts,
    customers,
    artistsRole,
    studioOwners,
    onboardedArtists,
    studios,
    requests,
    requests7,
    bookings,
    openReports,
    guestAbandoned,
    guestAbandoned24,
  };
}

function Tile({ n, l, href }: { n: number; l: string; href?: string }) {
  const inner = (
    <>
      <div className="n">{n.toLocaleString("en-GB")}</div>
      <div className="l">{l}</div>
    </>
  );
  return href ? (
    <Link href={href} className="stat-tile">
      {inner}
    </Link>
  ) : (
    <div className="stat-tile">{inner}</div>
  );
}

export default async function AdminOverviewPage() {
  const s = await getStats();
  return (
    <>
      <div className="admin-head">
        <h2>Overview</h2>
      </div>

      <p className="app-sub" style={{ margin: "0 0 14px" }}>People</p>
      <div className="stat-grid">
        <Tile n={s.accounts} l="Total accounts" href="/admin/users" />
        <Tile n={s.customers} l="Customers" />
        <Tile n={s.artistsRole} l="Artists (registered)" />
        <Tile n={s.onboardedArtists} l="Artists (onboarded)" />
        <Tile n={s.studioOwners} l="Studio owners" />
        <Tile n={s.studios} l="Studios" />
      </div>

      <p className="app-sub" style={{ margin: "26px 0 14px" }}>Activity</p>
      <div className="stat-grid">
        <Tile n={s.requests} l="Tattoo requests (all time)" href="/admin/requests" />
        <Tile n={s.requests7} l="Requests · last 7 days" href="/admin/requests" />
        <Tile n={s.bookings} l="Connections" href="/admin/connections" />
        <Tile n={s.openReports} l="Open reports" href="/admin/reports" />
        <Tile
          n={s.guestAbandoned}
          l={s.guestAbandoned24 >= 10 ? "Abandoned guest ⚠ spike" : "Abandoned guest requests"}
          href="/admin/guest-requests"
        />
      </div>
    </>
  );
}
