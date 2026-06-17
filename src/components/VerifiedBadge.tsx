/** Trust badge shown next to verified artists (granted manually by an admin). */
export function VerifiedBadge({ label = true }: { label?: boolean }) {
  return (
    <span
      title="Verified by Quote My Tattoo"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "rgba(0,182,122,.12)",
        color: "var(--trust, #00B67A)",
        fontWeight: 800,
        fontSize: 12,
        padding: label ? "3px 9px" : "3px",
        borderRadius: 999,
        lineHeight: 1,
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 12.5l2.5 2.5 4.5-5" />
      </svg>
      {label && "Verified"}
    </span>
  );
}
