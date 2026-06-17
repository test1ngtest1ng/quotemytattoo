"use client";

import { useEffect, useRef, useState } from "react";
import { geocode } from "@/lib/geo";

type Suggestion = { value: string; label: string; sub?: string };

// Module-level cache shared across mounts: a query typed once is instant forever
// after (and prefixes the user already passed through never re-hit the network).
const cache = new Map<string, Suggestion[]>();

function parsePostcodes(json: { result?: unknown }): Suggestion[] {
  return (Array.isArray(json.result) ? json.result : []).map((pc) => ({
    value: String(pc),
    label: String(pc),
    sub: "Postcode",
  }));
}

function parsePlaces(json: { result?: unknown }): Suggestion[] {
  const seen = new Set<string>();
  return (Array.isArray(json.result) ? json.result : [])
    .map((p: Record<string, string | null>) => {
      const name = p.name_1 ?? "";
      const area = p.county_unitary || p.region || p.country || "";
      return { value: name, label: name, sub: [p.local_type, area].filter(Boolean).join(" · ") };
    })
    .filter((s: Suggestion) => {
      if (!s.value) return false;
      const key = `${s.value}|${s.sub}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * Predictive UK location field (free postcodes.io API).
 * - Type letters (e.g. "St Alb") -> suggests towns / cities / villages.
 * - Type something with a digit (e.g. "AL1") -> suggests matching postcodes.
 * Picking a suggestion fills the field with the chosen town or postcode.
 *
 * Snappy by design: results are cached in-memory, stale requests are aborted,
 * and the current list stays on screen while the next one loads (no flicker).
 */
export function LocationAutocomplete({
  value,
  onChange,
  onTown,
  id,
  name,
  className,
  placeholder = "e.g. St Albans, or AL1",
}: {
  value: string;
  onChange: (v: string) => void;
  /** Called with the resolved town when a postcode suggestion is picked. */
  onTown?: (town: string) => void;
  id?: string;
  name?: string;
  className?: string;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const interacted = useRef(false); // don't auto-open the list for a pre-filled value
  const justPicked = useRef(false);

  useEffect(() => {
    const q = value.trim();
    const key = q.toLowerCase();

    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }

    // Cache hit -> instant, no spinner, no network.
    if (cache.has(key)) {
      setSuggestions(cache.get(key)!);
      setOpen(interacted.current);
      setLoading(false);
      return;
    }

    const mine = ++seq.current;
    const controller = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      const isPostcode = /\d/.test(q); // a digit means they're typing a postcode
      const url = isPostcode
        ? `https://api.postcodes.io/postcodes/${encodeURIComponent(q)}/autocomplete`
        : `https://api.postcodes.io/places?q=${encodeURIComponent(q)}&limit=8`;
      try {
        const res = await fetch(url, { signal: controller.signal });
        const json = await res.json();
        const results = isPostcode ? parsePostcodes(json) : parsePlaces(json);
        cache.set(key, results);
        if (mine === seq.current) {
          setSuggestions(results);
          setOpen(interacted.current);
          setLoading(false);
        }
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return; // superseded
        if (mine === seq.current) setLoading(false); // keep last list on a real error
      }
    }, 120);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function pick(s: Suggestion) {
    justPicked.current = true;
    onChange(s.value);
    setSuggestions([]);
    setOpen(false);
    setLoading(false);
    // When a postcode is chosen, resolve its town so a separate town field can
    // be auto-filled.
    if (onTown && s.sub === "Postcode") {
      geocode(s.value).then((p) => {
        if (p?.area) onTown(p.area);
      });
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={className}
        onChange={(e) => { interacted.current = true; onChange(e.target.value); }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
      />
      {loading && (
        <span
          aria-hidden
          className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-line border-t-violet"
        />
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-[10px] border border-line bg-white shadow-lg">
          {suggestions.map((s) => (
            <li key={`${s.value}|${s.sub}`}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-violet/10"
              >
                <span className="text-sm font-semibold text-ink">{s.label}</span>
                {s.sub && <span className="shrink-0 text-xs text-muted">{s.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
