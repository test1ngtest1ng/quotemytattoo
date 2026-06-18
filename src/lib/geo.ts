/**
 * Lightweight UK geocoding via the free postcodes.io API. Works in both the
 * browser and on the server (uses global fetch). Resolves a full postcode,
 * an outcode (e.g. "E1"), or a town/place name to coordinates.
 */

export type GeoPoint = { lat: number; lng: number; area: string | null };

const API = "https://api.postcodes.io";

async function getJson(
  url: string,
  headers?: Record<string, string>,
): Promise<{ result?: unknown } | null> {
  try {
    const res = await fetch(url, headers ? { headers } : undefined);
    if (!res.ok) return null;
    return (await res.json()) as { result?: unknown };
  } catch {
    return null;
  }
}

const isOutcode = (s: string) => /^[A-Z]{1,2}\d[A-Z\d]?$/.test(s);

export async function geocode(query: string): Promise<GeoPoint | null> {
  const q = query.trim();
  if (q.length < 2) return null;

  const looksPostcode = /\d/.test(q);

  if (looksPostcode) {
    // Try the full postcode first.
    const pc = await getJson(`${API}/postcodes/${encodeURIComponent(q)}`);
    const r = pc?.result as
      | { latitude?: number; longitude?: number; admin_district?: string }
      | undefined;
    if (r?.latitude != null && r?.longitude != null) {
      return { lat: r.latitude, lng: r.longitude, area: r.admin_district ?? null };
    }
    // Fall back to the outcode (first token, e.g. "E1" from "E1 8NT").
    const out = q.split(/\s+/)[0].toUpperCase();
    if (isOutcode(out)) {
      const oc = await getJson(`${API}/outcodes/${encodeURIComponent(out)}`);
      const or = oc?.result as
        | { latitude?: number; longitude?: number; admin_district?: string[] }
        | undefined;
      if (or?.latitude != null && or?.longitude != null) {
        return { lat: or.latitude, lng: or.longitude, area: or.admin_district?.[0] ?? null };
      }
    }
    return null;
  }

  // Town / place name. Prefer Nominatim (OpenStreetMap): it ranks results by
  // "importance", so an ambiguous name like "Romford" resolves to the well-known
  // town (Greater London) rather than a tiny hamlet that postcodes.io's /places
  // happens to return first (e.g. Romford, Dorset). Fall back to postcodes.io.
  const nominatim = await getJson(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=gb&format=json&limit=1`,
    { "User-Agent": "QuoteMyTattoo/1.0 (https://quotemytattoo.co.uk)" },
  );
  const nArr = nominatim as unknown as
    | Array<{ lat?: string; lon?: string; display_name?: string }>
    | null;
  const np = Array.isArray(nArr) ? nArr[0] : undefined;
  if (np?.lat && np?.lon) {
    const lat = parseFloat(np.lat);
    const lng = parseFloat(np.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const area = np.display_name?.split(",")[0]?.trim() || null;
      return { lat, lng, area };
    }
  }

  // Fallback: postcodes.io places.
  const places = await getJson(`${API}/places?q=${encodeURIComponent(q)}&limit=1`);
  const arr = places?.result as
    | Array<{ latitude?: number; longitude?: number; name_1?: string; county_unitary?: string }>
    | undefined;
  const p = arr?.[0];
  if (p?.latitude != null && p?.longitude != null) {
    return { lat: p.latitude, lng: p.longitude, area: p.name_1 ?? p.county_unitary ?? null };
  }
  return null;
}

/** Great-circle distance in miles between two lat/lng points. */
export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export const MILES_TO_METERS = 1609.344;

/**
 * The outward part of a UK postcode (the bit before the space, e.g. "E1" from
 * "E1 8NT", "SW1A" from "SW1A 1AA"). The inward code is always the final 3
 * characters, so we strip those. Returns null for empty input.
 */
export function outwardCode(postcode: string | null | undefined): string | null {
  const compact = (postcode ?? "").toUpperCase().replace(/\s+/g, "");
  if (!compact) return null;
  return compact.length <= 3 ? compact : compact.slice(0, compact.length - 3);
}

/**
 * A location string safe to show publicly / pre-acceptance. If the value looks
 * like a full postcode (ends in the inward "digit + 2 letters" pattern) it's
 * reduced to its outward code; otherwise (a town name, or already an outward
 * code) it's returned as-is.
 */
export function publicArea(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  if (/\d[A-Z]{2}$/i.test(s.replace(/\s+/g, ""))) return outwardCode(s);
  return s;
}

/** "Town, OUTWARD" for public display, dropping blanks. */
export function publicLocation(
  area: string | null | undefined,
  postcode: string | null | undefined,
): string | null {
  const out = outwardCode(postcode);
  return [publicArea(area), out].filter(Boolean).join(", ") || null;
}
