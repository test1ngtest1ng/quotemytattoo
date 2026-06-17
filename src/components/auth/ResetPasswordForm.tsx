"use client";

import { useActionState } from "react";
import { updatePassword, type AuthState } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/SubmitButton";

const inputClass =
  "w-full rounded-[10px] border border-line px-4 py-3 text-ink outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/20";

export function ResetPasswordForm() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && (
        <p className="rounded-[10px] bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className="text-sm font-semibold">Confirm new password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={6} className={inputClass} />
      </div>
      <SubmitButton pendingText="Saving…">Set new password</SubmitButton>
    </form>
  );
}
