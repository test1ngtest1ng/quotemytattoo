"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Chat } from "@/components/chat/Chat";
import { SubmitButton } from "@/components/SubmitButton";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { shareContact, cancelAcceptance, unmarkBooked, reopenRequest, leaveReview, finishRequest, declineQuote, undeclineQuote } from "@/lib/data/connections";

export type Msg = { id: string; sender_id: string | null; body: string; created_at: string; image_url?: string | null };
export type DetailReview = { rating: number; title: string | null; body: string | null; when: string };
export type DetailArtist = {
  id: string;
  name: string;
  businessName: string | null;
  slug: string | null;
  initials: string;
  color: string;
  rating: number;
  reviewCount: number;
  styles: string[];
  bio: string | null;
  studioName: string | null;
  location: string | null;
  instagram: string | null;
  tiktok: string | null;
  badges: { insured: boolean; licensed: boolean; hygiene: boolean; firstAid: boolean };
  memberSince: string | null;
  portfolio: string[];
  reviews: DetailReview[];
  quotePrice: number | null;
  quoteNote: string | null;
  quoteId: string | null;
  quoteStatus: string;
  conversationId: string | null;
  messages: Msg[];
  canReview: boolean;
  hasReviewed: boolean;
  /** Full address + contact - populated once contact has been shared (a connection). */
  revealed?: {
    address: string | null;
    area: string | null;
    postcode: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

const Star = ({ s = 13 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24"><path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z" /></svg>
);

export type RequestSummary = {
  note: string | null;
  style: string | null;
  size: string | null;
  placement: string | null;
  location: string | null;
  posted: string | null;
};

export function RequestDetailView({
  requestId,
  requestStatus,
  currentUserId,
  artists,
  bookedArtistId,
  bookedBy = null,
  requestSummary,
  referenceImages = [],
}: {
  requestId: string;
  requestTitle: string;
  requestStatus: string;
  currentUserId: string;
  artists: DetailArtist[];
  bookedArtistId: string | null;
  bookedBy?: string | null;
  requestSummary?: RequestSummary;
  referenceImages?: string[];
}) {
  // Deep-link from a "new message" notification: ?artist=<id>&tab=ms selects that
  // artist and opens their Messages tab.
  const search = useSearchParams();
  const wantArtist = search.get("artist");
  const wantTab = search.get("tab");
  const deepIdx = wantArtist ? artists.findIndex((a) => a.id === wantArtist) : -1;

  const [cur, setCur] = useState(deepIdx >= 0 ? deepIdx : 0);
  // Default to Messages: when a customer reviews a quote they almost always want
  // to chat. An explicit ?tab= overrides (e.g. a deep-link to Profile/Reviews).
  const [tab, setTab] = useState<"pf" | "rv" | "ms">(
    wantTab === "pf" ? "pf" : wantTab === "rv" ? "rv" : "ms",
  );
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  // When arriving via a message deep-link, scroll the conversation into view.
  useEffect(() => {
    if (deepIdx >= 0) {
      const t = setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
      return () => clearTimeout(t);
    }
  }, [deepIdx]);
  const openMessages = () => {
    setTab("ms");
    setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  const a = artists[cur];
  const hasQuotes = artists.length > 0;
  const isClosed = requestStatus === "closed";
  const bookedName = artists.find((x) => x.id === bookedArtistId)?.name ?? null;
  const acceptedArtists = artists.filter((x) => x.revealed);

  // The request brief. While quotes are coming in it collapses to a single line
  // (with an inline "View details") so it doesn't dominate the page; with no
  // quotes yet it stays fully open since it's the only thing to look at.
  const metaItems = requestSummary
    ? [
        requestSummary.posted && `Posted ${requestSummary.posted}`,
        requestSummary.style,
        requestSummary.size,
        requestSummary.placement,
        requestSummary.location,
      ].filter(Boolean)
    : [];

  const briefFull = requestSummary ? (
    <div className="card" style={{ marginBottom: 22 }}><div className="pad">
      <h2>Your Request</h2>
      <div className="meta-row">
        {metaItems.map((m, i) => <span key={i} className="meta-item">{m}</span>)}
      </div>
      {requestSummary.note && (
        <p style={{ marginTop: 12, color: "var(--text)", lineHeight: 1.55 }}>{requestSummary.note}</p>
      )}
      {referenceImages.length > 0 && (
        <>
          <h4 style={{ margin: "16px 0 8px", fontSize: 14 }}>Reference Images</h4>
          <div className="gallery refs">
            {referenceImages.map((url, i) => (
              <button className="gt" key={i} onClick={() => setLightbox(url)} type="button">
                <img src={url} alt="Your reference" loading="lazy" />
              </button>
            ))}
          </div>
        </>
      )}
      {hasQuotes && (
        <button type="button" className="brief-hide" onClick={() => setBriefOpen(false)}>Hide details</button>
      )}
    </div></div>
  ) : null;

  const briefCollapsed = requestSummary ? (
    <div className="card" style={{ marginBottom: 22 }}><div className="pad" style={{ paddingTop: 18, paddingBottom: 18 }}>
      <div className="brief-line">
        <span className="t">Your request</span>
        <span>{metaItems.join(" · ")}</span>
        <button type="button" className="brief-toggle" onClick={() => setBriefOpen(true)}>View details</button>
      </div>
    </div></div>
  ) : null;

  const briefPanel = hasQuotes && !briefOpen ? briefCollapsed : briefFull;

  // Top banner: only when the request has an outcome (booked or closed). Booking
  // auto-closes it (status 'booked'); either state can be reopened.
  const statusBar = (isClosed || bookedArtistId) ? (
    <div className="card" style={{ marginBottom: 22 }}><div className="pad" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      {isClosed ? (
        <>
          <span style={{ fontWeight: 700 }}>This request is closed.</span>
          <form action={reopenRequest}><input type="hidden" name="request_id" value={requestId} /><SubmitButton className="btn-ghost-app">Reopen request</SubmitButton></form>
        </>
      ) : (
        <>
          <span style={{ fontWeight: 700, color: "var(--trust)" }}>
            {bookedBy === "artist"
              ? `✓ ${bookedName} marked this as booked - this request is now closed.`
              : `✓ You booked ${bookedName} - this request is now closed.`}
          </span>
          <form action={unmarkBooked}><input type="hidden" name="request_id" value={requestId} /><SubmitButton className="btn-ghost-app">Reopen request</SubmitButton></form>
        </>
      )}
    </div></div>
  ) : null;

  // The single end-of-journey action - only while open (live, not booked), shown at
  // the bottom of the page. This is where booking is captured: if the customer
  // booked one of the artists they accepted, picking them here marks the booking
  // (Verified-booking badge + review) and closes; otherwise it just closes.
  const closeBox = (!isClosed && !bookedArtistId) ? (
    <details className="close-box">
      <summary>Done with this request?</summary>
      <p className="close-note">
        {acceptedArtists.length > 0
          ? "Let us know how it went so we can close this request. If you booked one of these artists, picking them lets you leave a review."
          : "Let us know how it went so we can close this request."}
      </p>
      <form action={finishRequest}>
        <input type="hidden" name="request_id" value={requestId} />
        <select name="choice" defaultValue={acceptedArtists[0] ? `book:${acceptedArtists[0].id}` : "elsewhere"} className="rev-select">
          {acceptedArtists.map((x) => (
            <option key={x.id} value={`book:${x.id}`}>Yes - I booked {x.name}</option>
          ))}
          <option value="elsewhere">I booked someone elsewhere</option>
          <option value="changed_mind">No - I changed my mind</option>
        </select>
        <input name="note" placeholder="Anything else? (optional)" className="rev-input" />
        <SubmitButton className="btn-ghost-app">Close request</SubmitButton>
      </form>
    </details>
  ) : null;

  if (!hasQuotes || !a) {
    return (
      <>
        {briefPanel}
        {statusBar}
        <div className="card"><div className="pad">
          <h2>Waiting for Quotes</h2>
          <p className="muted-block">We&apos;ve notified matching artists. Their quotes and chats will appear here as they respond, and we&apos;ll email you.</p>
        </div></div>
        {closeBox}
        {lightbox && (
          <div className="lbov show" onClick={() => setLightbox(null)}>
            <img src={lightbox} alt="Reference full size" />
          </div>
        )}
      </>
    );
  }

  const isBookedHere = bookedArtistId === a.id;
  const business = a.studioName || a.businessName || null;
  const heading = business ?? a.name;
  const firstName = a.name.split(" ")[0];
  const sub = [business ? `Artist: ${a.name}` : null, a.location].filter(Boolean).join(" · ");

  return (
    <>
      {briefPanel}
      {statusBar}
      <div className="grid">
        {/* LEFT: one unified list of every artist who responded */}
        <div className="lc">
          <div className="card"><div className="pad">
            <h2>Quotes ({artists.length})</h2>
            <p className="muted-block">Message anyone to discuss the design, then accept a quote to swap contact details.</p>
            <div className="alist">
              {artists.map((x, i) => (
                <div
                  key={x.id}
                  className={`arow${i === cur ? " sel" : ""}`}
                  role="button"
                  tabIndex={0}
                  style={x.quoteStatus === "declined" ? { opacity: 0.55 } : undefined}
                  onClick={() => setCur(i)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCur(i); } }}
                >
                  <span className="av" style={{ background: x.color }}>{x.initials}</span>
                  <span className="info">
                    <span className="nm-row">
                      <span className="nm">{x.studioName || x.businessName || x.name}</span>
                      {x.revealed ? (
                        <span className="arow-stat">Accepted</span>
                      ) : x.quoteStatus === "declined" ? (
                        <span className="arow-stat" style={{ color: "var(--muted)" }}>Declined</span>
                      ) : (!isClosed && (
                        <button
                          type="button"
                          className="arow-msg"
                          onClick={(e) => { e.stopPropagation(); setCur(i); openMessages(); }}
                        >
                          Message
                        </button>
                      ))}
                    </span>
                    <span className="rt">
                      <Star />{x.rating ? x.rating.toFixed(1) : "New"}
                      {x.quotePrice ? <span className="ct">· From £{x.quotePrice}</span> : null}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div></div>
        </div>

        {/* RIGHT: the selected artist */}
        <div className="rc">
          {/* Artist header (identity + message) */}
          <div className="card">
            <div className="resp-head">
              <span className="av" style={{ background: a.color }}>{a.initials}</span>
              <div className="head-info" style={{ flex: 1, minWidth: 0 }}>
                <div className="nm">{a.slug ? <Link href={`/artists/${a.slug}`}>{heading}</Link> : heading}</div>
                <div className="rt"><Star s={15} /><span>{a.rating ? a.rating.toFixed(1) : "New"}</span><span className="ct">({a.reviewCount} reviews)</span></div>
                {sub && <div className="recv"><span>{sub}</span></div>}
              </div>
              {!isClosed && <button type="button" className="btn" onClick={openMessages}>Message</button>}
            </div>
          </div>

          {/* Quote: price + comment, with Accept quote (reveals contact) */}
          <div className="card"><div className="pad">
            <h2>{firstName}&apos;s quote</h2>
            {!a.revealed && <p className="est-note">Accepting the quote reveals {firstName}&apos;s full contact details and location - it&apos;s not a contract.</p>}
            <div className="est">
              <div className="est-main">
                {a.quotePrice ? <span className="price">From £{a.quotePrice}</span> : <span style={{ fontWeight: 700, color: "var(--ink)" }}>Quote sent</span>}
                {a.quoteNote && <div className="price-note">{a.quoteNote}</div>}
              </div>
              <div className="est-actions">
                {!isClosed && (
                  a.revealed ? (
                    <>
                      <span className="est-accepted">✓ Quote accepted</span>
                      {!isBookedHere && (
                        <form
                          action={cancelAcceptance}
                          onSubmit={(e) => { if (!window.confirm(`Cancel your acceptance of ${firstName}'s quote? This hides their contact details here again.`)) e.preventDefault(); }}
                        >
                          <input type="hidden" name="request_id" value={requestId} />
                          <input type="hidden" name="artist_id" value={a.id} />
                          <button type="submit" className="cancel-accept">Cancel acceptance</button>
                        </form>
                      )}
                    </>
                  ) : a.quoteStatus === "declined" ? (
                    <>
                      <span style={{ color: "var(--muted)", fontWeight: 600 }}>You declined this quote</span>
                      <form action={undeclineQuote}>
                        <input type="hidden" name="request_id" value={requestId} />
                        <input type="hidden" name="artist_id" value={a.id} />
                        <button type="submit" className="cancel-accept">Undo</button>
                      </form>
                    </>
                  ) : (
                    <>
                      <form action={shareContact}>
                        <input type="hidden" name="request_id" value={requestId} />
                        <input type="hidden" name="artist_id" value={a.id} />
                        <SubmitButton className="btn" pendingText="Accepting…">Accept quote</SubmitButton>
                      </form>
                      <form action={declineQuote}>
                        <input type="hidden" name="request_id" value={requestId} />
                        <input type="hidden" name="artist_id" value={a.id} />
                        <button type="submit" className="cancel-accept">Decline</button>
                      </form>
                    </>
                  )
                )}
              </div>
            </div>

            {/* Revealed contact (after accepting the quote) */}
            {a.revealed && (() => {
              const fullAddr = [a.revealed.address, a.revealed.area, a.revealed.postcode].filter(Boolean).join(", ");
              return (
                <ul className="est-contact">
                  {fullAddr && <li><div className="k">Studio address</div><div>{fullAddr}</div></li>}
                  {a.revealed.phone && <li><div className="k">Phone</div><a href={`tel:${a.revealed.phone}`} style={{ color: "var(--violet)", fontWeight: 600 }}>{a.revealed.phone}</a></li>}
                  {a.revealed.email && <li><div className="k">Email</div><a href={`mailto:${a.revealed.email}`} style={{ color: "var(--violet)", fontWeight: 600 }}>{a.revealed.email}</a></li>}
                  {!fullAddr && !a.revealed.phone && !a.revealed.email && <li className="ns-sub">{firstName} hasn&apos;t added contact details yet - keep chatting in Messages.</li>}
                </ul>
              );
            })()}
          </div></div>

          {/* Tabs: profile / reviews / messages */}
          <div className="card" ref={tabsRef}>
            <div className="ptabs">
              <button className={tab === "pf" ? "on" : ""} onClick={() => setTab("pf")}>Profile</button>
              <button className={tab === "rv" ? "on" : ""} onClick={() => setTab("rv")}>Reviews</button>
              <button className={tab === "ms" ? "on" : ""} onClick={() => setTab("ms")}>Messages</button>
            </div>

            {tab === "pf" && (
              <div className="pbody">
                {a.memberSince && <div className="gk">Member since {a.memberSince}</div>}
                <h4>Good to Know</h4>
                {(() => {
                  const creds = [
                    a.badges.licensed && "Licensed / council-registered",
                    a.badges.insured && "Public liability insurance",
                    a.badges.hygiene && "Hygiene certified",
                    a.badges.firstAid && "First-aid trained",
                  ].filter(Boolean) as string[];
                  return creds.length > 0 ? (
                    <>
                      <div className="gk-badges">
                        {creds.map((c) => (
                          <span key={c} className="gk-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                            {c}
                          </span>
                        ))}
                      </div>
                      <p className="gk-disclaimer">* Self-declared by the artist - please verify before booking.</p>
                    </>
                  ) : (
                    <p className="muted-block">Profile reviewed by Quote My Tattoo.</p>
                  );
                })()}
                {a.bio && <p className="bio">{a.bio}</p>}
                {a.styles.length > 0 && (
                  <div className="styles-row">{a.styles.map((s) => <span className="tag" key={s}>{s}</span>)}</div>
                )}
                {(a.instagram || a.tiktok) && (
                  <div className="socials">
                    {a.instagram && <a className="soc" href={a.instagram} target="_blank" rel="noreferrer">Instagram</a>}
                    {a.tiktok && <a className="soc" href={a.tiktok} target="_blank" rel="noreferrer">TikTok</a>}
                  </div>
                )}
                {a.portfolio.length > 0 && (
                  <>
                    <h4 className="port-h">Portfolio</h4>
                    <div className="gallery">
                      {a.portfolio.map((url, i) => (
                        <button className="gt" key={i} onClick={() => setLightbox(url)} type="button">
                          <img src={url} alt="Tattoo portfolio piece" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "rv" && (
              <div className="pbody">
                {a.reviews.length === 0 ? (
                  <p className="muted-block">No reviews yet.</p>
                ) : (
                  a.reviews.map((r, i) => (
                    <div className="rev" key={i}>
                      <div className="rh">
                        <span className="stars">{Array.from({ length: r.rating }).map((_, k) => <Star key={k} s={14} />)}</span>
                        <span className="when">{r.when}</span>
                      </div>
                      {r.title && <p style={{ fontWeight: 700, margin: "0 0 4px" }}>{r.title}</p>}
                      {r.body && <p>{r.body}</p>}
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "ms" && (
              <div className="pbody">
                {a.conversationId ? (
                  <Chat conversationId={a.conversationId} currentUserId={currentUserId} initialMessages={a.messages} />
                ) : (
                  <p className="muted-block">A chat will open here once {firstName} messages you.</p>
                )}
              </div>
            )}
          </div>

          {/* Review (stays below the messaging section) */}
          {a.canReview && (
            <div className="card nextsteps"><div className="pad">
              <h3>Leave a Review</h3>
              {a.hasReviewed ? (
                <p className="ns-sub" style={{ marginTop: 12 }}>Thanks for reviewing {firstName}.</p>
              ) : (
                <ReviewForm
                  requestId={requestId}
                  artistId={a.id}
                  name={a.name}
                  isBookedHere={isBookedHere}
                  action={leaveReview}
                />
              )}
            </div></div>
          )}

          {closeBox}
        </div>
      </div>

      {lightbox && (
        <div className="lbov show" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Portfolio piece full size" />
        </div>
      )}
    </>
  );
}
