/** Skeleton shown while an admin page loads, so there is never a blank screen. */
export function AdminLoadingSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="grid animate-pulse gap-6">
      <div className="grid gap-2">
        <div className="h-8 w-56 rounded-lg bg-stone-deep" />
        <div className="h-4 w-80 max-w-full rounded bg-stone-deep/70" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 rounded-card bg-ivory ring-1 ring-line" />
        ))}
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-16 rounded-card bg-ivory ring-1 ring-line" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
