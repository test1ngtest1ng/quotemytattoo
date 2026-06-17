import Link from "next/link";
import { cookies } from "next/headers";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { AccountMenu, type MenuLink } from "@/components/AccountMenu";
import { MobileNav } from "@/components/MobileNav";
import { ModeSwitch } from "@/components/ModeSwitch";
import { getProfile } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { getUnread, type UnreadSummary } from "@/lib/notifications";
import { toTitleCase } from "@/lib/format";

export async function AppHeader() {
  const profile = await getProfile();

  let hasArtist = false;
  let ownsStudio = false;
  let isAdmin = false;
  let unread: UnreadSummary = { count: 0, items: [] };
  if (profile) {
    const supabase = await createClient();
    const [{ data: ar }, { data: st }, { data: me }] = await Promise.all([
      supabase.from("artists").select("id").eq("profile_id", profile.id).maybeSingle(),
      supabase.from("studios").select("id").eq("owner_profile_id", profile.id).maybeSingle(),
      supabase.from("profiles").select("is_admin").eq("id", profile.id).maybeSingle(),
    ]);
    hasArtist = !!ar;
    ownsStudio = !!st;
    isAdmin = !!me?.is_admin;
    unread = await getUnread(supabase, profile.id, (ar?.id as string) ?? null);
  }
  const isCustomer = profile?.role === "customer" && !hasArtist && !ownsStudio;

  // Mode is a presentation/nav preference, only meaningful for artists (who have
  // both hats). Read server-side so the header colour is correct on first paint.
  const cookieMode = (await cookies()).get("qmt-mode")?.value;
  const mode: "artist" | "customer" = hasArtist
    ? cookieMode === "customer"
      ? "customer"
      : "artist"
    : "customer";
  const onDark = mode === "artist";

  // Top bar = a Dashboard link first (the home of each backend), then the core
  // actions for the active mode. Profile/Account/Log out live in the avatar menu.
  // Studio owners keep their studio nav (they have no mode toggle).
  // The public directory ("Find artists") is intentionally NOT in the logged-in
  // primary nav - it confuses customers (the model is request-first, artists come
  // to you). It lives on the front-end/marketing nav as "Directory", and is still
  // reachable in-app from the account menu below.
  const navLinks: { href: string; label: string }[] = [];
  if (hasArtist && mode === "customer") {
    navLinks.push(
      { href: "/dashboard", label: "Dashboard" },
      { href: "/new-request", label: "New request" },
      { href: "/my-requests", label: "My requests" },
    );
  } else if (hasArtist || ownsStudio) {
    navLinks.push({ href: "/dashboard", label: "Dashboard" });
    if (hasArtist) navLinks.push({ href: "/artist/leads", label: "Leads" });
    if (ownsStudio) navLinks.push({ href: "/studio", label: "My studio" });
  } else if (profile?.role === "artist" || profile?.role === "studio_owner") {
    // Registered as a pro but hasn't created their record yet - funnel to setup.
    navLinks.push({ href: "/dashboard", label: "Dashboard" });
  } else if (profile) {
    navLinks.push(
      { href: "/dashboard", label: "Dashboard" },
      { href: "/new-request", label: "New request" },
      { href: "/my-requests", label: "My requests" },
    );
  }

  const menuLinks: MenuLink[] = [];
  if (isAdmin) menuLinks.push({ href: "/admin", label: "Admin", sub: "Reports, signups, stats" });
  if (hasArtist) menuLinks.push({ href: "/artist/profile", label: "Artist profile" });
  if (!isCustomer) {
    menuLinks.push({ href: "/account?tab=requests", label: "Customer profile", sub: "For requesting your own tattoo" });
  }
  menuLinks.push({ href: "/artists", label: "Directory", sub: "Browse all artists and studios" });
  menuLinks.push({ href: "/saved", label: "Saved artists" });
  menuLinks.push({ href: "/account", label: "Account settings" });

  return (
    <header
      className={`flex items-center justify-between border-b px-4 py-4 sm:px-6 ${
        onDark ? "border-plum-deep bg-plum" : "border-line bg-white"
      }`}
    >
      <div className="flex items-center gap-3 sm:gap-7">
        <Logo compact light={onDark} />
        <nav className={`hidden gap-6 text-base font-semibold sm:flex ${onDark ? "text-white/75" : "text-muted"}`}>
          {navLinks.map((l) => (
            <Link key={l.href + l.label} href={l.href} className={onDark ? "hover:text-white" : "hover:text-ink"}>
              {toTitleCase(l.label)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {hasArtist && (
          <div className="hidden sm:block">
            <ModeSwitch mode={mode} />
          </div>
        )}
        {profile && <NotificationBell count={unread.count} items={unread.items} onDark={onDark} />}
        {/* One combined menu on mobile (nav + account + mode + log out). */}
        {profile && (
          <MobileNav
            navLinks={navLinks}
            accountLinks={menuLinks}
            name={profile.name ?? profile.email ?? ""}
            mode={hasArtist ? mode : undefined}
            onDark={onDark}
          />
        )}
        {/* Avatar menu is desktop-only - mobile folds it into the hamburger. */}
        {profile && (
          <div className="hidden sm:block">
            <AccountMenu name={profile.name ?? profile.email ?? ""} links={menuLinks} onDark={onDark} />
          </div>
        )}
      </div>
    </header>
  );
}
