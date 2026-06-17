"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "qmt-cookie-consent";

/** Lightweight cookie notice. We only set essential cookies today, so this is an
 *  acknowledgement banner; if non-essential cookies are added later, extend this
 *  with granular opt-in controls. */
export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* storage blocked - don't nag */
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(KEY, "essential");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 90,
        maxWidth: 560,
        margin: "0 auto",
        background: "#fff",
        border: "1px solid var(--color-line, #E7E1EE)",
        borderRadius: 14,
        boxShadow: "0 8px 30px rgba(20,10,28,.18)",
        padding: "16px 18px",
        display: "flex",
        gap: 14,
        alignItems: "center",
        flexWrap: "wrap",
        fontSize: 14,
        color: "#2A2233",
      }}
    >
      <p style={{ margin: 0, flex: "1 1 260px", lineHeight: 1.5 }}>
        We use essential cookies to keep you signed in and the site secure. See our{" "}
        <Link href="/cookies" style={{ color: "#6A2E96", fontWeight: 700 }}>Cookie Policy</Link>.
      </p>
      <button
        onClick={accept}
        style={{
          background: "#6A2E96",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "10px 20px",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Got it
      </button>
    </div>
  );
}
