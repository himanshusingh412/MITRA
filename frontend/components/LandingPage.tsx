'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon, cx } from '@/components/ui';
import { AuthPanel } from '@/components/AuthPanel';

/**
 * Public landing page — the application's front door.
 *
 * Nothing here authenticates on its own. A visitor sees what MITRA is, then chooses one
 * of two clearly separated doors: the citizen portal, which opens an auth dialog, or the
 * government portal, which is a different route with a different session entirely. That
 * separation is the point — mixing them is how an admin surface ends up reachable from a
 * citizen flow.
 *
 * Motion is CSS-only (see globals.css). The audience is rural users on low-end Android
 * over 3G, so the animation library that would make this marginally smoother would also
 * make the page measurably slower to reach interactive.
 */
export function LandingPage({ signedIn }: { signedIn: boolean }) {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[var(--canvas)]">
      <SiteHeader signedIn={signedIn} onSignIn={() => setAuthOpen(true)} />

      <main id="main">
        <Hero signedIn={signedIn} onSignIn={() => setAuthOpen(true)} />
        <TrustStrip />
        <Features />
        <HowItWorks />
        <VerificationPreview />
        <ClosingCta signedIn={signedIn} onSignIn={() => setAuthOpen(true)} />
      </main>

      <SiteFooter />

      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}
    </div>
  );
}

/* ── Header ─────────────────────────────────────────────────────────────── */

