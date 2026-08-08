'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Icon } from '@/components/ui';

/**
 * Admin sign-in — deliberately a separate route, layout and session from the citizen app.
 *
 * This form does not decide anything. It posts to /api/admin/login, which compares the
 * password against a scrypt hash server-side, counts the lockout server-side, and sets
 * an httpOnly cookie the browser cannot read. The credential is never present in this
 * bundle, and middleware.ts — not this component — is what actually guards /admin.
 *
 * The error message stays intentionally generic: revealing whether an account exists
 * lets an attacker enumerate valid government user IDs.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [officerId, setOfficerId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (locked || busy) return;
    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ officerId, password }),
      });
      const body = await res.json().catch(() => null);

      if (res.ok) {
        setPassword('');
        // Full navigation so middleware re-evaluates with the new cookie.
        router.replace('/admin');
        router.refresh();
        return;
      }

      if (res.status === 429) setLocked(true);
      setError(body?.error?.message ?? 'Those sign-in details were not recognised.');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-brand-50 p-4 dark:from-slate-900 dark:via-slate-900 dark:to-brand-900/40">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lift">
            <Icon name="Landmark" className="h-7 w-7" />
          </span>
          <h1 className="text-xl font-extrabold tracking-tight">MITRA Government Portal</h1>
          <p className="muted mt-1 text-sm">Authorised departmental access only</p>
        </div>

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="officer" className="mb-1.5 block text-[13px] font-semibold">
                Officer ID
              </label>
              <input
                id="officer"
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value)}
                autoComplete="username"
                required
                disabled={locked}
                className="input h-11"
              />
            </div>

            <div>
              <label htmlFor="pw" className="mb-1.5 block text-[13px] font-semibold">
                Password
              </label>
              <input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={locked}
                className="input h-11"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-[13px] font-semibold text-rose-800 dark:bg-rose-500/15 dark:text-rose-300"
              >
                <Icon name="CircleAlert" className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            {locked && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-3 text-[13px] font-semibold text-amber-900 dark:bg-amber-500/15 dark:text-amber-300"
              >
                <Icon name="Lock" className="mt-0.5 h-4 w-4 shrink-0" />
                Too many attempts. Sign-in from this address is locked for 15 minutes —
                contact your department administrator.
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={busy || locked}>
              {busy ? <Icon name="Loader" className="h-4 w-4 animate-spin" /> : <Icon name="LogIn" className="h-4 w-4" />}
              {busy ? 'Verifying' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-5 rounded-xl bg-[var(--canvas)] p-3.5">
            <p className="muted text-xs leading-relaxed">
              <span className="font-bold">Demo account:</span> ask the team for the
              evaluation credentials.
              <br />
              Verified server-side against a scrypt hash, locked out after 5 attempts per
              address. A departmental identity provider and a second factor replace this
              in a deployed system.
            </p>
          </div>
        </Card>

        <div className="mt-5 text-center">
          <Link href="/" className="link-arrow">
            <Icon name="ArrowLeft" className="h-4 w-4" />
            Back to the citizen app
          </Link>
        </div>
      </div>
    </div>
  );
}
