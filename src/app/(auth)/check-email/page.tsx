import type { Metadata } from "next";

export const metadata: Metadata = { title: "Check your email" };

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ pending?: string }>;
}) {
  const { pending } = await searchParams;
  return (
    <div className="text-center">
      <h1 className="mb-2 text-2xl font-extrabold text-plum">Check your email</h1>
      {pending ? (
        <p className="text-sm text-muted">
          Your request is saved. We&apos;ve sent a confirmation link to your email -
          click it to confirm your account and your request goes live to artists
          right away.
        </p>
      ) : (
        <p className="text-sm text-muted">
          We&apos;ve sent you a confirmation link. Click it to activate your
          account, then come back and log in.
        </p>
      )}
    </div>
  );
}
