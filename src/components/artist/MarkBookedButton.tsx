"use client";

import { SubmitButton } from "@/components/SubmitButton";
import { artistMarkBooked } from "@/lib/data/connections";

/** Artist-side "mark as booked" with a confirm, since it closes the customer's request. */
export function MarkBookedButton({ requestId }: { requestId: string }) {
  return (
    <form
      action={artistMarkBooked}
      onSubmit={(e) => {
        if (!window.confirm("Mark this request as booked? It closes the customer's request and lets them leave you a verified review. They can reopen it if needed.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="request_id" value={requestId} />
      <SubmitButton
        className="rounded-[10px] bg-violet px-5 py-2.5 font-semibold text-white shadow-[0_2px_0_var(--color-violet-dark)] transition hover:bg-violet-dark"
        pendingText="Marking…"
      >
        Mark as booked
      </SubmitButton>
    </form>
  );
}
