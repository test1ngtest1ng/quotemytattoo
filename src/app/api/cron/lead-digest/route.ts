import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, escapeHtml } from "@/lib/email/resend";
import { titleCase } from "@/lib/format";
import { emailAllowed } from "@/lib/notification-prefs";
import { unsubUrl } from "@/lib/unsubscribe";

import { SITE_URL as SITE } from "@/lib/site";

/**
 * Weekly digest: emails each available artist the open leads they haven't acted
 * on yet (no quote, not passed, still live). Artists with nothing open get no
 * email - so a quiet week sends nothing. Runs weekly (Vercel Cron,
 * CRON_SECRET-protected). Per-lead "new lead" emails still fire on post; this is
 * the catch-up nudge for leads left sitting.
 */
export async function GET(request: Request) {
  // Fail closed: refuse if CRON_SECRET is unset or the bearer token doesn't match.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // Un-actioned matches: artist was notified/viewed but hasn't quoted or passed.
  const { data: rows, error } = await admin
    .from("request_matches")
    .select(
      "artist_id, request:tattoo_requests!request_matches_request_id_fkey(id, title, location_area, style, status, removed, expires_at, booked_artist_id), artist:artists!request_matches_artist_id_fkey(id, display_name, available, profile_complete, profile_id, profiles(email, name, notification_settings))",
    )
    .in("status", ["notified", "viewed"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Lead = { id: string; title: string | null; area: string | null; style: string | null };
  const byArtist = new Map<string, { email: string; name: string; userId: string; leads: Lead[] }>();

  for (const row of rows ?? []) {
    const req = (Array.isArray(row.request) ? row.request[0] : row.request) as
      | { id?: string; title?: string | null; location_area?: string | null; style?: string | null; status?: string; removed?: boolean; expires_at?: string | null; booked_artist_id?: string | null }
      | null;
    const art = (Array.isArray(row.artist) ? row.artist[0] : row.artist) as
      | { id?: string; display_name?: string | null; available?: boolean; profile_complete?: boolean; profile_id?: string | null; profiles?: { email?: string; name?: string; notification_settings?: unknown } | { email?: string; name?: string; notification_settings?: unknown }[] | null }
      | null;
    if (!req?.id || !art?.id) continue;

    // Only still-open leads count.
    if (req.removed || req.status !== "live") continue;
    if (req.expires_at && req.expires_at < nowIso) continue;
    if (req.booked_artist_id) continue;
    // Only artists who can take work.
    if (!art.available || !art.profile_complete) continue;

    const prof = (Array.isArray(art.profiles) ? art.profiles[0] : art.profiles) as { email?: string; name?: string; notification_settings?: unknown } | null;
    if (!prof?.email || !art.profile_id) continue;
    // Honor the artist's email preference for lead notifications.
    if (!emailAllowed(prof.notification_settings, "leads_email")) continue;

    const entry = byArtist.get(art.id) ?? { email: prof.email, name: art.display_name || prof.name || "there", userId: art.profile_id, leads: [] };
    entry.leads.push({ id: req.id, title: req.title ?? null, area: req.location_area ?? null, style: req.style ?? null });
    byArtist.set(art.id, entry);
  }

  let sent = 0;
  for (const { email, name, userId, leads } of byArtist.values()) {
    if (leads.length === 0) continue;
    const unsub = unsubUrl(userId, "leads_email");
    const shown = leads.slice(0, 8);
    const rest = leads.length - shown.length;
    const items = shown
      .map((l) => {
        const meta = escapeHtml([l.style, l.area].filter(Boolean).join(" · "));
        return `<li style="margin:0 0 8px"><a href="${SITE}/artist/leads/${l.id}" style="color:#6a2e96;font-weight:600;text-decoration:none">${escapeHtml(titleCase(l.title ?? "Tattoo request"))}</a>${meta ? `<span style="color:#6b6470"> - ${meta}</span>` : ""}</li>`;
      })
      .join("");
    const count = leads.length;
    const r = await sendEmail({
      to: email,
      subject: `You have ${count} open lead${count === 1 ? "" : "s"} waiting - Quote My Tattoo`,
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      html: `<div style="font-family:Figtree,Arial,sans-serif;color:#2a2233">
        <h2 style="color:#311a41">Hi ${escapeHtml(name)}, you've got leads waiting</h2>
        <p>${count} tattoo request${count === 1 ? "" : "s"} matched to you ${count === 1 ? "is" : "are"} still open and waiting for a reply:</p>
        <ul style="padding-left:18px;margin:14px 0">${items}</ul>
        ${rest > 0 ? `<p style="color:#6b6470">…and ${rest} more.</p>` : ""}
        <p><a href="${SITE}/artist/leads" style="background:#6a2e96;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">View your leads</a></p>
        <p style="color:#9b95a3;font-size:12px;margin-top:18px">Replying quickly wins more work. If you can't take a lead, you can pass on it to clear it from your list.</p>
        <p style="color:#9b95a3;font-size:12px;margin-top:14px">Don't want these weekly lead emails? <a href="${unsub}" style="color:#9b95a3">Unsubscribe</a> or manage your <a href="${SITE}/account?tab=notif" style="color:#9b95a3">notification settings</a>.</p>
      </div>`,
    });
    if (r.ok) sent++;
  }

  return NextResponse.json({ artists: byArtist.size, emailed: sent });
}
