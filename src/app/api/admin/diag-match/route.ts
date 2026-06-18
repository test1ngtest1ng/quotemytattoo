import { NextResponse } from "next/server";
import { getIsAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { artistMatchesRequest } from "@/lib/data/matching";

/**
 * TEMP diagnostic: admin-only. Replicates runMatching's read + write steps for
 * every live request and reports exactly what happens - how many artists are
 * fetched, how many qualify, and the precise error (if any) when writing the
 * request_matches rows. Also actually writes the matches, so it doubles as a
 * "re-run matching" repair for requests that were posted before an artist
 * existed (or that slipped through). Remove once matching is confirmed healthy.
 *
 *   GET /api/admin/diag-match            -> all live requests
 *   GET /api/admin/diag-match?id=<uuid>  -> one request
 */
export async function GET(request: Request) {
  if (!(await getIsAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const onlyId = searchParams.get("id");

  const admin = createAdminClient();

  let q = admin
    .from("tattoo_requests")
    .select("*")
    .eq("status", "live")
    .eq("removed", false);
  if (onlyId) q = q.eq("id", onlyId);
  const { data: reqs, error: reqErr } = await q;
  if (reqErr) return NextResponse.json({ step: "fetch_requests", error: reqErr.message }, { status: 500 });

  // Fetch qualifying artists once (same filter runMatching uses).
  const { data: artists, error: artErr } = await admin
    .from("artists")
    .select("id, display_name, location_area, travel_areas, styles, latitude, longitude, profile_id, profile_complete, available")
    .eq("profile_complete", true)
    .eq("available", true);

  const out: Record<string, unknown> = {
    artistsQueryError: artErr?.message ?? null,
    qualifyingArtists: (artists ?? []).map((a) => ({ id: a.id, name: a.display_name, area: a.location_area, lat: a.latitude, lng: a.longitude })),
    requests: [],
  };

  const results: unknown[] = [];
  for (const req of reqs ?? []) {
    const candidates = (artists ?? []).filter((a) => artistMatchesRequest(a, req));
    let writeError: string | null = null;
    let written = 0;
    if (candidates.length > 0) {
      const now = new Date().toISOString();
      const { data: ins, error: upErr } = await admin
        .from("request_matches")
        .upsert(
          candidates.map((a) => ({
            request_id: req.id,
            artist_id: a.id,
            matched_on: "location",
            notified_at: now,
            status: "notified" as const,
          })),
          { onConflict: "request_id,artist_id", ignoreDuplicates: true },
        )
        .select("artist_id");
      writeError = upErr?.message ?? null;
      written = ins?.length ?? 0;
    }
    results.push({
      id: req.id,
      title: req.title,
      location_area: req.location_area,
      latitude: req.latitude,
      longitude: req.longitude,
      style: req.style,
      candidateCount: candidates.length,
      candidates: candidates.map((a) => a.display_name),
      writeError,
      written,
    });
  }
  out.requests = results;

  return NextResponse.json(out, { status: 200 });
}
