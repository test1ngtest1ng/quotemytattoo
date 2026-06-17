"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSavedArtist } from "@/lib/data/saved";

/**
 * Heart toggle to save/unsave an artist. Optimistic; reconciles with the server
 * result. Logged-out users are sent to log in (then back where they were).
 */
export function SaveArtistButton({
  artistId,
  initialSaved,
  isLoggedIn,
  next,
  variant = "icon",
}: {
  artistId: string;
  initialSaved: boolean;
  isLoggedIn: boolean;
  next: string;
  variant?: "icon" | "labelled";
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setSaved((s) => !s); // optimistic
    start(async () => {
      try {
        const res = await toggleSavedArtist(artistId);
        setSaved(res);
      } catch {
        setSaved((s) => !s); // revert on failure
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Saved - tap to remove" : "Save artist"}
      title={saved ? "Saved" : "Save artist"}
      className={`save-btn${saved ? " on" : ""}${variant === "labelled" ? " labelled" : ""}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      {variant === "labelled" && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
