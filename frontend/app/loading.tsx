/**
 * Route-level loading skeleton.
 *
 * Shown by Next's Suspense boundary while a route's code and data resolve. The shape
 * mirrors the real page — header, stat row, content cards — so the transition to loaded
 * content is a fill rather than a re-layout. That is the whole point of a skeleton over a
 * spinner: a spinner says "wait", a skeleton says "here is what is arriving", and it holds
 * the space so nothing shifts underneath the citizen's thumb.
 *
 * Marked aria-busy and labelled, so a screen reader announces the wait instead of reading
 * an empty region.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading page"
      className="mx-auto max-w-[1100px] px-5 py-8"
    >
      <span className="sr-only">Loading…</span>

      <div className="mb-7 space-y-3">
        <div className="skeleton h-7 w-56" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card p-5">
            <div className="skeleton mb-3 h-9 w-9 rounded-xl" />
            <div className="skeleton mb-2 h-6 w-20" />
            <div className="skeleton h-3.5 w-28" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card flex items-center gap-4 p-5">
            <div className="skeleton h-11 w-11 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="skeleton h-4 w-44 max-w-full" />
              <div className="skeleton h-3.5 w-64 max-w-full" />
            </div>
            <div className="skeleton hidden h-9 w-24 shrink-0 rounded-xl sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
