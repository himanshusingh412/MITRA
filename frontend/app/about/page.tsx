'use client';

import Link from 'next/link';
import { Icon, cx } from '@/components/ui';

/**
 * Public landing page — the MITRA brand story.
 *
 * Mirrors the project's identity sheet: logo lockup, expanded acronym, the twelve
 * capabilities, and the trust strip. This is the page a judge or a department head
 * lands on before they see the product itself, so it explains *what* and *why* while
 * the app itself demonstrates *how*.
 */

const CAPABILITIES = [
  {
    n: '01',
    title: 'Multilingual AI Assistant',
    body: 'Chat or speak in your preferred language. Five languages today, with the architecture to add the rest of the 22 scheduled languages without code changes.',
    icon: 'Languages',
    tone: 'blue',
  },
  {
    n: '02',
    title: 'Voice-First Assistance',
    body: 'Ask questions naturally by voice, and hear the answer read back. Built for everyone, including first-time internet users who cannot type comfortably.',
    icon: 'Mic',
    tone: 'violet',
  },
  {
    n: '03',
    title: 'Personalized Scheme Finder',
    body: 'Describe your life situation, not a scheme name. Recommendations follow your profile, location, occupation and the events happening in your family.',
    icon: 'Target',
    tone: 'green',
  },
  {
    n: '04',
    title: 'Eligibility Checker',
    body: 'Check eligibility instantly and see the reasoning rule by rule — which criteria you meet, which you do not, and exactly what the benefit is worth.',
    icon: 'CircleCheckBig',
    tone: 'teal',
  },
  {
    n: '05',
    title: 'Document Assistant',
    body: 'Know the exact documents you need for your own profile — not a generic list — and where to get the ones you are missing.',
    icon: 'FileEdit',
    tone: 'amber',
  },
  {
    n: '06',
    title: 'Application Guidance',
    body: 'Step-by-step guidance to fill and submit applications correctly, with progress saved so you can stop and come back.',
    icon: 'ClipboardList',
    tone: 'blue',
  },
  {
    n: '07',
    title: 'One-Stop Services',
    body: 'Certificates, licences, pensions, scholarships and subsidies reached from one place, instead of a different portal and login for each.',
    icon: 'Landmark',
    tone: 'violet',
  },
  {
    n: '08',
    title: 'Application Tracking',
    body: 'Track every application in one timeline and see what each one is actually waiting on, at every stage.',
    icon: 'Search',
    tone: 'green',
  },
  {
    n: '09',
    title: 'Smart Notifications',
    body: 'Reminders for deadlines, renewals, missing documents and status changes — before a certificate lapses, not after.',
    icon: 'Bell',
    tone: 'teal',
  },
  {
    n: '10',
    title: 'AI Government Q&A',
    body: 'Ask any government-related question and get an answer grounded in the real scheme catalogue, in plain language.',
    icon: 'Bot',
    tone: 'violet',
  },
  {
    n: '11',
    title: 'Location-Based Services',
    body: 'Find nearby government offices, service centres and the schemes relevant to your region and state.',
    icon: 'MapPin',
    tone: 'amber',
  },
  {
    n: '12',
    title: 'Secure & Privacy-Focused',
    body: 'Your documents are read on your device. Nothing is sent anywhere to answer you, and consent is required before anyone acts on your behalf.',
    icon: 'ShieldCheck',
    tone: 'blue',
  },
];

const TONES: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  teal: 'bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300',
};

const LANGUAGES = ['हिंदी', 'English', 'தமிழ்', 'తెలుగు', 'বাংলা', 'मराठी'];

