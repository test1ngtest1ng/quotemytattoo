import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseUnsubToken } from "@/lib/unsubscribe";
import { isEmailCategory } from "@/lib/notification-prefs";

/** One-click email unsubscribe. Verifies the signed token, flips that one email
 *  category off in the recipient's notification_settings, and shows a simple
 *  confirmation. No login required (the signature is the auth). Supports GET
 *  (link click) and POST (RFC 8058 List-Unsubscribe-Post one-click). */
async function handle(token: string | null): Promise<NextResponse> {
  const parsed = token ? parseUnsubToken(token) : null;
  if (!parsed || !isEmailCategory(parsed.category)) {
    return page("This unsubscribe link is invalid or has expired.", false);
  }

  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("notification_settings")
    .eq("id", parsed.userId)
    .maybeSingle();
  const current = (prof?.notification_settings as Record<string, unknown> | null) ?? {};
  const next = { ...current, [parsed.category]: false };
  await admin.from("profiles").update({ notification_settings: next }).eq("id", parsed.userId);

  return page("You've been unsubscribed from these emails. You can turn them back on any time in your account notification settings.", true);
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  return handle(token);
}

export async function POST(request: Request) {
  // One-click clients POST to the same URL; the token is in the query string.
  const token = new URL(request.url).searchParams.get("token");
  return handle(token);
}

function page(message: string, ok: boolean): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <meta name="robots" content="noindex"/>
    <title>Unsubscribe - Quote My Tattoo</title></head>
    <body style="font-family:system-ui,Arial,sans-serif;background:#faf8fc;color:#2a2233;margin:0;padding:48px 20px">
      <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #ece7f2;border-radius:14px;padding:32px">
        <div style="font-weight:800;color:#311a41;font-size:20px">${ok ? "Unsubscribed" : "Hmm"}</div>
        <p style="margin:14px 0 0;line-height:1.5">${message}</p>
        <p style="margin:22px 0 0"><a href="https://quotemytattoo.co.uk/account?tab=notif" style="color:#6a2e96;font-weight:700;text-decoration:none">Manage notification settings</a></p>
      </div>
    </body></html>`;
  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
