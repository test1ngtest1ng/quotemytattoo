// Backfill latitude/longitude for existing artists from their postcode/town.
// Run after applying 0005_geo.sql:
//   set -a && . ./.env.local && set +a && node scripts/backfill-geo.mjs
import { createClient } from "@supabase/supabase-js";

const API = "https://api.postcodes.io";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const isOutcode = (s) => /^[A-Z]{1,2}\d[A-Z\d]?$/.test(s);

async function getJson(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function geocode(query) {
  const q = (query || "").trim();
  if (q.length < 2) return null;
  if (/\d/.test(q)) {
    const pc = await getJson(`${API}/postcodes/${encodeURIComponent(q)}`);
    const r = pc?.result;
    if (r?.latitude != null) return { lat: r.latitude, lng: r.longitude };
    const out = q.split(/\s+/)[0].toUpperCase();
    if (isOutcode(out)) {
      const oc = await getJson(`${API}/outcodes/${encodeURIComponent(out)}`);
      const or = oc?.result;
      if (or?.latitude != null) return { lat: or.latitude, lng: or.longitude };
    }
    return null;
  }
  const places = await getJson(`${API}/places?q=${encodeURIComponent(q)}&limit=1`);
  const p = places?.result?.[0];
  return p?.latitude != null ? { lat: p.latitude, lng: p.longitude } : null;
}

const { data: artists, error } = await admin
  .from("artists")
  .select("id, display_name, location_postcode, location_area, latitude, longitude");
if (error) {
  console.error("query failed:", error.message);
  process.exit(1);
}

let updated = 0;
for (const a of artists ?? []) {
  if (a.latitude != null && a.longitude != null) continue;
  const point = await geocode(a.location_postcode || a.location_area || "");
  if (!point) {
    console.log(`  skip ${a.display_name} (no geocode for "${a.location_postcode || a.location_area}")`);
    continue;
  }
  const { error: upErr } = await admin
    .from("artists")
    .update({ latitude: point.lat, longitude: point.lng })
    .eq("id", a.id);
  if (upErr) console.log(`  FAIL ${a.display_name}: ${upErr.message}`);
  else {
    updated++;
    console.log(`  ✓ ${a.display_name} -> ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`);
  }
}
console.log(`Done. Updated ${updated} artist(s).`);

// Studios
const { data: studios } = await admin
  .from("studios")
  .select("id, name, location_postcode, location_area, latitude, longitude");
let su = 0;
for (const s of studios ?? []) {
  if (s.latitude != null && s.longitude != null) continue;
  const point = await geocode(s.location_postcode || s.location_area || "");
  if (!point) {
    console.log(`  skip studio ${s.name} (no geocode)`);
    continue;
  }
  const { error: upErr } = await admin
    .from("studios")
    .update({ latitude: point.lat, longitude: point.lng })
    .eq("id", s.id);
  if (upErr) console.log(`  FAIL studio ${s.name}: ${upErr.message}`);
  else {
    su++;
    console.log(`  ✓ studio ${s.name} -> ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`);
  }
}
console.log(`Done. Updated ${su} studio(s).`);
