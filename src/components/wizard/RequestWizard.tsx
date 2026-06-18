"use client";

import { useEffect, useRef, useState } from "react";
import { BodyDiagram } from "@/components/wizard/BodyDiagram";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { LocationRadiusMap } from "@/components/LocationRadiusMap";
import { createRequest, submitGuestRequest } from "@/app/new-request/actions";
import { createClient } from "@/lib/supabase/client";
import { geocode } from "@/lib/geo";
import { compressImage } from "@/lib/image";
import { Honeypot } from "@/components/Honeypot";
import { PENDING_IMAGE_KEY } from "@/components/marketing/HeroSearchBox";
import { SIZE_OPTIONS } from "@/lib/constants";
import type { BodyView, Zone } from "@/lib/wizard";

type Placement = { id: string; label: string; view: BodyView } | null;

const ghostBtn =
  "rounded-[10px] px-4 py-3 font-semibold text-muted transition hover:text-ink";
const primaryBtn =
  "rounded-[10px] bg-violet px-6 py-3 font-semibold text-white shadow-[0_2px_0_var(--color-violet-dark)] transition hover:bg-violet-dark disabled:cursor-not-allowed disabled:opacity-50";
const fieldCls =
  "w-full rounded-[10px] border border-line px-4 py-3 outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/20";

