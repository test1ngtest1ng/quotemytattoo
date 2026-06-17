"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ResetState } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/SubmitButton";

const inputClass =
  "w-full rounded-[10px] border border-line px-4 py-3 text-ink outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/20";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<ResetState, FormData>(requestPasswordReset, undefined);

  if (state && "ok" in state) {
    return (
      <div className="text-sm text-ink">
        <p className="rounded-[10px] bg-green-50 px-4 py-3 text-green-800">
          If an account exists for that email, we&apos;ve sent a link to reset your password. Check your inbox.
        </p>
        <p className="mt-4 text-center text-muted">
          <Link href="/login" className="font-semibold text-violet">Back to log in</Link>
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && (
        <p className="rounded-[10px] bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </div>
      <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
      <p className="text-center text-sm text-muted">
        Remembered it? <Link href="/login" className="font-semibold text-violet">Log in</Link>
      </p>
    </form>
  );
}
