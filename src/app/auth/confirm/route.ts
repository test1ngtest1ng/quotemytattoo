import { type EmailOtpType } from "@supabase/supabase-js";
import { type SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runMatching } from "@/lib/data/matching";

/** A guest who created an account at submit had their request saved as a draft
 *  flagged publish_on_verify. Once their email is confirmed (session now exists),
 *  flip those drafts live and run matching. */
async function publishPendingDrafts(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await admin
    .from("tattoo_requests")
    .update({ status: "live", expires_at: expiresAt, publish_on_verify: false })
    .eq("customer_id", user.id)
    .eq("publish_on_verify", true)
    .eq("status", "draft")
    .select("id, target_artist_id");
  for (const r of rows ?? []) {
    try {
      await runMatching(r.id as string, { targetArtistId: (r.target_artist_id as string | null) ?? null });
    } catch {
      /* non-critical */
    }
  }
}

/**
 * Handles email links (signup confirmation, magic link, password recovery).
 * Supports both link styles so it works whatever the email templates emit:
 *  - `token_hash` - stateless OTP (verifyOtp). PREFERRED: no code_verifier
 *    cookie required, so it survives being opened in any browser/context.
 *  - `code`       - PKCE (exchangeCodeForSession). Fallback for default
 *    templates; needs the verifier cookie set when the link was requested.
 * On success we set the session cookie and redirect to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = (searchParams.get("type") as EmailOtpType | null) ?? null;
  const next = searchParams.get("next") ?? "/dashboard";
  const providerError =
    searchParams.get("error_description") || searchParams.get("error");

  // Recovery failures should funnel back to "request a new link"; everything
  // else to login.
  const failDest = (msg: string) => {
    const path = type === "recovery" ? "/forgot-password" : "/login";
    return NextResponse.redirect(
      new URL(`${path}?error=${encodeURIComponent(msg)}`, request.url),
    );
  };

  // Supabase appends an error when the one-time link was already consumed
  // (commonly an email-scanner pre-fetch) or has genuinely expired.
  if (providerError) {
    return failDest("That link has expired or was already used. Please request a new one.");
  }

  // For signup and email_change, defer token exchange to a page the user must
  // interact with. Email security scanners (Gmail etc.) pre-fetch GET links and
  // would consume the one-time token before the user clicks it.
  if (token_hash && type && type !== "recovery") {
    const params = new URLSearchParams({ token_hash, type, next });
    return NextResponse.redirect(new URL(`/auth/verify-email?${params}`, request.url));
  }

  const supabase = await createClient();

  // Recovery: verify immediately so the session is live when the password-reset
  // form renders.
  const mayPublish = false;

  // Preferred: stateless OTP.
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      if (mayPublish) await publishPendingDrafts(supabase);
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Fallback: PKCE code exchange.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (mayPublish) await publishPendingDrafts(supabase);
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return failDest(`ROUTE FALLBACK: th=${token_hash ? "yes" : "no"} type=${type ?? "none"} code=${code ? "yes" : "no"}`);
}