export function RequestWizard({
  backHref = "/",
  loggedIn = false,
  defaultLoc = "",
  defaultRadius = 15,
  defaultCoords = null,
  targetArtist = null,
}: {
  backHref?: string;
  loggedIn?: boolean;
  defaultLoc?: string;
  defaultRadius?: number;
  defaultCoords?: { lat: number; lng: number } | null;
  targetArtist?: { id: string; name: string } | null;
}) {
  const [step, setStep] = useState(1);
  // When requesting from a specific artist, also broadcasting to others is opt-in.
  const [broadcast, setBroadcast] = useState(false);
  const targetFirstName = targetArtist ? targetArtist.name.split(" ")[0] : null;
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [view, setView] = useState<BodyView>("front");
  const [placement, setPlacement] = useState<Placement>(null);
  const [size, setSize] = useState<string | null>(null);
  const [loc, setLoc] = useState(defaultLoc);
  const [radius, setRadius] = useState(defaultRadius);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(defaultCoords);
  const [geocoding, setGeocoding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Guest inline-auth (final step for logged-out visitors).
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [acctName, setAcctName] = useState("");
  const [acctEmail, setAcctEmail] = useState("");
  const [acctPassword, setAcctPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pathsRef = useRef<HTMLInputElement>(null);
  const intentRef = useRef<HTMLInputElement>(null);
  const authSectionRef = useRef<HTMLElement>(null);

  // Keep the guest auth step in view when its error changes (the post-action
  // refresh can scroll the page back to the top).
  useEffect(() => {
    if (authError) {
      authSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [authError]);

  const canUpload = files.length > 0 || note.trim().length > 2;
  const canPlace = !!placement;
  const canFinish = !!size && loc.trim().length > 1;
  const hasAnyInput =
    files.length > 0 || note.trim().length > 0 || !!placement || !!size || loc.trim().length > 0;

  // Pre-load an image chosen from the homepage hero box (carried via sessionStorage).
  useEffect(() => {
    let cancelled = false;
    try {
      const raw = sessionStorage.getItem(PENDING_IMAGE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(PENDING_IMAGE_KEY);
      const { name, type, dataUrl } = JSON.parse(raw) as { name?: string; type?: string; dataUrl?: string };
      if (!dataUrl) return;
      fetch(dataUrl)
        .then((r) => r.blob())
        .then((blob) => {
          if (cancelled) return;
          const file = new File([blob], name || "design.webp", { type: type || blob.type });
          setFiles((prev) => (prev.length ? prev : [file]));
        })
        .catch(() => {});
    } catch {
      /* ignore */
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Geocode the typed/selected location (debounced) so we can centre the map
  // and do distance-based matching. Falls back to area matching if it fails.
  useEffect(() => {
    const q = loc.trim();
    if (q.length < 2) {
      setCoords(null);
      return;
    }
    let active = true;
    setGeocoding(true);
    const t = setTimeout(async () => {
      const point = await geocode(q);
      if (!active) return;
      setCoords(point ? { lat: point.lat, lng: point.lng } : null);
      setGeocoding(false);
    }, 350);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [loc]);

  // Upload images straight to Supabase Storage from the browser, then submit the
  // form carrying only the storage paths - keeps the Server Action body tiny
  // (it has a 1 MB limit, easily blown by phone photos). `intent` decides whether
  // the Server Action posts the request live or just saves it as a draft.
  async function uploadAndSubmit(intent: "post" | "draft") {
    if (busy) return;
    setBusy(true);
    setUploadError(null);
    try {
      const paths: string[] = [];
      if (files.length > 0) {
        const supabase = createClient();
        for (const original of files) {
          const file = await compressImage(original);
          const ext = file.type === "image/webp" ? "webp" : file.name.split(".").pop()?.toLowerCase() || "jpg";
          const path = `${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage
            .from("request-images")
            .upload(path, file, { contentType: file.type || undefined });
          if (error) throw error;
          paths.push(path);
        }
      }
      if (pathsRef.current) pathsRef.current.value = JSON.stringify(paths);
      if (intentRef.current) intentRef.current.value = intent;
      formRef.current?.requestSubmit();
    } catch (e) {
      setUploadError(
        e instanceof Error ? `Upload failed: ${e.message}` : "Upload failed. Please try again.",
      );
      setBusy(false);
    }
  }

  function handleFinish() {
    if (!canFinish) return;
    if (loggedIn) uploadAndSubmit("post");
    else setStep(4); // guests create an account / sign in on the final step
  }

  function handleSaveDraft() {
    if (!hasAnyInput) return;
    uploadAndSubmit("draft");
  }

  // Guest submit: compress images, build the payload from the form's hidden
  // inputs (incl. honeypot) + the inline auth fields, and post via the action.
  async function submitGuest() {
    if (busy) return;
    if (!acctEmail.trim() || !acctPassword) {
      setAuthError("Enter your email and password.");
      return;
    }
    if (authMode === "signup" && acctPassword.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setAuthError(null);
    try {
      const fd = new FormData(formRef.current ?? undefined);
      for (const original of files) {
        fd.append("images", await compressImage(original));
      }
      fd.set("auth_mode", authMode);
      fd.set("name", acctName);
      fd.set("email", acctEmail.trim());
      fd.set("password", acctPassword);
      const res = await submitGuestRequest(fd);
      if (res?.error) {
        setAuthError(res.error);
        setBusy(false);
      }
      // On success the action redirects.
    } catch (e) {
      // A successful action calls redirect()/notFound(), which surface as a
      // thrown control-flow signal (digest "NEXT_REDIRECT" / "NEXT_NOT_FOUND").
      // Re-throw those so Next performs the navigation instead of flashing them
      // as an error.
      if (
        e &&
        typeof e === "object" &&
        "digest" in e &&
        typeof (e as { digest?: unknown }).digest === "string" &&
        ((e as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
          (e as { digest: string }).digest === "NEXT_NOT_FOUND")
      ) {
        throw e;
      }
      setAuthError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} action={createRequest} className="mx-auto w-full max-w-xl">
      <Honeypot />
      {/* save as draft (logged-in only - a guest has no account to save to yet) */}
      {loggedIn && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={!hasAnyInput || busy}
            className="text-sm font-semibold text-muted transition hover:text-violet disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save as draft & exit"}
          </button>
        </div>
      )}

      {/* progress */}
      <div className="mb-6 flex gap-2">
        {Array.from({ length: loggedIn ? 3 : 4 }, (_, k) => k + 1).map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-violet" : "bg-line"}`}
          />
        ))}
      </div>

      {/* hidden inputs carrying wizard state */}
      <input type="hidden" name="placement_id" value={placement?.id ?? ""} />
      <input type="hidden" name="placement_view" value={placement?.view ?? ""} />
      <input type="hidden" name="size" value={size ?? ""} />
      <input type="hidden" name="note" value={note} />
      <input type="hidden" name="loc" value={loc} />
      <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
      <input type="hidden" name="longitude" value={coords?.lng ?? ""} />
      <input type="hidden" name="travel_radius_miles" value={radius} />
      <input ref={pathsRef} type="hidden" name="image_paths" defaultValue="[]" />
      <input ref={intentRef} type="hidden" name="intent" defaultValue="post" />
      <input type="hidden" name="target_artist_id" value={targetArtist?.id ?? ""} />
      <input type="hidden" name="broadcast" value={broadcast ? "true" : "false"} />

      {/* Targeted request: this goes to a specific artist the customer picked. */}
      {targetArtist && (
        <div className="mb-6 rounded-[12px] border border-violet/30 bg-violet/5 px-4 py-3">
          <p className="text-sm text-ink">
            Requesting a quote from <strong>{targetArtist.name}</strong>. They&apos;ll get your request directly.
          </p>
          <label className="mt-2 flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)} className="accent-violet" />
            Also send to other matching artists nearby
          </label>
        </div>
      )}

      {/* ---- Step 1: references ---- */}
      <section className={step === 1 ? "block" : "hidden"}>
        <p className="text-xs font-bold uppercase tracking-wider text-violet">Step 1 of 3</p>
        <h2 className="mt-1 text-2xl font-extrabold text-plum">Show us the tattoo you want</h2>
        <p className="mt-2 text-muted">
          Upload a design, a reference, or anything that captures the idea. The more the artists see,
          the more accurate your quotes.
        </p>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-5 flex w-full flex-col items-center gap-1 rounded-[14px] border-2 border-dashed border-line bg-[#faf8fc] px-6 py-8 text-center transition hover:border-violet"
        >
          <span className="font-bold text-ink">Add a photo of your design or reference</span>
          <span className="text-xs text-muted">A sketch, screenshot, Pinterest save or photo.</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
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

        <div className="mt-5">
          <label htmlFor="note-input" className="text-sm font-semibold">
            Anything to add? <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="note-input"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. keep it black & grey, or open to the artist's take"
            className="mt-1.5 w-full rounded-[10px] border border-line px-4 py-3 outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/20"
          />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <a href={backHref} className={ghostBtn}>← Back</a>
          <button type="button" disabled={!canUpload} onClick={() => setStep(2)} className={primaryBtn}>
            Continue
          </button>
        </div>
      </section>

      {/* ---- Step 2: placement ---- */}
      <section className={step === 2 ? "block" : "hidden"}>
        <p className="text-xs font-bold uppercase tracking-wider text-violet">Step 2 of 3</p>
        <h2 className="mt-1 text-2xl font-extrabold text-plum">Where on your body?</h2>
        <p className="mt-2 text-muted">Tap the spot. Don&apos;t worry about being exact.</p>

        <div className="mt-4 inline-flex rounded-[10px] border border-line p-1">
          {(["front", "back"] as BodyView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-[8px] px-5 py-1.5 text-sm font-semibold capitalize transition ${
                view === v ? "bg-violet text-white" : "text-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="mt-2">
          <BodyDiagram
            view={view}
            selected={placement ? { id: placement.id, view: placement.view } : null}
            onSelect={(z: Zone, v: BodyView) => setPlacement({ id: z.id, label: z.label, view: v })}
          />
        </div>

        <div className="rounded-[14px] bg-trust/10 px-4 py-3 text-sm font-semibold text-trust">
          {placement ? (
            <>
              <strong className="block text-lg text-plum">{placement.label}</strong>
              {placement.view === "back" ? "Back view" : "Front view"} · tap another spot to change
            </>
          ) : (
            <span className="font-medium text-muted">
              No spot chosen yet. Tap anywhere on the figure to place your tattoo.
            </span>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button type="button" onClick={() => setStep(1)} className={ghostBtn}>← Back</button>
          <button type="button" disabled={!canPlace} onClick={() => setStep(3)} className={primaryBtn}>
            Continue
          </button>
        </div>
      </section>

      {/* ---- Step 3: size + location ---- */}
      <section className={step === 3 ? "block" : "hidden"}>
        <p className="text-xs font-bold uppercase tracking-wider text-violet">Step 3 of 3</p>
        <h2 className="mt-1 text-2xl font-extrabold text-plum">How big, and where are you?</h2>
        <p className="mt-2 text-muted">
          Roughly how big, and your area so we can match local artists.
        </p>

        <div className="mt-5">
          <label className="text-sm font-semibold">Roughly how big?</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {SIZE_OPTIONS.map((sz) => (
              <button
                key={sz.value}
                type="button"
                onClick={() => setSize(sz.value)}
                className={`rounded-[10px] border px-4 py-2.5 text-left transition ${
                  size === sz.value
                    ? "border-violet bg-violet/5"
                    : "border-line hover:border-violet"
                }`}
              >
                <span className="block font-bold text-plum">{sz.label}</span>
                <span className="block text-xs text-muted">{sz.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="loc-input" className="text-sm font-semibold">Your town or postcode</label>
          <div className="mt-1.5">
            <LocationAutocomplete
              id="loc-input"
              value={loc}
              onChange={setLoc}
              placeholder="e.g. St Albans, or AL1"
              className="w-full rounded-[10px] border border-line px-4 py-3 pr-10 outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/20"
            />
          </div>
        </div>

        {/* Travel radius */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="radius-input" className="text-sm font-semibold">How far will you travel?</label>
            <span className="text-sm font-bold text-violet">{radius} miles</span>
          </div>
          <input
            id="radius-input"
            type="range"
            min={1}
            max={100}
            step={1}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="mt-2 w-full accent-violet"
          />
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>1 mi</span>
            <span>100 mi</span>
          </div>

          <div className="mt-3">
            {coords ? (
              <LocationRadiusMap lat={coords.lat} lng={coords.lng} radiusMiles={radius} />
            ) : (
              <div className="flex h-56 w-full items-center justify-center rounded-[12px] border border-dashed border-line bg-[#faf8fc] px-6 text-center text-sm text-muted">
                {geocoding && loc.trim().length > 1
                  ? "Finding your area…"
                  : "Enter your town or postcode above to see your search area on the map."}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button type="button" onClick={() => setStep(2)} className={ghostBtn}>← Back</button>
          <button
            type="button"
            onClick={handleFinish}
            disabled={!canFinish || busy}
            className={primaryBtn + " disabled:opacity-50"}
          >
            {busy
              ? "Sending…"
              : !loggedIn
              ? "Continue"
              : targetFirstName && !broadcast
              ? `Send to ${targetFirstName}`
              : "Get my free quotes"}
          </button>
        </div>
        {uploadError && (
          <p className="mt-2 text-right text-xs text-red-600">{uploadError}</p>
        )}
        {!canFinish && !uploadError && (
          <p className="mt-2 text-right text-xs text-muted">Pick a size and enter your area to continue.</p>
        )}
      </section>

      {/* ---- Step 4 (guests only): create account / sign in, then post ---- */}
      {!loggedIn && (
        <section ref={authSectionRef} className={step === 4 ? "block" : "hidden"}>
          <p className="text-xs font-bold uppercase tracking-wider text-violet">Last step</p>
          <h2 className="mt-1 text-2xl font-extrabold text-plum">Almost there - where do we send your quotes?</h2>
          <p className="mt-2 text-muted">
            {authMode === "signup"
              ? "Create a free account to post your request. Your quotes arrive in your dashboard and inbox."
              : "Sign in to post your request."}
          </p>

          <div className="mt-5 space-y-3">
            {authMode === "signup" && (
              <input value={acctName} onChange={(e) => setAcctName(e.target.value)} placeholder="Your name" autoComplete="name" className={fieldCls} />
            )}
            <input value={acctEmail} onChange={(e) => setAcctEmail(e.target.value)} type="email" placeholder="Email" autoComplete="email" className={fieldCls} />
            <input
              value={acctPassword}
              onChange={(e) => setAcctPassword(e.target.value)}
              type="password"
              placeholder={authMode === "signup" ? "Create a password (6+ characters)" : "Password"}
              autoComplete={authMode === "signup" ? "new-password" : "current-password"}
              className={fieldCls}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setAuthMode((m) => (m === "signup" ? "signin" : "signup"));
              setAuthError(null);
            }}
            className="mt-3 text-sm font-semibold text-violet"
          >
            {authMode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>

          {authError && <p className="mt-3 text-sm text-red-600">{authError}</p>}

          <div className="mt-6 flex items-center justify-between">
            <button type="button" onClick={() => setStep(3)} className={ghostBtn}>← Back</button>
            <button type="button" onClick={submitGuest} disabled={busy} className={primaryBtn}>
              {busy ? "Posting…" : authMode === "signup" ? "Create account & post" : "Sign in & post"}
            </button>
          </div>
          <p className="mt-3 text-xs text-muted">
            By continuing you agree to our <a href="/terms" className="underline">Terms</a> and{" "}
            <a href="/privacy" className="underline">Privacy policy</a>.
          </p>
        </section>
      )}
    </form>
  );
}
