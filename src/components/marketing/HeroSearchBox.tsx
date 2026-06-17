"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/image";

/** Key the wizard reads on mount to pre-load the hero-selected image. */
export const PENDING_IMAGE_KEY = "qmt-pending-image";

export function HeroSearchBox() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const go = () => router.push("/new-request");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Compress first so it fits comfortably in sessionStorage, then carry it
      // into the wizard which seeds it as the first reference image.
      const small = await compressImage(file);
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = () => rej(r.error);
        r.readAsDataURL(small);
      });
      sessionStorage.setItem(PENDING_IMAGE_KEY, JSON.stringify({ name: small.name, type: small.type, dataUrl }));
    } catch {
      /* if it won't fit / fails, just continue to the wizard without it */
    }
    go();
  }

  return (
    <div
      className="searchbox"
      role="button"
      tabIndex={0}
      onClick={() => fileRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fileRef.current?.click();
        }
      }}
    >
      <span className="sb-ico">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4m0 0L8 8m4-4 4 4" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      </span>
      <input type="text" id="hero-idea" placeholder="Add a photo of the design you want" readOnly />
      <button
        className="arrow"
        aria-label="Continue"
        onClick={(e) => {
          e.stopPropagation();
          go();
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ display: "none" }} />
    </div>
  );
}
