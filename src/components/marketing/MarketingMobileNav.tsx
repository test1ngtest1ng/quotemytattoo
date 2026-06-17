"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toTitleCase } from "@/lib/format";

export type MarketingNavLink = { href: string; label: string };

/** Hamburger menu for the marketing/recruitment headers (homepage, for-artists).
 *  Tailwind-styled so it works regardless of which global stylesheet the page
 *  uses. Shows only below ~780px (where the inline links are hidden). `light`
 *  for dark headers (white hamburger). */
export function MarketingMobileNav({ links, light = false }: { links: MarketingNavLink[]; light?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative min-[781px]:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-10 items-center justify-center rounded-[10px] border transition ${
          light ? "border-white/30 text-white hover:bg-white/10" : "border-line text-ink hover:border-violet hover:text-violet"
        }`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-[14px] border border-line bg-white shadow-xl">
          <nav className="py-1">
            {links.map((l) => (
              <Link
                key={l.href + l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-violet/5"
              >
                {toTitleCase(l.label)}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
