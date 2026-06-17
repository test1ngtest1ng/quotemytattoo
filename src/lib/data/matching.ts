import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, leadEmail, escapeHtml } from "@/lib/email/resend";
import { emailAllowed } from "@/lib/notification-prefs";
import { haversineMiles } from "@/lib/geo";
import { zoneLabel } from "@/lib/wizard";
import { SIZE_OPTIONS } from "@/lib/constants";
import { SITE_URL as SITE } from "@/lib/site";

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

function areaMatches(reqArea: string, artistArea: string, travel: string[]): boolean {
  if (!reqArea) return false;
  const a = norm(artistArea);
  if (a && (a.includes(reqArea) || reqArea.includes(a))) return true;
  return (travel ?? []).some((t) => {
    const tn = norm(t);
    return tn && (tn.includes(reqArea) || reqArea.includes(tn));
  });
}

type MatchArtist = {
  styles: string[] | null;
  location_area: string | null;
  travel_areas: string[] | null;
  latitude: number | null;
  longitude: number | null;
};
type MatchRequest = {
  location_area: string | null;
  location_text?: string | null;
  style: string | null;
  travel_radius_miles: number | null;
  latitude: number | null;
  longitude: number | null;
};

/** Single source of truth for "does this artist match this request" - used both
 *  forward (request -> artists, runMatching) and reverse (new artist -> open
 *  requests, matchOpenRequestsToArtist) so the two can't drift apart. */
export function artistMatchesRequest(a: MatchArtist, req: MatchRequest): boolean {
  const reqArea = norm(req.location_area || req.location_text);
  const reqStyle = norm(req.style);
  const radiusMiles = req.travel_radius_miles ?? 15;
  const hasReqCoords = typeof req.latitude === "number" && typeof req.longitude === "number";

  const styleOk = reqStyle ? (a.styles ?? []).map(norm).includes(reqStyle) : true;
  if (!styleOk) return false;

  // Distance-based: the artist's studio is within the customer's travel radius.
  if (hasReqCoords && typeof a.latitude === "number" && typeof a.longitude === "number") {
    if (haversineMiles(req.latitude as number, req.longitude as number, a.latitude, a.longitude) <= radiusMiles) return true;
  }
  // Fallback to area-name overlap (artist or request not geocoded, or the artist
  // lists the customer's area as a travel/guest-spot area).
  if (reqArea) return areaMatches(reqArea, a.location_area ?? "", a.travel_areas ?? []);
  // No location signal at all: match on style (or everyone if no style either).
  return true;
}

/**
 * Matches a live request to artists by location (and style if the request
 * specifies one), records request_matches, and emails matched artists.
 * Uses the admin client (bypasses RLS) - server-only.
 */
