"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import { toTitleCase } from "@/lib/format";

export type MenuLink = { href: string; label: string; sub?: string };

export function AccountMenu({ name, links, onDark = false }: { name: string; links: MenuLink[]; onDark?: boolean }) {
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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 transition ${
          onDark ? "border-white/25 hover:bg-white/10" : "border-line hover:border-violet"
        }`}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-wash text-violet">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
          </svg>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={onDark ? "text-white/70" : "text-muted"}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-[14px] border border-line bg-white shadow-xl">
          {name && (
            <div className="border-b border-line px-4 py-3 text-sm font-extrabold text-plum">{name}</div>
          )}
          <nav className="py-1">
            {links.map((l) => (
              <Link
                key={l.href + l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 transition hover:bg-violet/5"
              >
                <span className="block text-sm font-semibold text-ink">{toTitleCase(l.label)}</span>
                {l.sub && <span className="block text-xs text-muted">{l.sub}</span>}
              </Link>
            ))}
          </nav>
          <form action={signOut} className="border-t border-line">
            <button className="w-full px-4 py-2.5 text-left text-sm font-semibold text-ink transition hover:bg-violet/5">
              Log Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
