// Diagnose why a request isn't matching an artist.
//   set -a && . ./.env.local && set +a && node scripts/diag-match.mjs
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: reqs } = await admin
  .from("tattoo_requests")
  .select("id, title, status, removed, expires_at, style, location_area, location_text, latitude, longitude, travel_radius_miles, customer_id, created_at")
  .order("created_at", { ascending: false })
  .limit(5);

console.log("\n=== Recent requests ===");
for (const r of reqs ?? []) {
  console.log(JSON.stringify(r, null, 2));
}

const { data: artists } = await admin
  .from("artists")
  .select("id, display_name, profile_complete, available, location_area, travel_areas, styles, latitude, longitude, profile_id")
  .limit(20);

console.log("\n=== Artists ===");
for (const a of artists ?? []) {
  console.log(JSON.stringify(a, null, 2));
}

const { data: matches } = await admin
  .from("request_matches")
  .select("request_id, artist_id, matched_on, status, notified_at")
  .order("notified_at", { ascending: false })
  .limit(20);

console.log("\n=== request_matches ===");
for (const m of matches ?? []) {
  console.log(JSON.stringify(m));
}