export async function runMatching(
  requestId: string,
  opts: { targetArtistId?: string | null; broadcast?: boolean } = {},
): Promise<{ matched: number }> {
  const admin = createAdminClient();

  const { data: req } = await admin
    .from("tattoo_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (!req) return { matched: 0 };
  // Only match live, non-removed, non-expired requests (defence-in-depth).
  const expired = req.expires_at && new Date(req.expires_at) < new Date();
  if (req.status !== "live" || req.removed || expired) return { matched: 0 };

  const reqStyle = norm(req.style);

  // Targeted request: the customer chose a specific artist. Notify them directly
  // (bypassing radius/style filters), then only broadcast if they opted in.
  if (opts.targetArtistId) {
    const { data: ta } = await admin
      .from("artists")
      .select("id, display_name, profile_id, profiles(email, name, notification_settings)")
      .eq("id", opts.targetArtistId)
      .maybeSingle();
    if (ta) {
      await admin.from("request_matches").upsert(
        [{ request_id: requestId, artist_id: ta.id, matched_on: "location", notified_at: new Date().toISOString(), status: "notified" as const }],
        { onConflict: "request_id,artist_id", ignoreDuplicates: true },
      );
      if (ta.profile_id) {
        try {
          await admin.from("notifications").insert({
            user_id: ta.profile_id,
            type: "new_lead",
            title: "New lead - sent to you directly",
            body: (req.title as string) ?? "A new request",
            href: `/artist/leads/${requestId}`,
            request_id: requestId,
          });
        } catch {
          /* non-critical */
        }
      }
      const prof = ta.profiles as { email?: string; name?: string; notification_settings?: unknown } | null;
      if (prof?.email && emailAllowed(prof.notification_settings, "leads_email")) {
        const sizeLabel = SIZE_OPTIONS.find((s) => s.value === req.size_category)?.label ?? null;
        const { subject, html } = leadEmail({
          artistName: ta.display_name ?? prof.name ?? "there",
          area: req.location_area || req.location_text,
          size: sizeLabel,
          placement: zoneLabel(req.placement_zone),
        });
        await sendEmail({ to: prof.email, subject, html }).then((r) => {
          if (!r.ok) console.warn(`direct lead email to ${prof.email} failed: ${r.error}`);
        });
      }
    }
    if (!opts.broadcast) return { matched: ta ? 1 : 0 };
  }

  const { data: artists } = await admin
    .from("artists")
    .select(
      "id, display_name, location_area, travel_areas, styles, latitude, longitude, profile_id, profiles(email, name, notification_settings)",
    )
    .eq("profile_complete", true)
    .eq("available", true); // unavailable artists get no new leads or emails

  const candidates = (artists ?? []).filter((a) => {
    if (opts.targetArtistId && a.id === opts.targetArtistId) return false; // already notified directly
    return artistMatchesRequest(a, req);
  });

  if (candidates.length === 0) return { matched: 0 };

  const now = new Date().toISOString();
  await admin.from("request_matches").upsert(
    candidates.map((a) => ({
      request_id: requestId,
      artist_id: a.id,
      matched_on: reqStyle ? "style+location" : "location",
      notified_at: now,
      status: "notified" as const,
    })),
    { onConflict: "request_id,artist_id", ignoreDuplicates: true },
  );

  // In-app "new lead" notification for each matched artist (fails soft).
  try {
    const notifRows = candidates
      .filter((a) => a.profile_id)
      .map((a) => ({
        user_id: a.profile_id as string,
        type: "new_lead",
        title: "New lead matched",
        body: (req.title as string) ?? "A new request",
        href: `/artist/leads/${requestId}`,
        request_id: requestId,
      }));
    if (notifRows.length > 0) await admin.from("notifications").insert(notifRows);
  } catch {
    /* non-critical */
  }

  // Email matched artists (fails soft - won't break request creation).
  // Cap the fan-out so one request can't blast the whole artist base.
  const EMAIL_FANOUT_CAP = 60;
  await Promise.all(
    candidates.slice(0, EMAIL_FANOUT_CAP).map((a) => {
      const profile = a.profiles as { email?: string; name?: string; notification_settings?: unknown } | null;
      const email = profile?.email;
      if (!email || !emailAllowed(profile.notification_settings, "leads_email")) return Promise.resolve();
      const sizeLabel =
        SIZE_OPTIONS.find((s) => s.value === req.size_category)?.label ?? null;
      const { subject, html } = leadEmail({
        artistName: a.display_name ?? profile?.name ?? "there",
        area: req.location_area || req.location_text,
        size: sizeLabel,
        placement: zoneLabel(req.placement_zone),
      });
      return sendEmail({ to: email, subject, html }).then((r) => {
        if (!r.ok) console.warn(`lead email to ${email} failed: ${r.error}`);
      });
    }),
  );

  return { matched: candidates.length };
}

/**
 * Reverse of runMatching: when an artist newly completes their profile, find the
 * open requests they match (which were posted before they existed and so never
 * reached them) and record matches + send ONE summary notification/email. This
 * is what makes the "artists will see your request as they join" promise true.
 * Idempotent: re-running won't duplicate matches or re-spam.
 */
export async function matchOpenRequestsToArtist(artistId: string): Promise<{ matched: number }> {
  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("id, display_name, available, profile_complete, location_area, travel_areas, styles, latitude, longitude, profile_id, profiles(email, name, notification_settings)")
    .eq("id", artistId)
    .maybeSingle();
  if (!artist || !artist.profile_complete || !artist.available) return { matched: 0 };

  const nowIso = new Date().toISOString();
  const { data: reqs } = await admin
    .from("tattoo_requests")
    .select("id, title, location_area, location_text, style, travel_radius_miles, latitude, longitude, status, removed, expires_at, booked_artist_id, created_at")
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(200);

  const open = (reqs ?? []).filter(
    (r) => !r.removed && !r.booked_artist_id && !(r.expires_at && r.expires_at < nowIso),
  );
  const matched = open.filter((r) => artistMatchesRequest(artist as MatchArtist, r as MatchRequest));
  if (matched.length === 0) return { matched: 0 };

  // Record matches - ignoreDuplicates so anything they were already notified
  // about (shouldn't happen for a brand-new artist, but safe on re-run) is kept.
  await admin.from("request_matches").upsert(
    matched.map((r) => ({
      request_id: r.id,
      artist_id: artist.id,
      matched_on: "backfill",
      notified_at: nowIso,
      status: "notified" as const,
    })),
    { onConflict: "request_id,artist_id", ignoreDuplicates: true },
  );

  // One summary ping + one email (never one-per-request).
  const n = matched.length;
  if (artist.profile_id) {
    try {
      await admin.from("notifications").insert({
        user_id: artist.profile_id,
        type: "new_lead",
        title: `${n} open ${n === 1 ? "lead matches" : "leads match"} your profile`,
        body: "Requests in your area and styles are waiting for a quote.",
        href: "/artist/leads",
      });
    } catch {
      /* non-critical */
    }
  }
  const prof = artist.profiles as { email?: string; name?: string; notification_settings?: unknown } | null;
  if (prof?.email && emailAllowed(prof.notification_settings, "leads_email")) {
    const name = escapeHtml(artist.display_name ?? prof.name ?? "there");
    await sendEmail({
      to: prof.email,
      subject: `${n} open tattoo ${n === 1 ? "lead matches" : "leads match"} your profile - Quote My Tattoo`,
      html: `<div style="font-family:Figtree,Arial,sans-serif;color:#2a2233">
        <h2 style="color:#311a41">Welcome, ${name} - you've got leads waiting</h2>
        <p>${n} open tattoo ${n === 1 ? "request" : "requests"} in your area and styles ${n === 1 ? "is" : "are"} waiting for a quote.</p>
        <p><a href="${SITE}/artist/leads" style="background:#6a2e96;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">View your leads</a></p>
      </div>`,
    }).then((r) => {
      if (!r.ok) console.warn(`backfill lead email to ${prof.email} failed: ${r.error}`);
    });
  }

  return { matched: n };
}
