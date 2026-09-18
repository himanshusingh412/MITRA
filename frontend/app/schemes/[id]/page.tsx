'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell';
import {
  ACCENTS,
  Badge,
  Button,
  Card,
  EligibilityBadge,
  EmptyState,
  Icon,
  ProgressBar,
  cx,
} from '@/components/ui';
import { useStore } from '@/lib/store';
import { buildChecklist, evaluateScheme } from '@/lib/eligibility';
import { getScheme, SECTOR_LABELS } from '@/lib/schemes';

export default function SchemeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, allPeople, documents, createApplication, applications } = useStore();
  const router = useRouter();
  const [personId, setPersonId] = useState(user.id);

  const scheme = getScheme(id);
  const person = allPeople.find((p) => p.id === personId) ?? user;

  const result = useMemo(() => (scheme ? evaluateScheme(person, scheme) : null), [person, scheme]);
  const checklist = useMemo(
    () => (scheme ? buildChecklist(person, scheme, documents) : []),
    [person, scheme, documents],
  );

  if (!scheme || !result) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[900px]">
          <EmptyState
            icon="FileQuestion"
            title="Scheme not found"
            body="This scheme is not in the MITRA catalogue. Browse everything we cover, or ask the assistant to find what you need."
            action={{ label: 'Browse all schemes', href: '/schemes' }}
          />
        </div>
      </AppShell>
    );
  }

  const accent = ACCENTS[scheme.accent] ?? ACCENTS.blue;
  const ready = checklist.filter((c) => c.status === 'have').length;
  const existing = applications.find((a) => a.schemeId === scheme.id && a.applicantId === person.id);

  function startApplication() {
    if (existing) {
      router.push('/applications');
      return;
    }
    createApplication(scheme!.id, person.id);
    router.push('/applications');
  }

  return (
    <AppShell>
      <div id="main" className="mx-auto max-w-[900px] space-y-5">
        <Link href="/schemes" className="link-arrow">
          <Icon name="ArrowLeft" className="h-4 w-4" />
          All schemes
        </Link>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Card className="p-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className={cx('flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl', accent.bg, accent.fg)}>
              <Icon name={scheme.icon} className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{SECTOR_LABELS[scheme.sector]}</Badge>
                <Badge tone="neutral">{scheme.level === 'central' ? 'Central scheme' : 'State scheme'}</Badge>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Govt Data
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight">{scheme.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm muted">
                <span>{scheme.ministry}</span>
                {scheme.sourceName && <span>• Official Source: {scheme.sourceName}</span>}
                {scheme.lastUpdated && (
                  <span>• Last updated: {new Date(scheme.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                )}
              </div>
            </div>
          </div>

          <p className="mt-5 text-[15px] leading-relaxed">{scheme.summary}</p>

          <div className="mt-5 rounded-2xl bg-brand-50 p-4 dark:bg-brand-500/10">
            <p className="muted text-xs font-bold uppercase tracking-wide">What you get</p>
            <p className="mt-1 text-xl font-bold text-brand-600 dark:text-brand-300">{scheme.benefitHeadline}</p>
            <p className="muted mt-1.5 text-sm leading-relaxed">{scheme.benefitDetail}</p>
          </div>
        </Card>

        {/* ── Eligibility reasoning ──────────────────────────────────────── */}
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Your eligibility</h2>
            <select
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              aria-label="Check eligibility for"
              className="input h-10 w-auto font-semibold"
            >
              {allPeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.relation ? ` — ${p.relation}` : ' — You'}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <EligibilityBadge level={result.level} />
            <span className="muted text-sm">
              {result.passed.length} of {scheme.rules.length} criteria met
            </span>
          </div>

          <div className="mb-5">
            <ProgressBar
              value={result.score}
              tone={result.level === 'eligible' ? 'success' : result.level === 'verify' ? 'warning' : 'danger'}
              label="Eligibility match"
            />
          </div>

          <p className="mb-5 rounded-xl bg-[var(--canvas)] px-4 py-3 text-sm leading-relaxed">{result.reason}</p>

          {/* Rule-by-rule breakdown — this is what stops the engine feeling like a black box */}
          <ul className="space-y-2.5">
            {result.passed.map((r) => (
              <li key={r.label} className="flex items-start gap-3">
                <Icon name="CircleCheck" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-emerald-600" />
                <span className="text-sm leading-relaxed">{r.label}</span>
              </li>
            ))}
            {result.failed.map((r) => (
              <li key={r.label} className="flex items-start gap-3">
                <Icon
                  name={r.soft ? 'CircleAlert' : 'CircleX'}
                  className={cx('mt-0.5 h-[18px] w-[18px] shrink-0', r.soft ? 'text-amber-600' : 'text-rose-600')}
                />
                <span className="text-sm leading-relaxed">
                  {r.label}
                  {r.soft && <span className="muted"> — needs confirming, not an automatic disqualification</span>}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* ── Documents ──────────────────────────────────────────────────── */}
        <Card className="p-6" id="documents">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Documents you need</h2>
            <Badge tone={ready === checklist.length ? 'success' : 'warning'}>
              {ready} of {checklist.length} ready
            </Badge>
          </div>

          <p className="muted mb-4 text-sm">
            This list is built from {person.name.split(' ')[0]}&apos;s profile — documents that do not apply are
            not shown.
          </p>

          <ul className="space-y-2">
            {checklist.map(({ doc, status, detail }) => (
              <li
                key={doc.id}
                className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-3.5"
              >
                <Icon
                  name={status === 'have' ? 'CircleCheck' : status === 'expiring' ? 'CircleAlert' : 'CirclePlus'}
                  className={cx(
                    'mt-0.5 h-5 w-5 shrink-0',
                    status === 'have' ? 'text-emerald-600' : status === 'expiring' ? 'text-amber-600' : 'text-slate-400',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{doc.name}</p>
                  <p className="muted mt-0.5 text-[13px]">{detail}</p>
                  {doc.note && <p className="muted mt-0.5 text-[13px]">{doc.note}</p>}
                </div>
                {status !== 'have' && (
                  <Button href="/documents" variant="secondary" size="sm" className="shrink-0">
                    Add
                  </Button>
                )}
              </li>
            ))}
          </ul>

          <Button href="/documents/verify" variant="secondary" className="mt-4 w-full sm:w-auto">
            <Icon name="ScanSearch" className="h-4 w-4" />
            Run a document check before applying
          </Button>
        </Card>

        {/* ── How to apply ───────────────────────────────────────────────── */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold">How to apply</h2>
          <ul className="mb-5 space-y-2">
            {scheme.applyMode.map((mode) => (
              <li key={mode} className="flex items-center gap-3 text-sm">
                <Icon name="MapPin" className="h-4 w-4 shrink-0 text-brand-500" />
                {mode}
              </li>
            ))}
          </ul>

          <div className="muted mb-5 flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-2">
              <Icon name="Clock" className="h-4 w-4" />
              Usually takes {scheme.processingDays} days
            </span>
            <a
              href={scheme.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-arrow"
            >
              Official portal
              <Icon name="ExternalLink" className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={startApplication}
              size="lg"
              disabled={result.level === 'not-eligible'}
              className="flex-1"
            >
              <Icon name="FilePlus2" className="h-[18px] w-[18px]" />
              {existing ? 'View your application' : 'Start application'}
            </Button>
            <Button href="/help" variant="secondary" size="lg" className="flex-1 sm:flex-none">
              <Icon name="MapPin" className="h-[18px] w-[18px]" />
              Find a nearby centre
            </Button>
          </div>

          {result.level === 'not-eligible' && (
            <p className="muted mt-3 text-[13px] leading-relaxed">
              You do not meet the criteria for this scheme right now, so applying would likely be
              rejected. If your circumstances have changed, update your profile in Settings and check
              again.
            </p>
          )}
        </Card>

        <p className="muted px-1 text-xs leading-relaxed">
          MITRA&apos;s eligibility result is advisory. Scheme rules vary between states and are revised
          periodically — please confirm at a Common Service Centre or on the official portal before you
          rely on it.
        </p>
      </div>
    </AppShell>
  );
}
