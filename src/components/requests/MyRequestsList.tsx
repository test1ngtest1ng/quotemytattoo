"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import { SIZE_OPTIONS } from "@/lib/constants";
import { titleCase } from "@/lib/format";
import { deleteRequest, moveRequestToDraft, publishRequest } from "@/lib/data/requests";

export type RequestRow = {
  id: string;
  title: string | null;
  style: string | null;
  size_category: string | null;
  location_area: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  bookedArtist: string | null;
  quoteCount: number;
  chatCount: number;
  thumbnail: string | null;
};

const sizeLabel = (v: string | null) => SIZE_OPTIONS.find((s) => s.value === v)?.label ?? v;
const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** A live request past its expiry, or one the sweep already closed, is "expired". */
function effectiveStatus(r: RequestRow): string {
  if (r.status === "closed") return "expired";
  if (r.status === "live" && r.expires_at && new Date(r.expires_at).getTime() < Date.now())
    return "expired";
  return r.status;
}

function statusBadge(status: string) {
  if (status === "booked") return <span className="status booked">Booked</span>;
  if (status === "draft") return <span className="status draft">Draft</span>;
  if (status === "expired") return <span className="status draft">Expired</span>;
  return (
    <span className="status live">
      <span className="dot" />
      Open
    </span>
  );
}

function ReqCard({ r }: { r: RequestRow }) {
  const eff = effectiveStatus(r);
  const isDraft = eff === "draft";
  const isExpired = eff === "expired";
  const meta =
    isDraft
      ? [`Saved ${fmt(r.created_at)}`, "Not posted yet"]
      : isExpired
      ? [`Posted ${fmt(r.created_at)}`, r.style, sizeLabel(r.size_category), "Expired - re-post to get more quotes"].filter(Boolean)
      : [
          `Posted ${fmt(r.created_at)}`,
          r.style,
          sizeLabel(r.size_category),
          r.status === "booked" && r.bookedArtist ? `Booked with ${r.bookedArtist}` : r.location_area,
        ].filter(Boolean);

  const body = (
    <>
      <div className="req-head">
        <div className="req-thumb">
          {r.thumbnail ? (
            <img src={r.thumbnail} alt="" />
          ) : (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M5 17l4-4 3 3 3-4 4 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div className="req-id">
          <h3>{r.title ? titleCase(r.title) : "Tattoo request"}</h3>
          <div className="meta">
            {meta.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>
        {statusBadge(eff)}
        <span className="chev">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </span>
      </div>
      <div className="req-stats">
        {eff === "booked" ? (
          <>
            <div className="rs"><div className="num">1</div><div className="lbl"><b>Artist booked</b><span>Appointment to be confirmed</span></div></div>
            <div className="rs"><div className="num">{r.chatCount}</div><div className="lbl"><b>Chats</b><span>Continue your conversation</span></div></div>
          </>
        ) : eff === "draft" ? (
          <>
            <div className="rs zero"><div className="num">0</div><div className="lbl"><b>Quotes</b><span>Finish and post to start receiving quotes</span></div></div>
            <div className="rs zero"><div className="num">0</div><div className="lbl"><b>Chats</b><span>No chats yet</span></div></div>
          </>
        ) : (
          <>
            <div className={`rs${r.quoteCount === 0 ? " zero" : ""}`}><div className="num">{r.quoteCount}</div><div className="lbl"><b>Quotes</b><span>{r.quoteCount ? "Waiting for your decision" : "Notifying matching artists"}</span></div></div>
            <div className={`rs${r.chatCount === 0 ? " zero" : ""}`}><div className="num">{r.chatCount}</div><div className="lbl"><b>Chats</b><span>{r.chatCount ? "Chat started to discuss your idea" : "No chats yet"}</span></div></div>
          </>
        )}
      </div>
    </>
  );

  return (
    <div className="req">
      {isDraft ? (
        <div className="req-body">{body}</div>
      ) : (
        <Link className="req-body" href={`/requests/${r.id}`}>{body}</Link>
      )}
      <div className="req-actions">
        {isDraft && (
          <form action={publishRequest}>
            <input type="hidden" name="request_id" value={r.id} />
            <button className="ra-btn primary" type="submit">Post request</button>
          </form>
        )}
        {isExpired && (
          <form action={publishRequest}>
            <input type="hidden" name="request_id" value={r.id} />
            <button className="ra-btn primary" type="submit">Re-post</button>
          </form>
        )}
        {eff === "live" && (
          <form action={moveRequestToDraft}>
            <input type="hidden" name="request_id" value={r.id} />
            <button className="ra-btn" type="submit">Move to drafts</button>
          </form>
        )}
        <form
          action={deleteRequest}
          onSubmit={(e) => {
            if (!confirm("Delete this request? This permanently removes it along with any quotes and chats.")) e.preventDefault();
          }}
        >
          <input type="hidden" name="request_id" value={r.id} />
          <button className="ra-btn danger" type="submit">Delete</button>
        </form>
      </div>
    </div>
  );
}

export function MyRequestsList({ requests }: { requests: RequestRow[] }) {
  const groups = {
    active: requests.filter((r) => effectiveStatus(r) === "live"),
    booked: requests.filter((r) => effectiveStatus(r) === "booked"),
    drafts: requests.filter((r) => effectiveStatus(r) === "draft"),
    expired: requests.filter((r) => effectiveStatus(r) === "expired"),
  };
  const [tab, setTab] = useState<keyof typeof groups>("active");
  const tabDefs: { key: keyof typeof groups; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "booked", label: "Booked" },
    { key: "drafts", label: "Drafts" },
    { key: "expired", label: "Expired" },
  ];

  return (
    <>
      <div className="tabs">
        {tabDefs.map((t) => (
          <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
            {t.label}
            <span className="pill">{groups[t.key].length}</span>
          </button>
        ))}
      </div>

      <div>
        {tab === "active" && groups.active.length > 0 && (
          <div className="promo">
            <div className="ic">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l2.2 4.6 5 .7-3.6 3.5.9 5L12 14.9 7.5 16.8l.9-5L4.8 8.3l5-.7L12 3z" />
              </svg>
            </div>
            <div>
              <h4>Thinking about your next piece?</h4>
              <p>Browse styles and healed work to find inspiration for your next tattoo.</p>
              <Link className="lnk" href="/tattoo-artists">Explore styles</Link>
            </div>
          </div>
        )}
        {groups[tab].length === 0 ? (
          <p style={{ color: "var(--muted)", padding: "30px 4px" }}>Nothing here yet.</p>
        ) : (
          groups[tab].map((r) => <ReqCard key={r.id} r={r} />)
        )}
      </div>
    </>
  );
}
