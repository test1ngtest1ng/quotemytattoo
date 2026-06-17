"use client";

import { useState } from "react";
import Image from "next/image";

/** Portfolio grid with a click-to-zoom lightbox for the public artist profile.
 *  Thumbnails use next/image (LCP/SEO); the lightbox keeps a plain <img> since
 *  it's an on-demand modal of the full-size original. */
export function ProfileGallery({ images }: { images: string[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  if (images.length === 0) return <p className="ap-empty">No portfolio images yet.</p>;

  return (
    <>
      <div className="ap-gallery">
        {images.map((url, i) => (
          <button key={i} className="ap-gt" type="button" onClick={() => setLightbox(url)}>
            <Image src={url} alt="Tattoo portfolio piece" fill sizes="(max-width: 700px) 45vw, 200px" style={{ objectFit: "cover" }} />
          </button>
        ))}
      </div>
      {lightbox && (
        <div className="ap-lb" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Portfolio piece, full size" />
        </div>
      )}
    </>
  );
}
