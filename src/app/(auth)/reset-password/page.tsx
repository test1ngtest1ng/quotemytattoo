import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage() {
  // The user reaches here via the recovery link, which establishes a session in
  // /auth/confirm. If there's no session, the link was invalid or expired.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <h1 className="mb-1 text-2xl font-extrabold text-plum">Link expired</h1>
        <p className="mb-6 text-sm text-muted">
          This password reset link is invalid or has expired.
        </p>
        <Link href="/forgot-password" className="font-semibold text-violet">Request a new link</Link>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold text-plum">Set a new password</h1>
      <p className="mb-6 text-sm text-muted">Choose a new password for your account.</p>
      <ResetPasswordForm />
    </>
  );
}
