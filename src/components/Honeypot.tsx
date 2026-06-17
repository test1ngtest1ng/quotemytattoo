"use client";

import { useEffect, useRef } from "react";
import { HONEYPOT_FIELD, HONEYPOT_TS } from "@/lib/antispam-fields";

/** Invisible anti-spam fields. Renders a honeypot text input (off-screen, hidden
 *  from assistive tech, never tab-focusable) that bots tend to fill, plus a
 *  timestamp set on load so the server can reject implausibly fast submits.
 *  Real users never see or interact with either. Drop inside any <form>. */
export function Honeypot() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.value = String(Date.now());
  }, []);

  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Leave this field empty
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
      <input ref={ref} type="hidden" name={HONEYPOT_TS} defaultValue="" />
    </div>
  );
}
