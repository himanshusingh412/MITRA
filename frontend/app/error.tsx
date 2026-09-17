'use client';

import { useEffect } from 'react';
import { Button, Icon } from '@/components/ui';

/**
 * Root error boundary.
 *
 * Two rules govern what this page says. It never shows `error.message` — a stack trace or
 * driver string tells a citizen nothing and tells an attacker something. And it never
 * implies their data is gone, because the most frightening reading of a crash on a welfare
 * app is "my application was lost". Retry comes first because a transient database wake-up
 * is the likeliest cause.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error cleanly for developers without surfacing raw digest noise in overlays
    if (process.env.NODE_ENV === 'development') {
      console.warn('[boundary]', error.message || error.name, error.digest ? `(code: ${error.digest})` : '');
    } else {
      console.error('[boundary]', error.digest ?? error.name);
    }
  }, [error]);

  const handleReset = () => {
    try {
      reset();
    } catch {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-[560px] flex-col items-center justify-center px-5 py-16 text-center"
    >
      <div className="route-enter">
        <span
          aria-hidden="true"
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
        >
          <Icon name="TriangleAlert" className="h-8 w-8" />
        </span>

        <h1 className="text-2xl font-extrabold tracking-tight">Something went wrong</h1>
        <p className="muted mx-auto mt-3 max-w-[44ch] text-sm leading-relaxed">
          This is a problem on our side, not yours. Your saved documents and applications
          are safe. Trying again usually works.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button onClick={handleReset} size="lg">
            <Icon name="RotateCcw" className="h-4 w-4" />
            Try again
          </Button>
          <Button onClick={handleGoHome} variant="secondary" size="lg">
            <Icon name="House" className="h-4 w-4" />
            Go to home
          </Button>
        </div>

        {error.digest && (
          <p className="muted mt-6 text-xs">
            Reference code <span className="font-mono font-semibold">{error.digest}</span> —
            quote this if you contact support.
          </p>
        )}
      </div>
    </main>
  );
}
