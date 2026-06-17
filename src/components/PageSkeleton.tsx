/** Neutral loading skeleton shown via route-level loading.tsx while a slow
 *  server page (which signs image URLs serially) streams in. Keeps navigation
 *  from flashing a blank screen. */
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-52 animate-pulse rounded-md bg-black/5" />
      <div className="mt-3 h-4 w-72 animate-pulse rounded bg-black/5" />
      <div className="mt-7 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[14px] bg-black/5" />
        ))}
      </div>
    </main>
  );
}
