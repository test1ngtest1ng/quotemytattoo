"use client";

import { useState } from "react";

/** Clickable 1-5 star rating. Writes the chosen value to a hidden input named
 *  `name` so it submits with a plain server-action form. */
export function StarRating({ name, defaultValue = 5 }: { name: string; defaultValue?: number }) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div role="radiogroup" aria-label="Your rating" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <input type="hidden" name={name} value={value} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          aria-pressed={n === value}
          onClick={() => setValue(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{ background: "none", border: "none", padding: 2, cursor: "pointer", lineHeight: 0 }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill={n <= active ? "#FFB400" : "none"}
            stroke={n <= active ? "#FFB400" : "#C9BFD6"}
            strokeWidth="1.5"
            strokeLinejoin="round"
          >
            <path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z" />
          </svg>
        </button>
      ))}
      <span style={{ marginLeft: 4, fontWeight: 700, color: "var(--muted)", fontSize: 14 }}>{active}/5</span>
    </div>
  );
}
