"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Top toast shown after an automatic mode switch (e.g. clicking "Post a request"
 * while in artist mode flips you to customer mode). `switchMode` redirects with
 * `?switched=<mode>`; that's a soft (client) navigation, so we watch the param
 * reactively via useSearchParams rather than only on mount, then strip it.
 */
export function ModeToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const switched = params.get("switched");
  const [mode, setMode] = useState<"customer" | "artist" | null>(null);

  useEffect(() => {
    if (switched !== "customer" && switched !== "artist") return;
    setMode(switched);
    router.replace(pathname, { scroll: false }); // drop ?switched from the URL
    const t = setTimeout(() => setMode(null), 7000);
    return () => clearTimeout(t);
  }, [switched, pathname, router]);

  if (!mode) return null;
  const text =
    mode === "customer"
      ? "You're now in customer mode. Switch back to artist mode anytime with the toggle in the top bar."
      : "You're now in artist mode. Use the toggle in the top bar to switch back.";

  return (
    <div className="fixed left-1/2 top-4 z-[100] w-[min(92vw,460px)] -translate-x-1/2">
      <div className="flex items-start gap-3 rounded-[12px] border border-line bg-white px-4 py-3 shadow-[0_8px_30px_rgba(34,17,46,0.18)]">
        <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-violet/10 text-violet">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </span>
        <p className="flex-1 text-sm font-semibold text-ink">{text}</p>
        <button
          type="button"
          onClick={() => setMode(null)}
          aria-label="Dismiss"
          className="flex-none text-muted transition hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    </div>
  );
}
