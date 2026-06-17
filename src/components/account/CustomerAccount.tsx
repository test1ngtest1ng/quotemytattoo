"use client";

import { useState } from "react";
import Link from "next/link";
import {
  updateContact,
  updateNotifications,
  changePassword,
  changeEmail,
  deleteAccount,
  updateRequestDefaults,
} from "@/lib/data/account";
import { SubmitButton } from "@/components/SubmitButton";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";

type Settings = Record<string, boolean>;

// Email notification rows. Keys match the EmailCategory values honored by the
// senders (src/lib/notification-prefs.ts). Email-only - we don't send SMS.
// `audience` hides rows that don't apply (e.g. "New leads" is artist-only).
type NotifRow = { key: string; nt: string; nd: string; defaultOn?: boolean; audience?: "artist" | "customer" };
const NOTIF_GROUPS: { group: string; rows: NotifRow[] }[] = [
  {
    group: "Activity",
    rows: [
      { key: "messages_email", nt: "New messages", nd: "Email me when someone replies in one of my conversations.", defaultOn: true },
      { key: "quotes_email", nt: "New quotes", nd: "Email me when an artist sends or updates a quote.", defaultOn: true, audience: "customer" },
      { key: "leads_email", nt: "New leads", nd: "Email me when a new request matches me, plus a weekly summary of leads left open.", defaultOn: true, audience: "artist" },
      { key: "activity_email", nt: "Booking activity", nd: "Email me when a quote is accepted or a job is booked.", defaultOn: true },
      { key: "reviews_email", nt: "Review reminders", nd: "Remind me to review my artist after my tattoo has healed.", defaultOn: true, audience: "customer" },
    ],
  },
  {
    group: "Marketing",
    rows: [
      { key: "newsletter_email", nt: "Newsletter", nd: "Occasional styles, artist spotlights and aftercare advice." },
      { key: "offers_email", nt: "Offers", nd: "Flash days, guest spots and occasional product news." },
    ],
  },
];

function Toggle({ name, defaultChecked, label }: { name: string; defaultChecked: boolean; label: string }) {
  return (
    <div className="toggle-row">
      {label}
      <label className="sw">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} />
        <span className="track" />
      </label>
    </div>
  );
}

type RequestDefaults = { postcode: string; area: string; radius: number };
type Tab = "contact" | "requests" | "manage" | "notif";

