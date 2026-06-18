import type { Metadata } from "next";
import { confirmEmail } from "./actions";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash, type, next } = await searchParams;

  if (!token_hash || !type) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Invalid link</h1>
          <p className="app-sub">This confirmation link is missing required parameters. Please request a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Confirm your email</h1>
        <p className="app-sub" style={{ marginBottom: 24 }}>
          Click the button below to verify your email address and activate your account.
        </p>
        <form action={confirmEmail}>
          <input type="hidden" name="token_hash" value={token_hash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={next ?? "/dashboard"} />
          <button type="submit" className="btn" style={{ width: "100%" }}>
            Confirm my email address
          </button>
        </form>
      </div>
    </div>
  );
}
