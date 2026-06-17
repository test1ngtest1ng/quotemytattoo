import { switchMode } from "@/lib/data/mode";

/**
 * Header pill that shows the current mode and switches to the other one.
 * Server component - submits the `switchMode` action (sets a cookie + redirects).
 */
export function ModeSwitch({ mode }: { mode: "artist" | "customer" }) {
  const isArtist = mode === "artist";
  const target = isArtist ? "customer" : "artist";

  return (
    <form action={switchMode}>
      <input type="hidden" name="mode" value={target} />
      <button
        type="submit"
        title={`Switch to ${target} mode`}
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
          isArtist
            ? "border-white/25 text-white hover:bg-white/10"
            : "border-line text-ink hover:border-violet hover:text-violet"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${isArtist ? "bg-white" : "bg-violet"}`}
          aria-hidden
        />
        <span>{isArtist ? "Artist Mode" : "Customer Mode"}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
          <path d="M7 16l-4-4 4-4" /><path d="M3 12h13" /><path d="M17 8l4 4-4 4" /><path d="M21 12H8" />
        </svg>
      </button>
    </form>
  );
}
