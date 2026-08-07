'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Icon } from '@/components/ui';
import { writeAdminSession } from '@/components/adminShell';

/**
 * Admin sign-in — deliberately a separate route, layout and session from the citizen app.
 *
 * The error message is intentionally generic: revealing whether an account exists lets an
 * attacker enumerate valid government user IDs. Same message, same timing, every failure.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [officerId, setOfficerId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const locked = attempts >= 5;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    setBusy(true);
    setError('');

    window.setTimeout(() => {
      // Prototype credential check. Production replaces this with the departmental
      // identity provider plus a second factor; the UI contract does not change.
      if (officerId.trim().toLowerCase() === 'officer' && password === 'mitra2026') {
        writeAdminSession({
          name: 'Priya Sharma',
          role: 'District Welfare Officer',
          district: 'Muzaffarpur',
        });
        router.push('/admin');
      } else {
        setAttempts((a) => a + 1);
        setError('Those sign-in details were not recognised.');
        setBusy(false);
      }
    }, 600);
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
                className="surface h-11 w-full rounded-xl px-3 text-sm outline-none"
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
                className="surface h-11 w-full rounded-xl px-3 text-sm outline-none"
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
                Too many attempts. This account is temporarily locked — contact your department
                administrator.
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={busy || locked}>
              {busy ? <Icon name="Loader" className="h-4 w-4 animate-spin" /> : <Icon name="LogIn" className="h-4 w-4" />}
              {busy ? 'Verifying' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-5 rounded-xl bg-[var(--canvas)] p-3.5">
            <p className="muted text-xs leading-relaxed">
              <span className="font-bold">Demo credentials:</span> officer / mitra2026
              <br />
              Rate limiting, CAPTCHA and a second factor apply in a deployed system.
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
