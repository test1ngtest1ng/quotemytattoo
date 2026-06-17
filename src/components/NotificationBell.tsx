"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FeedItem, FeedKind } from "@/lib/notifications";
import { markNotificationsSeen } from "@/lib/data/notifications";

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// A small coloured glyph per feed kind so the list scans at a glance.
function ItemIcon({ kind }: { kind: FeedKind }) {
  const map: Record<FeedKind, { bg: string; fg: string; ch: string }> = {
    quote_accepted: { bg: "#EAF7F1", fg: "#0A8A5B", ch: "✓" },
    booked: { bg: "#EAF7F1", fg: "#0A8A5B", ch: "★" },
    new_lead: { bg: "#F2EAF8", fg: "#6A2E96", ch: "+" },
    new_quote: { bg: "#EAF7F1", fg: "#0A8A5B", ch: "£" },
    message: { bg: "#F2EAF8", fg: "#6A2E96", ch: "💬" },
    expiring: { bg: "#FAEEDA", fg: "#854F0B", ch: "⏳" },
  };
  const { bg, fg, ch } = map[kind];
  return (
    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: bg, color: fg }}>
      {ch}
    </span>
  );
}

export function NotificationBell({ count, items, onDark = false }: { count: number; items: FeedItem[]; onDark?: boolean }) {
  const [open, setOpen] = useState(false);
  // Local badge so opening the bell clears it instantly; re-syncs if the server
  // sends a new count (e.g. a new message arrives).
  const [badge, setBadge] = useState(count);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setBadge(count), [count]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && badge > 0) {
      setBadge(0); // optimistic - opening = acknowledged
      markNotificationsSeen().catch(() => {});
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={badge > 0 ? `${badge} unread notifications` : "Notifications"}
        className={`relative flex h-10 w-10 items-center justify-center rounded-[10px] border transition ${
          onDark
            ? "border-white/25 text-white hover:bg-white/10"
            : "border-line text-muted hover:border-violet hover:text-violet"
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {badge > 0 && (
          <span className={`absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${onDark ? "bg-white text-plum" : "bg-violet text-white"}`}>
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-[14px] border border-line bg-white shadow-xl">
          <div className="border-b border-line px-4 py-3 text-sm font-extrabold text-plum">
            Notifications
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Nothing new.</p>
          ) : (
            <ul className="max-h-96 overflow-auto">
              {items.map((it) => (
                <li key={it.id} className="border-b border-line last:border-0">
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 px-4 py-3 transition hover:bg-violet/5"
                  >
                    <ItemIcon kind={it.kind} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-bold text-ink">{it.primary}</span>
                        <span className="shrink-0 text-xs text-muted">{ago(it.at)}</span>
                      </div>
                      {it.kind === "message" ? (
                        <>
                          <div className="truncate text-xs text-muted">{it.title}</div>
                          <div className="mt-0.5 truncate text-sm text-ink/80">{it.snippet}</div>
                        </>
                      ) : (
                        <div className="truncate text-sm text-ink/80">{it.snippet}</div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
