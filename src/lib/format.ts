/** Capitalise the first letter of each word. Use for system-generated labels
 *  (e.g. request titles like "medium piece, chest" -> "Medium Piece, Chest").
 *  Safe only on machine-generated text, not arbitrary user prose. */
export function titleCase(s: string | null | undefined): string {
  return (s ?? "").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Words kept lowercase in editorial title case (unless first/last word).
const SMALL_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into",
  "nor", "of", "on", "onto", "or", "per", "the", "to", "via", "vs", "with",
]);

/** Editorial Title Case for UI chrome (buttons, nav, menus): capitalise each
 *  word EXCEPT small joining words (a, an, the, of, to, in, on, as...), while
 *  always capitalising the first and last word. e.g. "Sign up as an artist" ->
 *  "Sign Up as an Artist", "Get in touch" -> "Get in Touch", "Log in" -> "Log
 *  In". Presentation only - keep the source text natural; pass it through here at
 *  render. Leaves already-cased words (acronyms) intact. */
export function toTitleCase(s: string | null | undefined): string {
  const words = (s ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words
    .map((w, i) => {
      const isEdge = i === 0 || i === words.length - 1;
      if (!isEdge && SMALL_WORDS.has(w.toLowerCase())) return w.toLowerCase();
      // Capitalise the first letter, leave the rest as-authored (keeps acronyms).
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

/** A soft "recently active" signal for artist cards/profiles. Returns null when
 *  there's no timestamp or it's older than a week, so stale artists show nothing
 *  rather than a misleading badge. Deliberately coarse (today / this week). */
export function lastActiveLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const hours = (Date.now() - then) / 3_600_000;
  if (hours < 0) return null;
  if (hours < 24) return "Active today";
  if (hours < 24 * 7) return "Active this week";
  return null;
}
