import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase client that uses the service-role key and BYPASSES
 * Row-Level Security. Use ONLY in trusted server code (Route Handlers, Server
 * Actions, cron) for operations that must act across users - e.g. running the
 * artist-request matching and sending lead notification emails.
 *
 * NEVER import this into a Client Component or expose the service-role key.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
