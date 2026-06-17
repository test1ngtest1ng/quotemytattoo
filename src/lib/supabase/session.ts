import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and keeps the
 * auth cookies in sync between the browser and the server.
 *
 * If the Supabase env vars aren't set yet (e.g. before the project is
 * connected), this is a no-op so the marketing pages still run locally.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: getUser() must be called to refresh the session token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Enforce account suspension on every request: a suspended user is signed out
  // and bounced to /login on their next navigation, not just blocked at login.
  if (user) {
    const path = request.nextUrl.pathname;
    const onAuthPage =
      path.startsWith("/login") ||
      path.startsWith("/auth") ||
      path.startsWith("/forgot-password") ||
      path.startsWith("/reset-password");
    // Read the flag from app_metadata that getUser() already returned - no
    // extra DB round-trip per request.
    const suspended = (user.app_metadata as Record<string, unknown> | undefined)?.suspended === true;
    if (!onAuthPage && suspended) {
      {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.search = `?error=${encodeURIComponent("This account has been suspended. Please contact support.")}`;
        const redirect = NextResponse.redirect(redirectUrl);
        request.cookies.getAll().forEach((c) => {
          if (c.name.startsWith("sb-")) redirect.cookies.set(c.name, "", { maxAge: 0, path: "/" });
        });
        return redirect;
      }
    }
  }

  return supabaseResponse;
}
