"use client";

import type { CSSProperties, ReactNode } from "react";

/** A submit button that asks for confirmation before posting its parent form.
 *  Used for destructive admin actions (purge, delete) inside server-action forms. */
export function ConfirmSubmit({
  children,
  confirm,
  className = "btn",
  style,
}: {
  children: ReactNode;
  confirm: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      type="submit"
      className={className}
      style={style}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
