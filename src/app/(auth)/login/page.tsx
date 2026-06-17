import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold text-plum">Welcome back</h1>
      <p className="mb-6 text-sm text-muted">Log in to your account.</p>
      {error && (
        <p className="mb-4 rounded-[10px] bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      <LoginForm next={next} />
    </>
  );
}
