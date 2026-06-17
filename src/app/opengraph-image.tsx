import { ImageResponse } from "next/og";

// Default social share card (1200×630) used for every route that doesn't set
// its own image. Generated at request time, so there's no binary asset to keep.
export const alt = "Quote My Tattoo - get quotes from tattoo artists near you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "linear-gradient(135deg, #4a1d6e 0%, #6a2e96 55%, #8a45b8 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 30 }}>
          <svg width="62" height="80" viewBox="0 0 100 130" aria-hidden="true">
            <path
              d="M50 6 C50 6 86 62 86 88 A36 36 0 1 1 14 88 C14 62 50 6 50 6 Z"
              fill="#ffffff"
            />
          </svg>
          <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1 }}>
            quotemytattoo<span style={{ opacity: 0.75 }}>.co.uk</span>
          </span>
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, maxWidth: 940 }}>
          Get quotes from tattoo artists near you
        </div>
        <div style={{ fontSize: 32, marginTop: 26, opacity: 0.92, maxWidth: 900 }}>
          Post your idea, compare reviewed artists, and book with confidence. Free to use.
        </div>
      </div>
    ),
    { ...size },
  );
}
