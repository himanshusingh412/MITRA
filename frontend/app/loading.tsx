import { MitraMark } from '@/components/Brand';

/**
 * Route-level loading state.
 *
 * The mark breathes while the route resolves — a single element scaling between 0.97 and
 * 1.0 with a matching opacity shift. That restraint is deliberate: a particle assembly or
 * a morphing logo would be a longer, more expensive animation that makes a fast load feel
 * artificially slow, and on the low-end Android this product targets it would drop frames
 * on the very devices that wait longest.
 *
 * Below the mark, the skeleton mirrors the real page — header, stat row, content cards —
 * so the transition to loaded content is a fill rather than a re-layout. A spinner says
 * "wait"; a skeleton says "here is what is arriving", and it reserves the space so nothing
 * shifts under the citizen's thumb.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto max-w-[1100px] px-5 py-8"
    >
      <span className="sr-only">Loading…</span>

      <div className="mb-9 flex flex-col items-center pt-6">
        <MitraMark className="h-14 w-14 animate-breathe" title="" />
        <p className="muted mt-3.5 text-xs font-semibold uppercase tracking-[0.16em]">
          MITRA
        </p>
      </div>

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
