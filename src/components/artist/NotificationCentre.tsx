"use client";

import { useState } from "react";
import Link from "next/link";

// Shared by both the artist and customer notification centres - each audience
// only ever produces its own subset of kinds, and chips only show when count > 0.
export type CentreKind =
  | "accepted" | "new_lead" | "booked" // artist
  | "new_quote" | "decide" | "expiring" // customer
  | "message"; // both

export type CentreItem = {
  id: string;
  kind: CentreKind;
  primary: string;
  sub: string;
  href: string;
  cta: string;
  at: string; // ISO timestamp of the underlying activity (for sort + "x ago")
};

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) { const m = Math.floor(s / 60); return `${m} minute${m === 1 ? "" : "s"} ago`; }
  if (s < 86400) { const h = Math.floor(s / 3600); return `${h} hour${h === 1 ? "" : "s"} ago`; }
  const d = Math.floor(s / 86400);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

const KIND_META: Record<CentreKind, { label: string; ic: string; cls: string }> = {
  accepted: { label: "Quotes accepted", ic: "✓", cls: "ok" },
  new_lead: { label: "New leads", ic: "+", cls: "new" },
  booked: { label: "Booked", ic: "★", cls: "ok" },
  new_quote: { label: "Quotes to review", ic: "£", cls: "ok" },
  decide: { label: "Decide", ic: "→", cls: "new" },
  expiring: { label: "Expiring soon", ic: "⏳", cls: "warn" },
  message: { label: "Messages", ic: "💬", cls: "msg" },
};
const ORDER: CentreKind[] = ["accepted", "new_lead", "new_quote", "decide", "message", "booked", "expiring"];

export function NotificationCentre({ items }: { items: CentreItem[] }) {
  const [filter, setFilter] = useState<"all" | CentreKind>("all");

  const counts = {} as Record<CentreKind, number>;
  for (const k of ORDER) counts[k] = items.filter((i) => i.kind === k).length;

  const chips: { key: "all" | CentreKind; label: string; count: number }[] = [
    { key: "all", label: "All", count: items.length },
    ...ORDER.filter((k) => counts[k] > 0).map((k) => ({ key: k, label: KIND_META[k].label, count: counts[k] })),
  ];

  const sorted = [...items].sort((a, b) => b.at.localeCompare(a.at)); // latest first
  const shown = filter === "all" ? sorted : sorted.filter((i) => i.kind === filter);

  if (items.length === 0) {
    return <p className="muted-block" style={{ fontSize: 15 }}>You&apos;re all caught up. New activity will show up here.</p>;
  }

  return (
    <div>
      <div className="ncentre-chips">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`ncentre-chip${filter === c.key ? " on" : ""}`}
            onClick={() => setFilter(c.key)}
          >
            {c.label} ({c.count})
          </button>
        ))}
      </div>

      <div className="attn-list">
        {shown.map((it) => {
          const meta = KIND_META[it.kind];
          return (
            <div className="attn-row" key={it.id}>
              <span className={`attn-ic ${meta.cls}`} aria-hidden>{meta.ic}</span>
              <div className="attn-txt">
                <strong>{it.primary}</strong>
                {it.kind !== "expiring" && <span className="attn-time"> · {ago(it.at)}</span>}
                <span className="attn-sub">{it.sub}</span>
              </div>
              <Link href={it.href} className="btn-ghost-app attn-btn">{it.cta}</Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