const TRUST = [
  { icon: 'Lock', title: 'Secure', body: 'Your data is always protected' },
  { icon: 'ShieldCheck', title: 'Private', body: 'We respect your privacy' },
  { icon: 'Users', title: 'Inclusive', body: 'Designed for every citizen of India' },
  { icon: 'HeartHandshake', title: 'Reliable', body: 'Accurate information, always' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <main id="main" className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
        {/* ── Masthead ─────────────────────────────────────────────────── */}
        <header className="mb-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 via-brand-400 to-emerald-400 text-white shadow-lift">
                <Icon name="Bot" className="h-9 w-9" strokeWidth={2.2} />
              </span>
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-brand-800 dark:text-brand-200 sm:text-5xl">
                  MITRA
                </h1>
                <p className="mt-1 text-sm font-semibold">
                  <span className="text-brand-600 dark:text-brand-300">M</span>ultilingual{' '}
                  <span className="text-brand-600 dark:text-brand-300">I</span>ntelligent{' '}
                  <span className="text-brand-600 dark:text-brand-300">T</span>echnology
                  <br />
                  for <span className="text-brand-600 dark:text-brand-300">R</span>esponsive{' '}
                  <span className="text-brand-600 dark:text-brand-300">A</span>ssistance
                </p>
              </div>
            </div>

            <div className="lg:border-l lg:border-[var(--border)] lg:pl-8">
              <h2 className="text-xl font-bold leading-tight text-brand-800 dark:text-brand-200">
                Your AI Companion for
                <br />
                Government Services &amp; Schemes
              </h2>
              <div className="mt-4 flex flex-wrap gap-5">
                {[
                  { icon: 'LayoutGrid', head: 'One Platform', sub: 'Many Services' },
                  { icon: 'MessageCircle', head: 'One Assistant', sub: 'All Languages' },
                  { icon: 'Users', head: 'One Goal', sub: 'Empowered Citizen' },
                ].map((p) => (
                  <div key={p.head} className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15">
                      <Icon name={p.icon} className="h-4 w-4" />
                    </span>
                    <span className="leading-tight">
                      <span className="block text-xs font-bold">{p.head}</span>
                      <span className="muted block text-[11px]">{p.sub}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-6 border-t border-[var(--border)] pt-5 text-center text-base font-semibold">
            Your <span className="text-brand-600 dark:text-brand-300">Voice</span>. Your{' '}
            <span className="text-emerald-600 dark:text-emerald-400">Language</span>. Your{' '}
            <span className="text-violet-600 dark:text-violet-400">Government</span>.
          </p>
        </header>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="mb-12 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-violet-50 to-blue-50 p-6 dark:from-brand-500/15 dark:via-violet-500/10 dark:to-blue-500/10 sm:p-10">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_320px]">
            <div>
              <h2 className="text-[26px] font-extrabold leading-snug tracking-tight sm:text-[32px]">
                MITRA <span className="text-emerald-600 dark:text-emerald-400">understands</span> you,
                <br />
                in your language, and helps you
                <br />
                access what you{' '}
                <span className="text-violet-600 dark:text-violet-400">deserve</span>.
              </h2>

              <div className="mt-6 flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <span
                    key={l}
                    className="surface rounded-xl px-3.5 py-2 text-sm font-semibold shadow-card"
                  >
                    {l}
                  </span>
                ))}
                <span className="muted flex items-center px-2 text-sm font-semibold">+ More</span>
              </div>

              <div className="surface mt-6 flex items-start gap-3 rounded-2xl p-4 shadow-card">
                <Icon name="AudioLines" className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
                <div className="min-w-0">
                  <p className="text-sm font-bold">Talk or type to get started</p>
                  <p className="muted mt-0.5 text-[13px]">
                    Example: &ldquo;मुझे छात्रवृत्ति योजनाओं के बारे में बताइए&rdquo;
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                >
                  Open MITRA
                  <Icon name="ArrowRight" className="h-4 w-4" />
                </Link>
                <Link
                  href="/assistant?voice=1"
                  className="surface inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-semibold transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10"
                >
                  <Icon name="Mic" className="h-4 w-4 text-brand-500" />
                  Try speaking
                </Link>
              </div>
            </div>

            {/* Phone mockup */}
            <div className="mx-auto w-full max-w-[280px]">
              <div className="rounded-[2rem] border-[6px] border-slate-800 bg-[var(--surface)] p-3 shadow-lift dark:border-slate-700">
                <p className="mb-3 text-center text-sm font-extrabold text-brand-600 dark:text-brand-300">
                  MITRA AI
                </p>
                <div className="rounded-2xl bg-brand-50 p-4 dark:bg-brand-500/15">
                  <p className="text-sm font-semibold">
                    <span aria-hidden="true">👋</span> Namaste!
                  </p>
                  <p className="mt-1.5 text-sm">How can I help you today?</p>
                </div>
                <div className="mt-5 flex flex-col items-center gap-2 pb-2">
                  <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
                    <Icon name="Mic" className="relative h-6 w-6" />
                  </span>
                  <p className="muted text-xs font-semibold">Tap to speak</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Capabilities ─────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="mb-8 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-[var(--border)]" />
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              What <span className="text-brand-600 dark:text-brand-300">MITRA</span> Can Do For You
            </h2>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="h-px w-10 bg-[var(--border)]" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((c) => (
              <article key={c.n} className="card flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <div className="mb-4 flex items-start gap-3">
                  <span className="muted rounded-lg bg-[var(--canvas)] px-2 py-1 text-[11px] font-bold">
                    {c.n}
                  </span>
                  <span
                    className={cx(
                      'ml-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                      TONES[c.tone],
                    )}
                  >
                    <Icon name={c.icon} className="h-6 w-6" />
                  </span>
                </div>
                <h3 className="text-[15px] font-bold leading-snug text-brand-800 dark:text-brand-200">
                  {c.title}
                </h3>
                <p className="muted mt-2 text-[13px] leading-relaxed">{c.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Trust ────────────────────────────────────────────────────── */}
        <section className="mb-10 rounded-3xl bg-emerald-50/60 p-6 dark:bg-emerald-500/[0.08] sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_2fr]">
            <div className="flex gap-3">
              <Icon name="ShieldCheck" className="h-7 w-7 shrink-0 text-emerald-600" />
              <div>
                <h2 className="text-lg font-bold">Trusted. Secure. Citizen First.</h2>
                <p className="muted mt-1.5 text-[13px] leading-relaxed">
                  <span className="font-bold">MITRA</span> is built to make government services
                  accessible, simple and inclusive for every citizen, in every language.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:border-l lg:border-emerald-200/60 lg:pl-8 dark:lg:border-emerald-500/20">
              {TRUST.map((t) => (
                <div key={t.title} className="text-center">
                  <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-card dark:bg-emerald-500/15">
                    <Icon name={t.icon} className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-bold">{t.title}</p>
                  <p className="muted mt-0.5 text-[11px] leading-snug">{t.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <p className="muted mb-8 text-center text-xs leading-relaxed">
          MITRA is an independent prototype built for Smart India Hackathon 2026. It is not an
          official Government of India product. Eligibility results are advisory — please confirm at
          a Common Service Centre before relying on them.
        </p>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="relative overflow-hidden bg-gradient-to-r from-brand-800 to-brand-900 px-4 py-6 text-white sm:px-8">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Icon name="Landmark" className="h-5 w-5" />
            </span>
            <p className="text-sm">
              <span className="font-extrabold text-emerald-300">MITRA</span>
              <span className="text-white/70">
                {' '}
                — Multilingual Intelligent Technology for Responsive Assistance
              </span>
            </p>
          </div>
          <p className="text-right text-sm font-semibold leading-tight">
            Empowering Citizens.
            <br />
            <span className="text-white/70">Strengthening India.</span>
          </p>
        </div>
        {/* Tricolour flourish */}
        <div className="pointer-events-none absolute bottom-0 right-0 h-full w-64 opacity-70" aria-hidden="true">
          <svg viewBox="0 0 260 90" className="h-full w-full" preserveAspectRatio="none">
            <path d="M0 70 Q 90 30 260 55 L260 90 L0 90 Z" fill="#FF9933" opacity="0.55" />
            <path d="M0 78 Q 90 42 260 66 L260 90 L0 90 Z" fill="#FFFFFF" opacity="0.35" />
            <path d="M0 86 Q 90 56 260 78 L260 90 L0 90 Z" fill="#138808" opacity="0.55" />
          </svg>
        </div>
      </footer>
    </div>
  );
}
