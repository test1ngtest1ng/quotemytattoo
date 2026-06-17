import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, escapeHtml } from "@/lib/email/resend";
import { createNotification } from "@/lib/notifications";
import { emailAllowed } from "@/lib/notification-prefs";
import { unsubUrl } from "@/lib/unsubscribe";
import { titleCase } from "@/lib/format";

import { SITE_URL as SITE } from "@/lib/site";

/**
 * Reminds customers a few days before a live request auto-closes (requests have
 * a 6-week clock; expire-requests closes them). Targets requests expiring in a
 * one-day window 3-4 days out, so each is reminded exactly once. Runs daily
 * (Vercel Cron, CRON_SECRET-protected). In-app + email (honoring activity_email).
 */
export async function GET(request: Request) {
  // Fail closed: refuse if CRON_SECRET is unset or the bearer token doesn't match.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const day = 24 * 60 * 60 * 1000;
  const fromIso = new Date(Date.now() + 3 * day).toISOString();
  const toIso = new Date(Date.now() + 4 * day).toISOString();

  const { data: reqs, error } = await admin
    .from("tattoo_requests")
    .select("id, title, customer_id, status, removed, booked_artist_id, expires_at, profiles!tattoo_requests_customer_id_fkey(email, name, notification_settings)")
    .eq("status", "live")
    .gte("expires_at", fromIso)
    .lt("expires_at", toIso);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const r of reqs ?? []) {
    if (r.removed || r.booked_artist_id || !r.customer_id) continue;
    const cust = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles) as
      | { email?: string; name?: string; notification_settings?: unknown }
      | null;

    const title = titleCase((r.title as string) ?? "Your tattoo request");

    // In-app reminder (independent of email preference).
    await createNotification(admin, {
      userId: r.customer_id as string,
      type: "expiring",
      title: "Your request is closing soon",
      body: title,
      href: `/requests/${r.id}`,
      requestId: r.id as string,
    });

    if (!cust?.email || !emailAllowed(cust.notification_settings, "activity_email")) continue;
    const unsub = unsubUrl(r.customer_id as string, "activity_email");
    const res = await sendEmail({
      to: cust.email,
      subject: "Your tattoo request is closing soon - Quote My Tattoo",
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      html: `<div style="font-family:Figtree,Arial,sans-serif;color:#2a2233">
        <h2 style="color:#311a41">Your request is closing in a few days</h2>
        <p>Your request <strong>${escapeHtml(title)}</strong> will close soon. If you're still after a tattoo, open it to nudge artists or post a fresh one.</p>
        <p><a href="${SITE}/requests/${r.id}" style="background:#6a2e96;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">View your request</a></p>
        <p style="color:#9b95a3;font-size:12px;margin-top:18px">Don't want these reminders? <a href="${unsub}" style="color:#9b95a3">Unsubscribe</a> or manage your <a href="${SITE}/account?tab=notif" style="color:#9b95a3">notification settings</a>.</p>
      </div>`,
    });
    if (res.ok) sent++;
  }

  return NextResponse.json({ reminded: reqs?.length ?? 0, emailed: sent });
}