function SiteHeader({ signedIn, onSignIn }: { signedIn: boolean; onSignIn: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--canvas)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-400 to-emerald-400 text-white">
            <Icon name="Bot" className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="leading-tight">
            <p className="text-base font-extrabold tracking-tight">MITRA</p>
            <p className="muted hidden text-[11px] sm:block">Digital Citizen Assistant</p>
          </div>
        </div>

        <nav className="muted ml-auto hidden items-center gap-6 text-sm font-semibold md:flex">
          <a href="#features" className="transition-colors hover:text-brand-500">Features</a>
          <a href="#how" className="transition-colors hover:text-brand-500">How it works</a>
          <a href="#verification" className="transition-colors hover:text-brand-500">Verification</a>
        </nav>

        <div className="ml-auto flex items-center gap-2.5 md:ml-0">
          <Link
            href="/admin/login"
            className="muted hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors hover:bg-brand-50 sm:flex dark:hover:bg-brand-500/10"
          >
            <Icon name="Landmark" className="h-4 w-4" />
            Government Portal
          </Link>
          {signedIn ? (
            <Link
              href="/dashboard"
              className="press flex h-10 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Go to dashboard
              <Icon name="ArrowRight" className="h-4 w-4" />
            </Link>
          ) : (
            <button
              onClick={onSignIn}
              className="press flex h-10 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Continue as Citizen
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── Hero ───────────────────────────────────────────────────────────────── */

function Hero({ signedIn, onSignIn }: { signedIn: boolean; onSignIn: () => void }) {
  return (
    <section className="relative overflow-hidden">
      {/* Soft gradient wash. Pointer-events-none so it can never eat a tap. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50 via-transparent to-emerald-50/60 dark:from-brand-500/10 dark:to-emerald-500/5"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-[1180px] gap-12 px-5 py-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-24">
        <div className="route-enter">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-bold">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Smart India Hackathon 2026 · Bharat Pragati
          </span>

          <h1 className="mt-5 text-[34px] font-extrabold leading-[1.08] tracking-tight sm:text-[44px] lg:text-[52px]">
            One AI companion for every citizen&apos;s government journey
          </h1>

          <p className="muted mt-5 max-w-[56ch] text-[15px] leading-relaxed sm:text-base">
            MITRA helps you discover the schemes you qualify for, verifies your documents
            against each other before you apply, guides you through the application, and
            tracks it to the day the benefit arrives — in your own language.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {signedIn ? (
              <Link
                href="/dashboard"
                className="press inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-6 text-base font-semibold text-white shadow-[var(--elev-2)] transition-colors hover:bg-brand-600"
              >
                <Icon name="LayoutDashboard" className="h-5 w-5" />
                Go to your dashboard
              </Link>
            ) : (
              <button
                onClick={onSignIn}
                className="press inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-6 text-base font-semibold text-white shadow-[var(--elev-2)] transition-colors hover:bg-brand-600"
              >
                <Icon name="UserRound" className="h-5 w-5" />
                Continue as Citizen
              </button>
            )}

            <Link
              href="/admin/login"
              className="press surface inline-flex h-12 items-center gap-2 rounded-xl px-6 text-base font-semibold transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10"
            >
              <Icon name="Landmark" className="h-5 w-5" />
              Government / Admin Portal
            </Link>
          </div>

          <p className="muted mt-4 text-xs leading-relaxed">
            Citizen and government sessions are completely separate. Signing in to one
            never grants access to the other.
          </p>
        </div>

        <HeroIllustration />
      </div>
    </section>
  );
}

/**
 * Hero illustration.
 *
 * Layered cards rather than a stock image: it shows the actual product surfaces — a
 * scheme match, a verification finding, a language switch — so the first thing a visitor
 * sees is what MITRA does, not decoration. Built from DOM elements so it stays crisp at
 * any density and costs nothing to download.
 */
function HeroIllustration() {
  return (
    <div aria-hidden="true" className="relative mx-auto hidden h-[420px] w-full max-w-[460px] lg:block">
      <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-brand-500/12 to-emerald-500/12 blur-2xl" />

      {/* Assistant card */}
      <div className="glass absolute left-0 top-6 w-[300px] rounded-2xl p-4 shadow-[var(--elev-2)] float-slow">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-white">
            <Icon name="Bot" className="h-4 w-4" />
          </span>
          <p className="text-sm font-bold">MITRA Assistant</p>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed">
          &ldquo;मैं किसान हूँ और मेरी बेटी कॉलेज जाती है&rdquo;
        </p>
        <div className="mt-3 rounded-xl bg-[var(--surface)]/70 p-2.5 text-[12px] leading-relaxed">
          Found 3 schemes for your household — PM-KISAN, Post Matric Scholarship and
          Ayushman Bharat.
        </div>
      </div>

      {/* Verification card */}
      <div className="glass absolute right-0 top-[168px] w-[276px] rounded-2xl p-4 shadow-[var(--elev-2)] float-slower">
        <div className="flex items-center gap-2">
          <Icon name="ShieldAlert" className="h-4 w-4 text-amber-600" />
          <p className="text-sm font-bold">Document check</p>
        </div>
        <p className="mt-2.5 text-[12px] leading-relaxed">
          Aadhaar shows <strong>14/03/1992</strong>, Land Record shows{' '}
          <strong>03/14/1992</strong> — day and month appear swapped.
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
            Cross-document
          </span>
          <span className="muted text-[10px] font-semibold">92% confidence</span>
        </div>
      </div>

      {/* Eligibility card */}
      <div className="glass absolute bottom-2 left-8 w-[250px] rounded-2xl p-4 shadow-[var(--elev-2)] float-slow">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">PM-KISAN</p>
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
            Eligible
          </span>
        </div>
        <p className="muted mt-1 text-[11px]">4 of 4 criteria met</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
          <div className="h-full w-full rounded-full bg-emerald-500" />
        </div>
      </div>
    </div>
  );
}

/* ── Trust strip ────────────────────────────────────────────────────────── */

function TrustStrip() {
  const stats = [
    { value: '18', label: 'Schemes in catalogue' },
    { value: '22', label: 'Languages planned' },
    { value: '100', label: 'Field pairs cross-checked' },
    { value: '73%', label: 'Rejections that are clerical' },
  ];
  return (
    <section className="border-y border-[var(--border)] bg-[var(--surface)]">
      <dl className="stagger mx-auto grid max-w-[1180px] grid-cols-2 gap-6 px-5 py-8 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <dt className="sr-only">{s.label}</dt>
            <dd>
              <span className="block text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl">
                {s.value}
              </span>
              <span className="muted mt-1 block text-xs font-semibold">{s.label}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ── Features ───────────────────────────────────────────────────────────── */

const FEATURES = [
  { icon: 'Sparkles', title: 'AI scheme recommendation', body: 'Describe your situation once. MITRA ranks every scheme against your household.', accent: 'brand' },
  { icon: 'ScanSearch', title: 'AI document verification', body: 'Compares every document against every other and explains each disagreement.', accent: 'amber' },
  { icon: 'ShieldCheck', title: 'DigiLocker integration', body: 'Pull documents signed at source. Signed copies outrank photographed ones.', accent: 'emerald' },
  { icon: 'Mic', title: 'Voice assistant', body: 'Speak instead of typing. Works in Hindi and English, on-device.', accent: 'violet' },
  { icon: 'Languages', title: 'Multilingual', body: 'Built to add Indian languages without touching a single component.', accent: 'blue' },
  { icon: 'Users', title: 'Family dashboard', body: 'Parents, children and dependents managed from one household account.', accent: 'rose' },
  { icon: 'ClipboardList', title: 'Application tracking', body: 'Every status change recorded with a reason, not just a colour.', accent: 'brand' },
  { icon: 'BellRing', title: 'Smart reminders', body: 'Renewals and deadlines before they lapse — not after.', accent: 'amber' },
  { icon: 'CircleCheck', title: 'AI eligibility checker', body: 'Criterion-by-criterion, so you know exactly why you qualify.', accent: 'emerald' },
];

const ACCENT: Record<string, string> = {
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
};

function Features() {
  return (
    <section id="features" className="mx-auto max-w-[1180px] scroll-mt-20 px-5 py-16 lg:py-20">
      <SectionIntro
        eyebrow="What it does"
        title="Everything a citizen needs, in one place"
        body="Nine capabilities that together cover the journey from not knowing a scheme exists to the benefit arriving."
      />
      <div className="stagger mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <article key={f.title} className="card card-interactive group p-5">
            <span
              aria-hidden="true"
              className={cx('flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-105', ACCENT[f.accent])}
            >
              <Icon name={f.icon} className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-[15px] font-bold">{f.title}</h3>
            <p className="muted mt-1.5 text-[13px] leading-relaxed">{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ── How it works ───────────────────────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    { icon: 'Search', title: 'Discover', body: 'Tell MITRA about yourself once, by voice or text.' },
    { icon: 'ScanSearch', title: 'Verify', body: 'Documents are cross-checked before anything is submitted.' },
    { icon: 'Send', title: 'Apply', body: 'Guided step by step with your details filled in.' },
    { icon: 'Activity', title: 'Track', body: 'Every status change, with the reason behind it.' },
    { icon: 'IndianRupee', title: 'Receive', body: 'Reminders keep certificates valid so payment is not held up.' },
  ];

  return (
    <section id="how" className="scroll-mt-20 border-y border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-[1180px] px-5 py-16 lg:py-20">
        <SectionIntro
          eyebrow="How it works"
          title="Five steps, start to benefit"
          body="The same journey a citizen makes today — with the failure points removed."
        />

        <ol className="stagger relative mt-12 grid gap-8 md:grid-cols-5 md:gap-4">
          {/* The connecting rail. Hidden on mobile, where the list reads vertically. */}
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-[26px] hidden h-0.5 bg-gradient-to-r from-brand-200 via-brand-400 to-emerald-400 md:block dark:from-brand-500/30 dark:via-brand-500/50 dark:to-emerald-500/40"
          />
          {steps.map((s, i) => (
            <li key={s.title} className="relative flex gap-4 md:block">
              <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--canvas)] text-brand-500 md:mx-auto">
                <Icon name={s.icon} className="h-6 w-6" />
              </span>
              <div className="md:mt-4 md:text-center">
                <p className="muted text-[11px] font-bold uppercase tracking-wide">Step {i + 1}</p>
                <h3 className="mt-0.5 text-[15px] font-bold">{s.title}</h3>
                <p className="muted mt-1 text-[13px] leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── Verification preview ───────────────────────────────────────────────── */

const PIPELINE = [
  { icon: 'Upload', title: 'Documents arrive', body: 'Uploaded by you, or fetched signed from DigiLocker.' },
  { icon: 'ScanText', title: 'AI extracts fields', body: 'Name, date of birth, address, gender, ID number, father’s name.' },
  { icon: 'GitCompareArrows', title: 'Cross-document check', body: 'Every document compared against every other — 100 field pairs.' },
  { icon: 'TriangleAlert', title: 'Mismatch detected', body: '“Day and month appear swapped between the two documents.”' },
  { icon: 'Lightbulb', title: 'Correction suggested', body: 'Which document to fix, to which value, and where to go.' },
  { icon: 'CircleCheck', title: 'Ready to apply', body: 'A downloadable report you can carry to a service centre.' },
];

function VerificationPreview() {
  return (
    <section id="verification" className="mx-auto max-w-[1180px] scroll-mt-20 px-5 py-16 lg:py-20">
      <SectionIntro
        eyebrow="Flagship capability"
        title="The rejection you never receive"
        body="Nearly three quarters of welfare rejections are clerical — a spelling variant, a swapped date, a lapsed certificate. MITRA finds them before submission, and explains why each one matters."
      />

      <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <ol className="stagger space-y-2.5">
          {PIPELINE.map((s, i) => (
            <li key={s.title} className="card card-interactive flex gap-3.5 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--canvas)] text-brand-500">
                <Icon name={s.icon} className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  <span className="muted mr-1.5 tabular-nums">{i + 1}.</span>
                  {s.title}
                </p>
                <p className="muted mt-0.5 text-[13px] leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* A real finding, in the shape the product actually renders it. */}
        <div className="card overflow-hidden lg:sticky lg:top-24">
          <div className="border-b border-[var(--border)] bg-[var(--canvas)] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">Verification report</p>
                <p className="muted text-xs">9 documents · 100 field pairs compared</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold tabular-nums text-amber-600">54%</p>
                <p className="muted text-[10px] font-bold uppercase tracking-wide">Consistency</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-5">
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-amber-200/70 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900 dark:bg-amber-500/25 dark:text-amber-200">
                  Worth fixing
                </span>
                <span className="rounded-md bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                  Cross-document
                </span>
                <span className="muted ml-auto text-[11px] font-semibold">92% confidence</span>
              </div>
              <p className="mt-2.5 text-sm font-bold">
                Date of birth differs between Aadhaar Card and Land Record
              </p>
              <p className="muted mt-1 text-[13px] leading-relaxed">
                Aadhaar Card says &ldquo;14/03/1992&rdquo;, Land Record says
                &ldquo;03/14/1992&rdquo;. Day and month appear swapped between the two
                documents.
              </p>
              <div className="mt-3 rounded-lg bg-[var(--surface)] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                  What to do
                </p>
                <p className="mt-1 text-[13px] leading-relaxed">
                  Apply for a correction on your Land Record so it matches your Aadhaar —{' '}
                  <strong>14/03/1992</strong>.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-800 dark:bg-rose-500/20 dark:text-rose-300">
                  Will likely cause rejection
                </span>
                <span className="muted rounded-md bg-[var(--canvas)] px-2 py-0.5 text-[10px] font-bold">
                  Document expiry
                </span>
              </div>
              <p className="mt-2.5 text-sm font-bold">Income Certificate has expired</p>
              <p className="muted mt-1 text-[13px] leading-relaxed">
                It lapsed 36 days ago. Most departments reject applications carrying an
                expired certificate outright.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Closing ────────────────────────────────────────────────────────────── */

function ClosingCta({ signedIn, onSignIn }: { signedIn: boolean; onSignIn: () => void }) {
  return (
    <section className="mx-auto max-w-[1180px] px-5 pb-20">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-emerald-500 px-6 py-14 text-center text-white sm:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative">
          <h2 className="mx-auto max-w-[22ch] text-[28px] font-extrabold leading-tight tracking-tight sm:text-[34px]">
            Find out what you are entitled to
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-[15px] leading-relaxed text-white/85">
            It takes about two minutes, and you can look around before creating an account.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {signedIn ? (
              <Link
                href="/dashboard"
                className="press inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-base font-bold text-brand-600 transition-transform"
              >
                Go to your dashboard
                <Icon name="ArrowRight" className="h-5 w-5" />
              </Link>
            ) : (
              <button
                onClick={onSignIn}
                className="press inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-base font-bold text-brand-600 transition-transform"
              >
                Continue as Citizen
                <Icon name="ArrowRight" className="h-5 w-5" />
              </button>
            )}
            <Link
              href="/admin/login"
              className="press inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <Icon name="Landmark" className="h-5 w-5" />
              Government Portal
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-[1180px] px-5 py-8">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-emerald-400 text-white">
            <Icon name="Bot" className="h-4 w-4" />
          </span>
          <p className="text-sm font-bold">
            MITRA <span className="muted font-medium">— Multilingual Intelligent Technology for Responsive Assistance</span>
          </p>
        </div>
        <p className="muted mt-4 max-w-[80ch] text-xs leading-relaxed">
          An independent prototype built for Smart India Hackathon 2026. It is not an
          official Government of India product. Eligibility results are advisory — always
          confirm at a Common Service Centre before you rely on them.
        </p>
      </div>
    </footer>
  );
}

function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-[60ch] text-center">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-500">{eyebrow}</p>
      <h2 className="mt-2.5 text-[26px] font-extrabold leading-tight tracking-tight sm:text-[32px]">
        {title}
      </h2>
      <p className="muted mt-3.5 text-[15px] leading-relaxed">{body}</p>
    </div>
  );
}

/* ── Auth dialog ────────────────────────────────────────────────────────── */

/**
 * Citizen authentication, in a modal.
 *
 * Focus is moved into the dialog on open and restored to the trigger on close, Escape
 * dismisses, and the background is inert to a screen reader — a modal that traps sighted
 * users but not keyboard users is worse than no modal.
 */
function AuthDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<Element | null>(null);

  useEffect(() => {
    returnFocusTo.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    // Stop the page behind scrolling under the dialog on mobile.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    ref.current?.querySelector<HTMLElement>('input, button')?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      (returnFocusTo.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        className="surface route-enter max-h-[92dvh] w-full max-w-[440px] overflow-y-auto rounded-t-3xl p-6 shadow-[var(--elev-3)] sm:rounded-3xl sm:p-8"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-400 text-white">
              <Icon name="Bot" className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p id="auth-dialog-title" className="text-base font-extrabold tracking-tight">
                Citizen Portal
              </p>
              <p className="muted text-xs">Your household, your documents</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="muted -mr-1.5 -mt-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-[var(--canvas)]"
          >
            <Icon name="X" className="h-5 w-5" />
          </button>
        </div>

        <AuthPanel redirectTo="/dashboard" />
      </div>
    </div>
  );
}
