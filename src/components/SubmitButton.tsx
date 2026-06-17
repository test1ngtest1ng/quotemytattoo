"use client";

import { useFormStatus } from "react-dom";
import { toTitleCase } from "@/lib/format";

const base =
  "w-full rounded-[10px] bg-violet px-5 py-3 font-semibold text-white shadow-[0_2px_0_var(--color-violet-dark)] transition hover:bg-violet-dark disabled:cursor-not-allowed disabled:opacity-60";

export function SubmitButton({
  children,
  className,
  pendingText = "Please wait…",
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={className ?? base}
    >
      {pending ? pendingText : typeof children === "string" ? toTitleCase(children) : children}
    </button>
  );
}
