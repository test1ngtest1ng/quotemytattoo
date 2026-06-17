import { headers } from "next/headers";
import { HONEYPOT_FIELD, HONEYPOT_TS, MIN_FILL_MS } from "@/lib/antispam-fields";

/** Anti-spam: invisible to real users (no CAPTCHA / no extra steps).
 *  Three free layers:
 *   1. Honeypot - a hidden field bots fill but humans never see.
 *   2. Timing - reject submissions made implausibly fast after the form loaded.
 *   3. Best-effort IP rate limit - a soft per-instance cap.
 *  Stronger distributed limiting (DB-backed) or Cloudflare Turnstile are future
 *  steps if these prove insufficient. This module imports next/headers, so it is
 *  server-only - client forms use <Honeypot> + @/lib/antispam-fields instead. */

/** True when a submission looks automated (honeypot filled, or submitted too
 *  fast). Callers should fail with a generic message - never reveal the trap. */
export function looksLikeSpam(formData: FormData): boolean {
  if (String(formData.get(HONEYPOT_FIELD) ?? "").trim() !== "") return true;

  const ts = parseInt(String(formData.get(HONEYPOT_TS) ?? ""), 10);
  if (Number.isFinite(ts) && ts > 0) {
    const elapsed = Date.now() - ts;
    if (elapsed >= 0 && elapsed < MIN_FILL_MS) return true;
  }
  return false;
}

// In-memory sliding-window counter. On serverless this is per-instance (resets
// on cold start, varies across instances) - a soft layer, not a hard guarantee.
const hits = new Map<string, number[]>();

/** Returns true when `key` has exceeded `max` events in the last `windowMs`. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);

  // Opportunistic cleanup so the map can't grow unbounded.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    }
  }
  return recent.length > max;
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}
