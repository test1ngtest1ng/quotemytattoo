"use client";

import { useRef, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { compressToFileList } from "@/lib/image";
import { createArtistProfile } from "@/lib/data/artist";
import { TATTOO_STYLES, MAX_ARTIST_STYLES, TRUST_BADGES } from "@/lib/constants";

const STEPS = ["Your styles", "Location", "Credentials", "Profile", "Founding Member"];

const input =
  "w-full rounded-[10px] border border-line px-4 py-3 outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/20";
const ghostBtn = "rounded-[10px] px-4 py-3 font-semibold text-muted transition hover:text-ink";
const primaryBtn =
  "rounded-[10px] bg-violet px-6 py-3 font-semibold text-white shadow-[0_2px_0_var(--color-violet-dark)] transition hover:bg-violet-dark disabled:cursor-not-allowed disabled:opacity-50";

export function ArtistOnboarding({ defaultName = "" }: { defaultName?: string }) {
  const [step, setStep] = useState(0);
  const [styles, setStyles] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState(defaultName);
  const [businessName, setBusinessName] = useState("");
  const [area, setArea] = useState("");
  const [postcode, setPostcode] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [badges, setBadges] = useState<Record<string, boolean>>({});
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleStyle = (s: string) =>
    setStyles((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : cur.length < MAX_ARTIST_STYLES ? [...cur, s] : cur,
    );

  const canStyles = styles.length > 0;
  const canLocation = displayName.trim().length > 1 && area.trim().length > 1;

  return (
    <form action={createArtistProfile} className="mx-auto w-full max-w-xl">
      {/* progress */}
      <div className="mb-2 flex gap-1.5">
        {STEPS.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-violet" : "bg-line"}`} />
        ))}
      </div>
      <p className="mb-6 text-xs font-semibold text-muted">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>

      {/* hidden state */}
      <input type="hidden" name="styles" value={JSON.stringify(styles)} />
      <input type="hidden" name="display_name" value={displayName} />
      <input type="hidden" name="business_name" value={businessName} />
      <input type="hidden" name="location_area" value={area} />
      <input type="hidden" name="location_postcode" value={postcode} />
      <input type="hidden" name="address_line" value={addressLine} />
      <input type="hidden" name="travel_areas" value="" />
      <input type="hidden" name="bio" value={bio} />
      <input type="hidden" name="instagram_url" value={instagram} />
      <input type="hidden" name="tiktok_url" value={tiktok} />
      {TRUST_BADGES.map((b) => (
        <input key={b.key} type="hidden" name={b.key} value={badges[b.key] ? "true" : "false"} />
      ))}

      {/* Step 1 - styles */}
      <section className={step === 0 ? "block" : "hidden"}>
        <h2 className="text-2xl font-extrabold text-plum">What do you tattoo?</h2>
        <p className="mt-2 text-muted">Pick up to {MAX_ARTIST_STYLES} styles. We use these to send you matching leads. Your first pick is your primary style.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {TATTOO_STYLES.map((s) => {
            const on = styles.includes(s);
            return (
              <button
                type="button"
                key={s}
                onClick={() => toggleStyle(s)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  on ? "border-violet bg-violet text-white" : "border-line text-ink hover:border-violet"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">{styles.length}/{MAX_ARTIST_STYLES} selected</p>
        <div className="mt-6 flex justify-end">
          <button type="button" disabled={!canStyles} onClick={() => setStep(1)} className={primaryBtn}>Continue</button>
        </div>
      </section>

      {/* Step 2 - location */}
      <section className={step === 1 ? "block" : "hidden"}>
        <h2 className="text-2xl font-extrabold text-plum">Your Details &amp; Location</h2>
        <p className="mt-2 text-muted">This is how customers find and contact you.</p>
        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-semibold">Your name</label>
            <input className={input + " mt-1.5"} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Mara Whitlock" />
          </div>
          <div>
            <label className="text-sm font-semibold">Business / trading name <span className="font-normal text-muted">(optional)</span></label>
            <input className={input + " mt-1.5"} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Mara Voss Ink - leave blank to use your name" />
          </div>
          <div>
            <label className="text-sm font-semibold">Postcode <span className="font-normal text-muted">(start typing to search)</span></label>
            <LocationAutocomplete
              className={input + " mt-1.5 pr-10"}
              value={postcode}
              onChange={setPostcode}
              onTown={(t) => setArea(t)}
              placeholder="e.g. E1 6QL"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Town / city</label>
            <LocationAutocomplete
              className={input + " mt-1.5 pr-10"}
              value={area}
              onChange={setArea}
              placeholder="e.g. London - fills in from your postcode"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Studio / work address <span className="font-normal text-muted">(shown to a customer only after they book you)</span></label>
            <input className={input + " mt-1.5"} value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="e.g. 12 Redchurch Street" />
          </div>
        </div>
        <div className="mt-6 flex justify-between">
          <button type="button" onClick={() => setStep(0)} className={ghostBtn}>← Back</button>
          <button type="button" disabled={!canLocation} onClick={() => setStep(2)} className={primaryBtn}>Continue</button>
        </div>
      </section>

      {/* Step 3 - credentials */}
      <section className={step === 2 ? "block" : "hidden"}>
        <h2 className="text-2xl font-extrabold text-plum">Credentials &amp; Safety</h2>
        <p className="mt-2 text-muted">Tick what applies - each shows as a trust badge on your profile. You can be asked to verify these later.</p>
        <div className="mt-5 space-y-3">
          {TRUST_BADGES.map((b) => (
            <label key={b.key} className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-line px-4 py-3 hover:border-violet">
              <input
                type="checkbox"
                checked={!!badges[b.key]}
                onChange={(e) => setBadges((c) => ({ ...c, [b.key]: e.target.checked }))}
                className="h-5 w-5 accent-violet"
              />
              <span className="font-semibold text-ink">{b.label}</span>
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-between">
          <button type="button" onClick={() => setStep(1)} className={ghostBtn}>← Back</button>
          <button type="button" onClick={() => setStep(3)} className={primaryBtn}>Continue</button>
        </div>
      </section>

      {/* Step 4 - profile */}
      <section className={step === 3 ? "block" : "hidden"}>
        <h2 className="text-2xl font-extrabold text-plum">Your Profile</h2>
        <p className="mt-2 text-muted">Add a short bio, your socials and a few portfolio images (up to 10). All optional, but a fuller profile wins more work.</p>
        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-semibold">Bio</label>
            <textarea className={input + " mt-1.5 min-h-[90px]"} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell customers about your style and experience." />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Instagram URL</label>
              <input className={input + " mt-1.5"} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/you" />
            </div>
            <div>
              <label className="text-sm font-semibold">TikTok URL</label>
              <input className={input + " mt-1.5"} value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="https://tiktok.com/@you" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold">Portfolio images</label>
            <button type="button" onClick={() => fileRef.current?.click()} className="mt-1.5 flex w-full flex-col items-center gap-1 rounded-[14px] border-2 border-dashed border-line bg-[#faf8fc] px-6 py-6 text-center hover:border-violet">
              <span className="font-bold text-ink">Add portfolio photos</span>
              <span className="text-xs text-muted">Up to 10 images of your work</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              name="portfolio"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const input = e.currentTarget;
                const picked = Array.from(input.files ?? []).slice(0, 10);
                setFiles(picked); // show previews right away
                // Compress to WebP in the browser so the submitted files are smaller.
                const compressed = await compressToFileList(picked);
                if (compressed) input.files = compressed;
              }}
            />
            {files.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="h-16 w-16 overflow-hidden rounded-lg border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-between">
          <button type="button" onClick={() => setStep(2)} className={ghostBtn}>← Back</button>
          <button type="button" onClick={() => setStep(4)} className={primaryBtn}>Continue</button>
        </div>
      </section>

      {/* Step 5 - founding member */}
      <section className={step === 4 ? "block" : "hidden"}>
        <div className="rounded-[14px] border border-violet/30 bg-violet/5 p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-violet">Founding Member</p>
          <h2 className="mt-1 text-2xl font-extrabold text-plum">You&rsquo;re in - free during launch 🎉</h2>
          <p className="mt-3 text-muted">
            Quote My Tattoo is <strong>free for artists during launch</strong>. Finish now and you&rsquo;ll
            be a <strong>Founding Member</strong> - locking in 50% off for life <em>if and when</em> paid
            memberships are ever introduced. No card needed, no commitment.
          </p>
        </div>
        <div className="mt-6 flex justify-between">
          <button type="button" onClick={() => setStep(3)} className={ghostBtn}>← Back</button>
          <SubmitButton className={primaryBtn} pendingText="Finishing…">Finish &amp; go live</SubmitButton>
        </div>
      </section>
    </form>
  );
}
