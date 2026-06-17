"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import { switchMode } from "@/lib/data/mode";
import { toTitleCase } from "@/lib/format";
import type { MenuLink } from "@/components/AccountMenu";

/** The single mobile menu for the app header (below `sm`). Combines what used to
 *  be two separate menus - the nav hamburger and the avatar/account dropdown -
 *  into one, so mobile has just: logo (left), bell + this menu (right). Carries
 *  the nav links, the account links, the mode switch (artists) and log out. */
export function MobileNav({
  navLinks,
  accountLinks,
  name,
  mode,
  onDark = false,
}: {
  navLinks: { href: string; label: string }[];
  accountLinks: MenuLink[];
  name?: string;
  mode?: "artist" | "customer";
  onDark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const target = mode === "artist" ? "customer" : "artist";
  const item = "block px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-violet/5";

  return (
    <div ref={ref} className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className={`flex h-10 w-10 items-center justify-center rounded-[10px] border transition ${
          onDark ? "border-white/25 text-white hover:bg-white/10" : "border-line text-muted hover:border-violet hover:text-violet"
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-[14px] border border-line bg-white shadow-xl">
          {name && <div className="border-b border-line px-4 py-3 text-sm font-extrabold text-plum">{name}</div>}

          {navLinks.length > 0 && (
            <nav className="py-1">
              {navLinks.map((l) =>
                // Marketing route group has its own global CSS - full navigation so it loads cleanly.
                l.href === "/artists" ? (
                  <a key={l.href + l.label} href={l.href} onClick={() => setOpen(false)} className={item}>{toTitleCase(l.label)}</a>
                ) : (
                  <Link key={l.href + l.label} href={l.href} onClick={() => setOpen(false)} className={item}>{toTitleCase(l.label)}</Link>
                ),
              )}
            </nav>
          )}

          {mode && (
            <form action={switchMode} className="border-t border-line">
              <input type="hidden" name="mode" value={target} />
              <button type="submit" className={`w-full text-left ${item}`}>{toTitleCase(`Switch to ${target} mode`)}</button>
            </form>
          )}

          {accountLinks.length > 0 && (
            <nav className="border-t border-line py-1">
              {accountLinks.map((l) => {
                const inner = (
                  <>
                    <span className="block text-sm font-semibold text-ink">{toTitleCase(l.label)}</span>
                    {l.sub && <span className="block text-xs text-muted">{l.sub}</span>}
                  </>
                );
                const cls = "block px-4 py-2.5 transition hover:bg-violet/5";
                // /artists is in the marketing route group - full nav so its CSS loads cleanly.
                return l.href === "/artists" ? (
                  <a key={l.href + l.label} href={l.href} onClick={() => setOpen(false)} className={cls}>{inner}</a>
                ) : (
                  <Link key={l.href + l.label} href={l.href} onClick={() => setOpen(false)} className={cls}>{inner}</Link>
                );
              })}
            </nav>
          )}

          <form action={signOut} className="border-t border-line">
            <button className={`w-full text-left ${item}`}>Log Out</button>
          </form>
        </div>
      )}
    </div>
  );
}
