"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitReport, type ReportTarget } from "@/lib/data/reports";

const REASONS = [
  { v: "spam", l: "Spam or advertising" },
  { v: "offensive", l: "Offensive or inappropriate" },
  { v: "fake", l: "Fake or misleading" },
  { v: "harassment", l: "Harassment or abuse" },
  { v: "other", l: "Something else" },
];

/**
 * Small "Report" affordance + popover form. Works for an artist, studio, review
 * or message. Logged-out users are nudged to sign in.
 */
export function ReportButton({
  targetType,
  targetId,
  isLoggedIn,
  label = "Report",
  className = "report-link",
}: {
  targetType: ReportTarget;
  targetId: string;
  isLoggedIn: boolean;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function onTrigger() {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`);
      return;
    }
    setReason("");
    setDetails("");
    setState("idle");
    setErr("");
    setOpen(true);
  }

  async function send() {
    if (!reason) {
      setErr("Choose a reason.");
      return;
    }
    setState("sending");
    setErr("");
    const res = await submitReport({ targetType, targetId, reason, details });
    if (res.ok) {
      setState("done");
      setTimeout(() => setOpen(false), 1400);
    } else {
      setState("error");
      setErr(res.error ?? "Couldn't send. Try again.");
    }
  }

  return (
    <span className="report-wrap">
      <button type="button" onClick={onTrigger} className={className} aria-haspopup="dialog" aria-expanded={open}>
        {label}
      </button>
      {open && (
        <div className="report-overlay" onClick={() => setOpen(false)}>
          <div className="report-modal" role="dialog" aria-label="Report" onClick={(e) => e.stopPropagation()}>
          {state === "done" ? (
            <p className="report-done">Thanks - our team will review this.</p>
          ) : (
            <>
              <p className="report-title">What's wrong here?</p>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="report-select">
                <option value="">Choose a reason…</option>
                {REASONS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Add any detail (optional)"
                className="report-text"
                rows={2}
              />
              {err && <p className="report-err">{err}</p>}
              <div className="report-actions">
                <button type="button" className="report-cancel" onClick={() => setOpen(false)}>Cancel</button>
                <button type="button" className="report-send" onClick={send} disabled={state === "sending"}>
                  {state === "sending" ? "Sending…" : "Submit report"}
                </button>
              </div>
            </>
          )}
          </div>
        </div>
      )}
    </span>
  );
}
