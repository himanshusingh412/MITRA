'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Icon, cx } from '@/components/ui';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';

/**
 * Landing page with authentication.
 *
 * Split-screen: the left panel states what MITRA does, the right panel signs you in.
 * The proposition sits beside the form rather than behind it because a citizen arriving
 * from a forwarded link has no idea what this is, and asking for a password before
 * answering that is how you lose them.
 *
 * The guest path is kept and given real prominence. A welfare product that cannot be
 * looked at without registering excludes exactly the cautious, low-trust users it most
 * needs to reach — and it would make the SIH demo impossible to run in the thirty
 * seconds a judge actually gives you.
 */
export function AuthLanding() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<null | 'form' | 'guest' | 'google'>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    // A reset link lands here with ?reset=<token>; switch straight into that flow.
    const token = new URLSearchParams(window.location.search).get('reset');
    if (token) {
      setResetToken(token);
      setMode('reset');
    }
    fetch('/api/auth', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((b) => setGoogleAvailable(Boolean(b?.data?.googleAvailable)))
      .catch(() => setGoogleAvailable(false));
  }, []);

  async function post(action: string, payload: Record<string, unknown>) {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action, ...payload }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error?.message ?? 'Something went wrong.');
    return body?.data;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy('form');
    setError('');
    setNotice('');

    try {
      if (mode === 'signin') {
        await post('login', { email, password, remember });
        router.replace('/');
        router.refresh();
        return;
      }
      if (mode === 'signup') {
        await post('signup', { email, password, name, remember });
        router.replace('/');
        router.refresh();
        return;
      }
      if (mode === 'forgot') {
        const data = await post('forgot', { email });
        setNotice(data?.message ?? 'If that address has an account, a reset link is on its way.');
      }
      if (mode === 'reset') {
        await post('reset', { token: resetToken, password });
        setNotice('Password updated. Sign in with your new password.');
        setMode('signin');
        setPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
    setBusy(null);
  }

  async function continueAsGuest() {
    setBusy('guest');
    setError('');
    try {
      await post('guest', {});
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the demo.');
      setBusy(null);
    }
  }

  const heading = {
    signin: 'Sign in to MITRA',
    signup: 'Create your MITRA account',
    forgot: 'Reset your password',
    reset: 'Choose a new password',
  }[mode];

  const subheading = {
    signin: 'Pick up where you left off.',
    signup: 'Track applications and documents for your whole family.',
    forgot: 'We will send a reset link to your registered address.',
    reset: 'Use at least 10 characters. A short phrase works well.',
  }[mode];

  return (
    <main id="main" className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* ── Proposition ──────────────────────────────────────────────── */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-emerald-500 p-10 text-white lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Icon name="Bot" className="h-6 w-6" />
          </span>
          <div className="leading-tight">
            <p className="text-base font-extrabold tracking-tight">MITRA</p>
            <p className="text-xs text-white/80">Digital Citizen Assistant</p>
          </div>
        </div>

        <div className="relative max-w-[46ch]">
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight">
            Nearly three quarters of welfare rejections are clerical, not eligibility.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/85">
            MITRA reads your documents, compares them against each other, and tells you what
            would get your application rejected — before you submit it.
          </p>

          <ul className="mt-8 space-y-3.5">
            {[
              { icon: 'GitCompareArrows', t: 'Cross-document verification', d: 'Catches a swapped date of birth that a human reviewer would miss.' },
              { icon: 'Users', t: 'Your whole household', d: 'Parents, children and dependents from one account.' },
              { icon: 'Languages', t: 'In your language', d: 'Voice and text, English and Hindi.' },
            ].map((f) => (
              <li key={f.t} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon name={f.icon} className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-bold">{f.t}</span>
                  <span className="block text-[13px] leading-relaxed text-white/75">{f.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs leading-relaxed text-white/65">
          An independent prototype for Smart India Hackathon 2026. Not an official
          Government of India product.
        </p>
      </section>

      {/* ── Authentication ───────────────────────────────────────────── */}
      <section className="flex items-center justify-center bg-[var(--canvas)] p-5 sm:p-8">
        <div className="w-full max-w-[420px] route-enter">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-400 text-white">
              <Icon name="Bot" className="h-6 w-6" />
            </span>
            <div className="leading-tight">
              <p className="text-base font-extrabold tracking-tight">MITRA</p>
              <p className="muted text-xs">Digital Citizen Assistant</p>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight">{heading}</h2>
          <p className="muted mt-1.5 text-sm">{subheading}</p>

          {(mode === 'signin' || mode === 'signup') && (
            <>
              <Button
                variant="secondary"
                size="lg"
                className="mt-6 w-full"
                disabled={!googleAvailable || busy !== null}
                onClick={() => setError('Google sign-in is not configured on this deployment yet.')}
                ariaLabel="Continue with Google"
              >
                <Icon name="Chrome" className="h-4 w-4" />
                Continue with Google
              </Button>
              {!googleAvailable && (
                <p className="muted mt-2 text-center text-xs">
                  Google sign-in needs OAuth credentials — use email below.
                </p>
              )}

              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-[var(--border)]" />
                <span className="muted text-xs font-semibold uppercase tracking-wide">or</span>
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>
            </>
          )}

          <form onSubmit={submit} className="space-y-4" noValidate>
            {mode === 'signup' && (
              <Field label="Your name" htmlFor="name">
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="input h-11"
                  placeholder="Ravi Kumar"
                />
              </Field>
            )}

            {mode !== 'reset' && (
              <Field label="Email address" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="input h-11"
                  placeholder="you@example.com"
                />
              </Field>
            )}

            {mode !== 'forgot' && (
              <Field
                label={mode === 'reset' ? 'New password' : 'Password'}
                htmlFor="password"
                hint={mode === 'signup' || mode === 'reset' ? 'At least 10 characters' : undefined}
              >
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    required
                    className="input h-11 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="muted absolute right-1 top-1/2 flex h-9 w-10 -translate-y-1/2 items-center justify-center rounded-lg hover:bg-[var(--canvas)]"
                  >
                    <Icon name={showPassword ? 'EyeOff' : 'Eye'} className="h-4 w-4" />
                  </button>
                </div>
              </Field>
            )}

            {(mode === 'signin' || mode === 'signup') && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border)]"
                  />
                  Keep me signed in
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                      setNotice('');
                    }}
                    className="text-sm font-semibold text-brand-500 hover:text-brand-600"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-[13px] font-semibold text-rose-800 dark:bg-rose-500/15 dark:text-rose-300"
              >
                <Icon name="CircleAlert" className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-[13px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
              >
                <Icon name="CircleCheck" className="mt-0.5 h-4 w-4 shrink-0" />
                {notice}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
              {busy === 'form' ? (
                <Icon name="LoaderCircle" className="h-4 w-4 animate-spin" />
              ) : (
                <Icon name={mode === 'signup' ? 'UserPlus' : 'LogIn'} className="h-4 w-4" />
              )}
              {busy === 'form'
                ? 'Please wait'
                : { signin: 'Sign in', signup: 'Create account', forgot: 'Send reset link', reset: 'Update password' }[mode]}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm">
            {mode === 'signin' && (
              <p className="muted">
                New to MITRA?{' '}
                <SwitchLink onClick={() => setMode('signup')}>Create an account</SwitchLink>
              </p>
            )}
            {mode === 'signup' && (
              <p className="muted">
                Already registered?{' '}
                <SwitchLink onClick={() => setMode('signin')}>Sign in</SwitchLink>
              </p>
            )}
            {(mode === 'forgot' || mode === 'reset') && (
              <SwitchLink onClick={() => setMode('signin')}>Back to sign in</SwitchLink>
            )}
          </div>

          <div className="mt-7 border-t border-[var(--border)] pt-6">
            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={continueAsGuest}
              disabled={busy !== null}
            >
              {busy === 'guest' ? (
                <Icon name="LoaderCircle" className="h-4 w-4 animate-spin" />
              ) : (
                <Icon name="Compass" className="h-4 w-4" />
              )}
              {busy === 'guest' ? 'Preparing your demo' : 'Explore without an account'}
            </Button>
            <p className="muted mt-2.5 text-center text-xs leading-relaxed">
              Opens a private demo household with sample documents. Nothing you enter is
              shared, and you can create an account later.
            </p>
          </div>

          <p className="muted mt-6 text-center text-xs">
            <a href="/admin/login" className="hover:underline">
              Government officer sign-in
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="muted mt-1.5 text-xs">{hint}</p>}
    </div>
  );
}

function SwitchLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx('font-semibold text-brand-500 hover:text-brand-600')}
    >
      {children}
    </button>
  );
}
