"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import { updateArtist, addPortfolioImages, removePortfolioImage } from "@/lib/data/artist-profile";
import { SubmitButton } from "@/components/SubmitButton";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { ReportButton } from "@/components/ReportButton";
import { compressToFileList } from "@/lib/image";
import { TATTOO_STYLES, MAX_ARTIST_STYLES, TRUST_BADGES } from "@/lib/constants";

export type PortfolioPic = { id: string; path: string; url: string };
export type ArtistReview = { id: string; rating: number; title: string | null; body: string | null; when: string };

export function ArtistProfileManager({
  data,
  portfolio,
  reviews,
  notice,
  initialTab,
}: {
  data: {
    display_name: string;
    business_name: string;
    bio: string;
    styles: string[];
    location_area: string;
    location_postcode: string;
    address_line: string;
    travel_areas: string;
    instagram_url: string;
    tiktok_url: string;
    insured: boolean;
    licensed: boolean;
    hygiene_certified: boolean;
    first_aid: boolean;
  };
  portfolio: PortfolioPic[];
  reviews: ArtistReview[];
  notice?: { type: "ok" | "err"; text: string };
  initialTab?: "profile" | "portfolio" | "reviews";
}) {
  const [tab, setTab] = useState<"profile" | "portfolio" | "reviews">(initialTab ?? "profile");
  const [styles, setStyles] = useState<string[]>(data.styles);
  const [area, setArea] = useState(data.location_area);
  const [postcode, setPostcode] = useState(data.location_postcode);

  const toggleStyle = (s: string) =>
    setStyles((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : cur.length < MAX_ARTIST_STYLES ? [...cur, s] : cur));

  const nav: { key: typeof tab; label: string }[] = [
    { key: "profile", label: "Profile details" },
    { key: "portfolio", label: "Portfolio" },
    { key: "reviews", label: "Reviews" },
  ];

  return (
    <div className="layout">
      <aside>
        <div className="who-row"><span className="who-av">{(data.display_name || "A")[0].toUpperCase()}</span><span className="nm">{data.display_name || "Your profile"}</span></div>
        <div className="side-h">Artist profile</div>
        <p className="side-note">What customers see when you appear in search or send a quote.</p>
        <nav className="side-nav">
          {nav.map((n) => (
            <a key={n.key} href="#" className={tab === n.key ? "on" : ""} onClick={(e) => { e.preventDefault(); setTab(n.key); }}>{n.label}</a>
          ))}
        </nav>
        <div className="side-links">
          <Link href="/account">Account &amp; request settings →</Link>
          <Link href="/artist/leads">Your leads →</Link>
        </div>
      </aside>

      <section>
        {notice && (
          <p style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10, fontWeight: 600,
            background: notice.type === "ok" ? "rgba(0,182,122,.1)" : "rgba(220,38,38,.08)",
            color: notice.type === "ok" ? "var(--trust)" : "#b91c1c" }}>{notice.text}</p>
        )}

        {/* PROFILE */}
        <div className={`panel${tab === "profile" ? " show" : ""}`}>
          <h2>Profile Details</h2>
          <form action={updateArtist}>
            <input type="hidden" name="styles" value={JSON.stringify(styles)} />
            <input type="hidden" name="location_area" value={area} />
            <input type="hidden" name="location_postcode" value={postcode} />

            <div className="field">
              <label>Your name <span className="req">*</span></label>
              <input type="text" name="display_name" defaultValue={data.display_name} required />
            </div>
            <div className="field">
              <label>Business / trading name <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional - leave blank to use your name; ignored if you&apos;re in a studio)</span></label>
              <input type="text" name="business_name" defaultValue={data.business_name} placeholder="e.g. Mara Voss Ink" />
            </div>
            <div className="field">
              <label>Bio</label>
              <textarea name="bio" defaultValue={data.bio} rows={6} style={{ minHeight: 150, resize: "vertical", lineHeight: 1.5 }} />
            </div>

            <div className="field">
              <label>Styles <span style={{ fontWeight: 400, color: "var(--muted)" }}>(up to {MAX_ARTIST_STYLES}, first is primary)</span></label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {TATTOO_STYLES.map((s) => {
                  const on = styles.includes(s);
                  return (
                    <button type="button" key={s} onClick={() => toggleStyle(s)}
                      style={{ borderRadius: 999, padding: "8px 15px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                        border: on ? "2px solid var(--violet)" : "2px solid var(--line)",
                        background: on ? "var(--violet)" : "#fff", color: on ? "#fff" : "var(--text)" }}>{s}</button>
                  );
                })}
              </div>
            </div>

            <div className="field">
              <label>Postcode <span style={{ fontWeight: 400, color: "var(--muted)" }}>(start typing to search)</span></label>
              <LocationAutocomplete value={postcode} onChange={setPostcode} onTown={(t) => setArea(t)} placeholder="e.g. E1 6QL" />
            </div>
            <div className="field">
              <label>Town / city <span className="req">*</span></label>
              <LocationAutocomplete value={area} onChange={setArea} placeholder="e.g. London - fills in from your postcode" />
            </div>
            <div className="field">
              <label>Studio / work address <span style={{ fontWeight: 400, color: "var(--muted)" }}>(shown to a customer only after they book you)</span></label>
              <input type="text" name="address_line" defaultValue={data.address_line} placeholder="e.g. 12 Redchurch Street" />
            </div>
            {/* "Also travel to" hidden for now (future improvement) - existing value preserved. */}
            <input type="hidden" name="travel_areas" defaultValue={data.travel_areas} />

            <div className="field">
              <label>Credentials</label>
              <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
                {TRUST_BADGES.map((b) => (
                  <label key={b.key} style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
                    <input type="checkbox" name={b.key} defaultChecked={(data as unknown as Record<string, boolean>)[b.key]} style={{ width: 18, height: 18, accentColor: "var(--violet)" }} />
                    {b.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Instagram URL</label>
              <input type="url" name="instagram_url" defaultValue={data.instagram_url} placeholder="https://instagram.com/you" />
            </div>
            <div className="field">
              <label>TikTok URL</label>
              <input type="url" name="tiktok_url" defaultValue={data.tiktok_url} placeholder="https://tiktok.com/@you" />
            </div>

            <SubmitButton className="btn">Save profile</SubmitButton>
          </form>
        </div>

        {/* PORTFOLIO */}
        <div className={`panel${tab === "portfolio" ? " show" : ""}`}>
          <h2>Portfolio</h2>
          <p className="intro">Showcase your work. These appear on your public profile.</p>
          {portfolio.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 12, marginBottom: 24 }}>
              {portfolio.map((p) => (
                <div key={p.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)" }}>
                  <img src={p.url} alt="Portfolio piece" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <form action={removePortfolioImage} style={{ position: "absolute", top: 6, right: 6 }}>
                    <input type="hidden" name="image_id" value={p.id} />
                    <input type="hidden" name="storage_path" value={p.path} />
                    <button aria-label="Remove" style={{ width: 26, height: 26, borderRadius: 999, border: "none", background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer" }}>×</button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="intro">No portfolio images yet.</p>
          )}
          <form action={addPortfolioImages}>
            <label className="btn" style={{ display: "inline-block", cursor: "pointer" }}>
              Add photos
              <input
                type="file"
                name="portfolio"
                accept="image/*"
                multiple
                hidden
                onChange={async (e) => {
                  const input = e.currentTarget;
                  const form = input.form;
                  const picked = Array.from(input.files ?? []);
                  if (!picked.length) return;
                  // Compress to WebP in the browser before upload (saves storage).
                  const compressed = await compressToFileList(picked);
                  if (compressed) input.files = compressed;
                  form?.requestSubmit();
                }}
              />
            </label>
          </form>
        </div>

        {/* REVIEWS */}
        <div className={`panel${tab === "reviews" ? " show" : ""}`}>
          <h2>Reviews</h2>
          {reviews.length === 0 ? (
            <p className="intro">No reviews yet. They appear here once customers review you.</p>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {reviews.map((r) => (
                <div key={r.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ color: "var(--star)", fontSize: 15 }}>{"★".repeat(r.rating)}<span style={{ color: "var(--muted)", marginLeft: 8, fontSize: 13 }}>{r.when}</span></div>
                    <ReportButton targetType="review" targetId={r.id} isLoggedIn label="Report" />
                  </div>
                  {r.title && <p style={{ fontWeight: 700, margin: "4px 0 2px" }}>{r.title}</p>}
                  {r.body && <p style={{ margin: 0, color: "var(--text)" }}>{r.body}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
