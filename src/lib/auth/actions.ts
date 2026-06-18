"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export type AuthState = { error: string } | undefined;

import { SITE_URL } from "@/lib/site";
import { looksLikeSpam, rateLimit, clientIp } from "@/lib/antispam";

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  const next = String(formData.get("next") ?? "").trim();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  // Block suspended accounts (reversible admin ban) - read from app_metadata
  // on the just-authenticated user, no extra query.
  if ((data.user?.app_metadata as Record<string, unknown> | undefined)?.suspended === true) {
    await supabase.auth.signOut();
    return { error: "This account has been suspended. Please contact support." };
  }

  // Start each session in the account's default mode (artist for artists).
  (await cookies()).delete("qmt-mode");
  revalidatePath("/", "layout");
  redirect(next || "/dashboard");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const role = (String(formData.get("role") ?? "customer") as UserRole) || "customer";
  const next = String(formData.get("next") ?? "").trim();

  if (!email || !password) return { error: "Enter your email and password." };
  if (password.length < 6)
    return { error: "Password must be at least 6 characters." };

  // Anti-spam (invisible): honeypot + timing, then a soft per-IP cap. Use a
  // generic message so a bot can't tell which trap it tripped.
  if (looksLikeSpam(formData)) return { error: "Something went wrong. Please try again." };
  if (rateLimit(`signup:${await clientIp()}`, 5, 60 * 60 * 1000))
    return { error: "Too many attempts. Please wait a little while and try again." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone, role },
      emailRedirectTo: `${SITE_URL}/auth/confirm`,
    },
  });
  if (error) return { error: error.message };

  // When email confirmation is ON, Supabase hides "email already registered"
  // (anti-enumeration) by returning a fabricated user with an empty identities
  // array and no session. Detect that and point the user at sign-in instead of
  // silently sending them to a check-email page where no email will arrive.
  if (data.user && !data.session && (data.user.identities?.length ?? 0) === 0) {
    return {
      error: "That email already has an account. Try logging in, or check your inbox for the confirmation link.",
    };
  }

  const roleDest =
    role === "artist"
      ? "/artist/onboarding"
      : role === "studio_owner"
        ? "/studio/onboarding"
        : "/dashboard";
  const dest = next || roleDest;

  // If email confirmation is OFF, a session is returned immediately.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(dest);
  }

  // Otherwise the user must confirm via email first.
  redirect(`/check-email?next=${encodeURIComponent(dest)}`);
}

export type ResetState = { error: string } | { ok: true } | undefined;

/** Step 1: email the user a password-reset link. Always reports success (so we
 *  don't reveal whether an email is registered). */
export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/confirm?next=/reset-password`,
  });
  return { ok: true };
}

/** Step 2: set the new password. The user arrives here already signed in via the
 *  recovery session established by /auth/confirm. */
export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Request a new one." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard?reset=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete("qmt-mode");
  revalidatePath("/", "layout");
  redirect("/");
}
