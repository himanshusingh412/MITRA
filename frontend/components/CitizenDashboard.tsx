'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/shell';
import { SchemeCard } from '@/components/SchemeCard';
import { Badge, Button, Card, Icon, SectionHeader, cx } from '@/components/ui';
import { useStore } from '@/lib/store';
import { recommendSchemes } from '@/lib/eligibility';
import { verifyDocumentSet } from '@/lib/documentVerification';
import { QUICK_PROMPTS } from '@/lib/assistant';
import { SERVICES } from '@/lib/demoData';
import Link from 'next/link';

export function CitizenDashboard() {
  const { user, t, locale, applications, documents } = useStore();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const recommendations = useMemo(() => recommendSchemes(user, { limit: 4 }), [user]);
  const prompts = QUICK_PROMPTS[locale] ?? QUICK_PROMPTS.en;

  const activeApplications = applications.filter(
    (a) => !['approved', 'disbursed', 'rejected'].includes(a.status),
  ).length;
  const needsAttention = applications.filter((a) => a.status === 'info-needed').length;

  function submitQuery(text: string) {
    const q = text.trim();
    if (!q) return;
    router.push(`/assistant?q=${encodeURIComponent(q)}`);
  }

  return (
    <AppShell>
      <div id="main" className="mx-auto max-w-[1180px] space-y-8">
        {/* ── Hero assistant ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-blue-50 to-emerald-50 p-6 dark:from-brand-500/15 dark:via-blue-500/10 dark:to-emerald-500/10 sm:p-8">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-200/30 blur-3xl dark:bg-brand-500/10"
            aria-hidden="true"
          />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="min-w-0">
              <p className="text-lg font-semibold">
                {t('home.greeting')} {user.name.split(' ')[0]} <span aria-hidden="true">👋</span>
              </p>
              <h2 className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[34px]">
                {t('home.headline')}
              </h2>
              <p className="muted mt-2 text-sm">{t('home.sub')}</p>

              <form
                className="mt-6 flex items-center gap-2 rounded-2xl bg-[var(--surface)] p-2 shadow-card"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitQuery(query);
                }}
              >
                <label htmlFor="ask" className="sr-only">
                  {t('home.headline')}
                </label>
                <input
                  id="ask"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('home.placeholder')}
                  className="input-bare h-11 px-3"
                />
                <Link
                  href="/assistant?voice=1"
                  aria-label="Ask by voice"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-brand-500 transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10"
                >
                  <Icon name="Mic" className="h-5 w-5" />
                </Link>
                <button
                  type="submit"
                  aria-label="Send question"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white transition-colors hover:bg-brand-600"
                >
                  <Icon name="Send" className="h-[18px] w-[18px]" />
                </button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                {prompts.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => submitQuery(p.prompt)}
                    className="surface flex h-10 items-center gap-2 rounded-xl px-3.5 text-[13px] font-semibold transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10"
                  >
                    <Icon name={p.icon} className="h-4 w-4 text-brand-500" />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status summary — the three things a returning citizen checks first */}
            <div className="stagger grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <HeroStat
                icon="ClipboardList"
                label="Active applications"
                value={String(activeApplications)}
                href="/applications"
                tone="brand"
              />
              <HeroStat
                icon="AlertTriangle"
                label="Need your action"
                value={String(needsAttention)}
                href="/applications"
                tone={needsAttention > 0 ? 'warning' : 'brand'}
              />
              <HeroStat
                icon="FileCheck2"
                label="Documents saved"
                value={String(documents.filter((d) => d.ownerId === user.id).length)}
                href="/documents"
                tone="success"
              />
            </div>
          </div>
        </section>

        {/* ── Document health nudge ──────────────────────────────────────── */}
        <DocumentHealthBanner />

        {/* ── Recommended schemes ────────────────────────────────────────── */}
        <section>
          <SectionHeader
            title={t('home.recommended')}
            action={{ label: t('home.viewAllSchemes'), href: '/schemes' }}
          />
          <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommendations.map(({ scheme, result }) => (
              <SchemeCard key={scheme.id} scheme={scheme} result={result} ctaLabel={t('home.checkNow')} />
            ))}
          </div>
        </section>

        {/* ── Popular services ───────────────────────────────────────────── */}
        <section>
          <SectionHeader
            title={t('home.popularServices')}
            action={{ label: t('home.viewAllServices'), href: '/services' }}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {SERVICES.slice(0, 6).map((s) => (
              <Link
                key={s.id}
                href={s.href}
                className="card card-interactive flex flex-col items-center gap-2.5 p-4 text-center"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: `${s.accent}18`, color: s.accent }}
                >
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold leading-tight">{s.name}</span>
              </Link>
            ))}
            <Link
              href="/services"
              className="card card-interactive flex flex-col items-center justify-center gap-2.5 p-4 text-center"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300">
                <Icon name="Grid2x2Plus" className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold leading-tight">More Services</span>
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function HeroStat({
  icon,
  label,
  value,
  href,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  href: string;
  tone: 'brand' | 'warning' | 'success';
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  };
  return (
    <Link href={href} className="card card-interactive flex items-center gap-3 p-4">
      <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-bold leading-none">{value}</span>
        <span className="muted mt-1 block truncate text-xs">{label}</span>
      </span>
    </Link>
  );
}

/**
 * Surfaces the document-verification result on the home screen. Citizens do not think
 * to check their paperwork until an application is rejected, so MITRA raises it first.
 */
function DocumentHealthBanner() {
  const { user, documents } = useStore();
  const report = useMemo(() => verifyDocumentSet(user, documents), [user, documents]);

  const blockers = report.issues.filter((i) => i.severity === 'blocker');
  if (blockers.length === 0) return null;

  return (
    <Card className="flex flex-col gap-4 border-amber-200 bg-amber-50/60 p-5 dark:border-amber-500/25 dark:bg-amber-500/10 sm:flex-row sm:items-center">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
        <Icon name="ShieldAlert" className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold">
            {blockers.length} document {blockers.length === 1 ? 'issue' : 'issues'} could get your application rejected
          </h3>
          <Badge tone="warning">{report.consistencyScore}% consistent</Badge>
        </div>
        <p className="muted mt-1 text-[13px] leading-relaxed">{blockers[0].title}. {report.summary}</p>
      </div>
      <Button href="/documents/verify" variant="primary" size="md" className="shrink-0">
        Review and fix
        <Icon name="ArrowRight" className="h-4 w-4" />
      </Button>
    </Card>
  );
}
