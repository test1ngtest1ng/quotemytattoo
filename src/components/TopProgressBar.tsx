"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Slim top loading bar (GitHub/YouTube style). Replaces per-route skeletons:
 * on navigation the current page stays visible and this bar gives feedback,
 * which feels snappier than flashing a skeleton for a fraction of a second.
 *
 * - Starts trickling when an internal link is clicked (capture-phase listener).
 * - Completes when the route (pathname or query) actually changes.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTrickle = () => {
    if (trickle.current) {
      clearInterval(trickle.current);
      trickle.current = null;
    }
  };

  const start = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    stopTrickle();
    setVisible(true);
    setWidth(8);
    // Creep toward ~90% so it always feels alive, never quite finishing until
    // the route change lands.
    trickle.current = setInterval(() => {
      setWidth((w) => (w >= 90 ? w : w + Math.max(0.5, (90 - w) * 0.12)));
    }, 200);
  };

  // Finish whenever the route changes (skip the initial mount).
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    stopTrickle();
    setWidth(100);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 220);
  }, [pathname, searchParams]);

  // Detect navigation start from internal link clicks.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || a.target === "_blank" || a.hasAttribute("download")) return;
      try {
        const url = new URL(a.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
        start();
      } catch {
        /* ignore unparseable hrefs */
      }
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      stopTrickle();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: 3,
        width: `${width}%`,
        background: "var(--violet, #6A2E96)",
        boxShadow: "0 0 8px rgba(106,46,150,.6)",
        zIndex: 9999,
        opacity: visible ? 1 : 0,
        transition: "width .2s ease, opacity .25s ease",
        pointerEvents: "none",
      }}
    />
  );
}