export function CustomerAccount({
  name,
  email,
  phone,
  settings,
  requestDefaults,
  workAddress,
  initialTab,
  isArtist = false,
  notice,
}: {
  name: string;
  email: string;
  phone: string;
  settings: Settings;
  requestDefaults: RequestDefaults;
  workAddress: { area: string; postcode: string } | null;
  initialTab?: Tab;
  isArtist?: boolean;
  notice?: { type: "ok" | "err"; text: string };
}) {
  const [tab, setTab] = useState<Tab>(initialTab ?? "contact");
  const [rPostcode, setRPostcode] = useState(requestDefaults.postcode);
  const [rArea, setRArea] = useState(requestDefaults.area);
  const [rRadius, setRRadius] = useState(requestDefaults.radius || 15);
  const tabLink = (key: Tab, label: string) => (
    <a key={key} href="#" className={tab === key ? "on" : ""} onClick={(e) => { e.preventDefault(); setTab(key); }}>
      {label}
    </a>
  );

  return (
    <div className="layout">
      <aside>
        <div className="who-row"><span className="who-av">{(name || "A")[0].toUpperCase()}</span><span className="nm">{name || "Your account"}</span></div>
        <div className="side-h">Customer profile</div>
        <p className="side-note">Your private details for when you request a tattoo yourself.</p>
        <nav className="side-nav">
          <a href="#" className={`stacked${tab === "requests" ? " on" : ""}`} onClick={(e) => { e.preventDefault(); setTab("requests"); }}>
            Your request details
            <span className="side-sub">Where you want your tattoo + travel radius</span>
          </a>
        </nav>
        <div className="side-h">Account</div>
        <nav className="side-nav">
          {tabLink("contact", "Contact information")}
          {tabLink("notif", "Notifications")}
          {tabLink("manage", "Manage account")}
        </nav>
        {isArtist && (
          <div className="side-links">
            <Link href="/artist/profile">Your artist profile →</Link>
          </div>
        )}
      </aside>

      <section>
        {notice && (
          <p style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10, fontWeight: 600,
            background: notice.type === "ok" ? "rgba(0,182,122,.1)" : "rgba(220,38,38,.08)",
            color: notice.type === "ok" ? "var(--trust)" : "#b91c1c" }}>{notice.text}</p>
        )}

        {/* Contact */}
        <div className={`panel${tab === "contact" ? " show" : ""}`}>
          <h2>Contact Details</h2>
          <form action={updateContact}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} readOnly style={{ background: "#f7f5fa", color: "var(--muted)" }} />
            </div>
            <div className="field">
              <label>Name <span className="req">*</span></label>
              <input type="text" name="name" defaultValue={name} required />
            </div>
            <div className="field">
              <label>Phone number</label>
              <div className="phone-field"><span className="cc">+44</span><input type="tel" name="phone" defaultValue={phone} /></div>
            </div>
            <SubmitButton className="btn">Save</SubmitButton>
          </form>
        </div>

        {/* Tattoo request details */}
        <div className={`panel${tab === "requests" ? " show" : ""}`}>
          <h2>Tattoo Request Details</h2>
          <p className="intro">
            Where you&apos;d like your tattoo and how far you&apos;ll travel. We use this to pre-fill new
            requests and match you with nearby artists - you can still change it on any individual request.
          </p>
          <form action={updateRequestDefaults}>
            {workAddress && (
              <button
                type="button"
                onClick={() => {
                  setRPostcode(workAddress.postcode);
                  setRArea(workAddress.area);
                }}
                style={{
                  marginBottom: 18, padding: "9px 16px", borderRadius: 999, cursor: "pointer",
                  border: "2px solid var(--line)", background: "#fff", fontWeight: 700, fontSize: 14, color: "var(--violet)",
                }}
              >
                Use my studio / work address
              </button>
            )}
            <div className="field">
              <label>Postcode <span style={{ fontWeight: 400, color: "var(--muted)" }}>(start typing to search)</span></label>
              <LocationAutocomplete
                name="request_postcode"
                value={rPostcode}
                onChange={setRPostcode}
                onTown={(t) => setRArea(t)}
                placeholder="e.g. E1 6QL"
              />
            </div>
            <div className="field">
              <label>Town / city</label>
              <LocationAutocomplete
                name="request_area"
                value={rArea}
                onChange={setRArea}
                placeholder="e.g. London - fills in from your postcode"
              />
            </div>
            <div className="field">
              <label>
                How far will you travel? <strong style={{ color: "var(--violet)" }}>{rRadius} miles</strong>
              </label>
              <input
                type="range"
                name="request_radius"
                min={1}
                max={100}
                step={1}
                value={rRadius}
                onChange={(e) => setRRadius(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--violet)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                <span>1 mi</span>
                <span>100 mi</span>
              </div>
            </div>
            <SubmitButton className="btn">Save</SubmitButton>
          </form>
        </div>

        {/* Manage */}
        <div className={`panel${tab === "manage" ? " show" : ""}`}>
          <h2>Manage Account</h2>

          <form action={changeEmail} style={{ marginBottom: 30 }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--plum)", margin: "0 0 12px" }}>Change Email</h3>
            <div className="field">
              <label>Current email</label>
              <input type="email" value={email} readOnly style={{ background: "#f7f5fa", color: "var(--muted)" }} />
            </div>
            <div className="field">
              <label>New email</label>
              <input type="email" name="email" required placeholder="you@example.com" />
            </div>
            <p className="intro" style={{ margin: "0 0 12px" }}>We&apos;ll email a confirmation link to the new address - the change takes effect once you click it.</p>
            <SubmitButton className="btn">Update email</SubmitButton>
          </form>

          <div style={{ marginBottom: 30 }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--plum)", margin: "0 0 8px" }}>Your Data</h3>
            <p className="intro" style={{ margin: "0 0 12px" }}>Download a copy of all the information we hold about your account (JSON).</p>
            <a href="/api/export/me" className="btn-ghost-app" style={{ display: "inline-block" }}>Download my data</a>
          </div>

          <form action={changePassword} style={{ marginBottom: 30 }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--plum)", margin: "0 0 12px" }}>Change Password</h3>
            <div className="field">
              <label>New password</label>
              <input type="password" name="password" minLength={6} placeholder="At least 6 characters" required />
            </div>
            <SubmitButton className="btn">Update password</SubmitButton>
          </form>

          <form action={deleteAccount}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#b91c1c", margin: "0 0 8px" }}>Delete Account</h3>
            <p className="intro">This permanently deletes your account and all your data. Type <strong>DELETE</strong> to confirm.</p>
            <div className="field">
              <input type="text" name="confirm" placeholder="DELETE" autoComplete="off" />
            </div>
            <button className="btn" style={{ background: "#b91c1c", boxShadow: "0 2px 0 #7f1d1d" }}>Delete my account</button>
          </form>
        </div>

        {/* Notifications */}
        <div className={`panel${tab === "notif" ? " show" : ""}`}>
          <h2>Notifications</h2>
          <p className="intro">Personalise your notification preferences at any time.</p>
          <form action={updateNotifications}>
            {NOTIF_GROUPS.map((g) => {
              const rows = g.rows.filter((r) => !r.audience || (r.audience === "artist") === isArtist);
              if (rows.length === 0) return null;
              return (
                <div className="ngroup" key={g.group}>
                  <h3>{g.group}</h3>
                  {rows.map((r) => (
                    <div className="nrow" key={r.key}>
                      <div className="nt">{r.nt}</div>
                      <div className="nd">{r.nd}</div>
                      <Toggle name={`notif_${r.key}`} defaultChecked={settings[r.key] ?? !!r.defaultOn} label="Email" />
                    </div>
                  ))}
                </div>
              );
            })}
            <SubmitButton className="btn">Save preferences</SubmitButton>
          </form>
        </div>
      </section>
    </div>
  );
}
