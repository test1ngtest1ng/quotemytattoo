"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8fc] px-6 text-center">
      <h1 className="text-2xl font-extrabold text-plum">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-muted">
        Sorry, an unexpected error occurred. Please try again - if it keeps happening, head back home.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-[10px] bg-violet px-6 py-3 font-semibold text-white transition hover:bg-violet-dark"
        >
          Try again
        </button>
        <Link href="/" className="rounded-[10px] border border-line px-6 py-3 font-semibold text-ink transition hover:border-violet hover:text-violet">
          Back to home
        </Link>
      </div>
    </div>
  );
}
