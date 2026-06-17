import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, escapeHtml } from "@/lib/email/resend";
import { emailAllowed } from "@/lib/notification-prefs";
import { unsubUrl } from "@/lib/unsubscribe";

import { SITE_URL as SITE } from "@/lib/site";

/**
 * Emails customers to review artists they connected with. Runs daily (Vercel
 * Cron, CRON_SECRET-protected). Targets connections revealed 3-4 days ago (a
 * one-day window, so each connection is prompted exactly once) that the customer
 * hasn't reviewed yet.
 */
export async function GET(request: Request) {
  // Fail closed: refuse if CRON_SECRET is unset or the bearer token doesn't match,
  // so a misconfigured deploy can't leave this endpoint publicly triggerable.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const day = 24 * 60 * 60 * 1000;
  const fromIso = new Date(Date.now() - 4 * day).toISOString();
  const toIso = new Date(Date.now() - 3 * day).toISOString();

  const { data: conns, error } = await admin
    .from("connections")
    .select(
      "request_id, artist_id, request:tattoo_requests!connections_request_id_fkey(id, customer_id, profiles!tattoo_requests_customer_id_fkey(email, name, notification_settings)), artist:artists!connections_artist_id_fkey(display_name)",
    )
    .gte("revealed_at", fromIso)
    .lt("revealed_at", toIso);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const c of conns ?? []) {
    const { count } = await admin
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("request_id", c.request_id)
      .eq("artist_id", c.artist_id);
    if ((count ?? 0) > 0) continue;

    const req = (Array.isArray(c.request) ? c.request[0] : c.request) as
      | { id?: string; customer_id?: string; profiles?: { email?: string; name?: string; notification_settings?: unknown } | { email?: string; name?: string; notification_settings?: unknown }[] | null }
      | null;
    const cust = req ? (Array.isArray(req.profiles) ? req.profiles[0] : req.profiles) : null;
    const art = (Array.isArray(c.artist) ? c.artist[0] : c.artist) as { display_name?: string } | null;
    if (!cust?.email || !req?.id || !req?.customer_id) continue;
    // Honor the customer's review-email preference.
    if (!emailAllowed(cust.notification_settings, "reviews_email")) continue;

    const artistName = art?.display_name ?? "your artist";
    const unsub = unsubUrl(req.customer_id, "reviews_email");
    const r = await sendEmail({
      to: cust.email,
      subject: `How did it go with ${artistName}? - Quote My Tattoo`,
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      html: `<div style="font-family:Figtree,Arial,sans-serif;color:#2a2233">
        <h2 style="color:#311a41">How did it go?</h2>
        <p>You connected with ${escapeHtml(artistName)} on Quote My Tattoo. A quick review helps other customers and supports great artists.</p>
        <p><a href="${SITE}/requests/${req.id}" style="background:#6a2e96;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">Leave a review</a></p>
        <p style="color:#9b95a3;font-size:12px;margin-top:18px">Don't want review reminders? <a href="${unsub}" style="color:#9b95a3">Unsubscribe</a> or manage your <a href="${SITE}/account?tab=notif" style="color:#9b95a3">notification settings</a>.</p>
      </div>`,
    });
    if (r.ok) sent++;
  }

  return NextResponse.json({ prompted: sent });
}
