"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px", background: "#faf8fc" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#311A41", margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#736B7E", marginTop: 8, maxWidth: 360 }}>
            Sorry, an unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{ marginTop: 24, background: "#6A2E96", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
