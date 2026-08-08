'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './ui';
import { useStore } from '@/lib/store';

/**
 * Connection and save status.
 *
 * The store has always tracked `syncError` and `online`, but nothing rendered them — a
 * failed write left the optimistic value on screen and the citizen believed it had saved.
 * On the connections this product targets that is the difference between "my income was
 * updated" and silently applying with stale details.
 *
 * Behaviour is deliberately conservative:
 *  - Offline is NOT reported here. The shell already shows a persistent banner for it,
 *    and two simultaneous notices about one condition is noise, not emphasis. This
 *    component owns save outcomes only.
 *  - Errors persist until resolved. A save failure is not something to auto-dismiss after
 *    four seconds; the citizen has to know it is still outstanding.
 *  - Recovery is confirmed, then withdrawn after a moment, so the interface returns to
 *    quiet rather than accumulating chrome.
 *  - `role="status"` with `aria-live="polite"` announces without stealing focus mid-typing.
 */
export function Toaster() {
  const { syncError, online } = useStore();
  const [recovered, setRecovered] = useState(false);
  const hadError = useRef(false);

  useEffect(() => {
    if (syncError) {
      hadError.current = true;
      setRecovered(false);
      return;
    }
    // Only confirm a recovery that followed an actual failure, and only once the
    // connection is genuinely back — otherwise "saved" would appear while still offline.
    if (!hadError.current || !online) return;
    hadError.current = false;
    setRecovered(true);
    const timer = window.setTimeout(() => setRecovered(false), 3500);
    return () => window.clearTimeout(timer);
  }, [syncError, online]);

  const state = syncError
    ? {
        tone: 'rose' as const,
        icon: 'CircleAlert',
        title: 'Change not saved',
        body: syncError,
      }
    : recovered
      ? {
          tone: 'emerald' as const,
          icon: 'CircleCheck',
          title: 'Saved',
          body: 'Your change has been stored.',
        }
      : null;

  const tones = {
    rose: 'border-rose-300/70 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200',
    emerald:
      'border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      // Rendered even when empty so the live region already exists in the accessibility
      // tree when a message arrives — regions inserted at announcement time are missed.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-end sm:pr-5"
    >
      {state && (
        <div
          className={`pointer-events-auto flex w-full max-w-[420px] items-start gap-3 rounded-2xl border px-4 py-3 shadow-[var(--elev-3)] backdrop-blur-sm ${tones[state.tone]} route-enter`}
        >
          <Icon name={state.icon} className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{state.title}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed opacity-90">{state.body}</p>
          </div>
        </div>
      )}
    </div>
  );
}
