import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold text-plum">Reset your password</h1>
      <p className="mb-6 text-sm text-muted">Enter your email and we&apos;ll send you a link to set a new password.</p>
      {error && (
        <p className="mb-4 rounded-[10px] bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      <ForgotPasswordForm />
    </>
  );
}
