"use client";

import { useState } from "react";
import Link from "next/link";
import { toTitleCase } from "@/lib/format";

export type PublicNavLink = { href: string; label: string; cta?: boolean };

/** Header nav for the public/marketing pages. On desktop it renders the links
 *  inline (unchanged); on mobile it collapses to a hamburger that opens a
 *  dropdown sheet (CSS in city.css: .navtoggle / .navsheet). */
export function PublicNav({ links }: { links: PublicNavLink[] }) {
  const [open, setOpen] = useState(false);
  return (
    <nav className="nav">
      {links.map((l) => (
        <Link key={l.href + l.label} className={l.cta ? "out" : "hidelink"} href={l.href}>
          {toTitleCase(l.label)}
        </Link>
      ))}
      <button
        type="button"
        className="navtoggle"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
        <span />
      </button>
      <div className={`navsheet${open ? " open" : ""}`}>
        {links.map((l) => (
          <Link key={l.href + l.label} href={l.href} onClick={() => setOpen(false)}>
            {toTitleCase(l.label)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
