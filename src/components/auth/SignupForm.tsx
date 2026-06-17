"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Honeypot } from "@/components/Honeypot";
import type { UserRole } from "@/lib/types";

const inputClass =
  "w-full rounded-[10px] border border-line px-4 py-3 text-ink outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/20";

export function SignupForm({
  role = "customer",
  next,
}: {
  role?: UserRole;
  next?: string;
}) {
  const [state, action] = useActionState<AuthState, FormData>(signUp, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Honeypot />
      <input type="hidden" name="role" value={role} />
      {next && <input type="hidden" name="next" value={next} />}

      {state?.error && (
        <p className="rounded-[10px] bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-semibold">
          Full name
        </label>
        <input id="name" name="name" type="text" autoComplete="name" required className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-semibold">
          Phone <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold">
          Password <span className="font-normal text-muted">(6+ characters)</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className={inputClass}
        />
      </div>

      <SubmitButton pendingText="Creating account…">
        {role === "artist" ? "Create artist account" : "Create account"}
      </SubmitButton>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-violet">
          Log in
        </Link>
      </p>
    </form>
  );
}
