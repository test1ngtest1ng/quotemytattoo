// Boot-time sanity check for production env vars. Logs a single warning (never
// throws - must not crash marketing pages) so a missing var surfaces in the
// server logs at startup instead of failing silently on first email/cron/admin call.
const RECOMMENDED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "RESEND_API_KEY",
  "CRON_SECRET",
] as const;

export function checkEnv(): void {
  const missing = RECOMMENDED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.warn(
      `[env] Missing recommended env vars: ${missing.join(", ")}. ` +
        `Email links, auth redirects, cron jobs or admin actions may not work in production until these are set.`,
    );
  }
}
