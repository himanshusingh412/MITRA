'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { AppShell } from '@/components/shell';
import { Badge, Button, Card, Icon, PageHeader, ProgressBar, StatusPill, cx } from '@/components/ui';
import { useStore } from '@/lib/store';
import { recommendSchemes } from '@/lib/eligibility';
import { verifyDocumentSet } from '@/lib/documentVerification';
import { getScheme } from '@/lib/schemes';

export default function FamilyPage() {
  const { user, allPeople, applications, documents, t } = useStore();

  const members = useMemo(
    () =>
      allPeople.map((person) => {
        const recs = recommendSchemes(person, { limit: 3 });
        const eligible = recommendSchemes(person).filter((r) => r.result.level === 'eligible').length;
        const apps = applications.filter((a) => a.applicantId === person.id);
        const docReport = verifyDocumentSet(person, documents);
        return { person, recs, eligible, apps, docReport };
      }),
    [allPeople, applications, documents],
  );

  const totalEligible = members.reduce((sum, m) => sum + m.eligible, 0);
  const totalActive = applications.filter(
    (a) => !['approved', 'disbursed', 'rejected'].includes(a.status),
  ).length;
  const totalBlockers = members.reduce(
    (sum, m) => sum + m.docReport.issues.filter((i) => i.severity === 'blocker').length,
    0,
  );

  return (
    <AppShell>
      <div id="main" className="mx-auto max-w-[1000px] space-y-5">
        <PageHeader title={t('family.title')} subtitle={t('family.sub')} />

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-5">
            <p className="muted text-xs font-bold uppercase tracking-wide">Household members</p>
            <p className="mt-2 text-2xl font-bold">{allPeople.length}</p>
          </Card>
          <Card className="p-5">
            <p className="muted text-xs font-bold uppercase tracking-wide">Schemes you qualify for</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{totalEligible}</p>
          </Card>
          <Card className={cx('p-5', totalBlockers > 0 && 'border-amber-200 dark:border-amber-500/30')}>
            <p className="muted text-xs font-bold uppercase tracking-wide">Document issues</p>
            <p className={cx('mt-2 text-2xl font-bold', totalBlockers > 0 ? 'text-amber-600' : 'text-emerald-600')}>
              {totalBlockers}
            </p>
          </Card>
        </div>

        <div className="space-y-4">
          {members.map(({ person, recs, eligible, apps, docReport }) => {
            const blockers = docReport.issues.filter((i) => i.severity === 'blocker').length;
            return (
              <Card key={person.id} className="p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
                    style={{ background: person.avatarColor }}
                    aria-hidden="true"
                  >
                    {person.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15px] font-bold">{person.name}</h2>
                      <Badge tone="neutral">{person.relation ?? 'You'}</Badge>
                      <Badge tone="success">{t('family.matches', { n: eligible })}</Badge>
                      {blockers > 0 && (
                        <Badge tone="danger" icon="ShieldAlert">
                          {blockers} document {blockers === 1 ? 'issue' : 'issues'}
                        </Badge>
                      )}
                    </div>
                    <p className="muted mt-1 text-[13px] capitalize">
                      {person.age} years · {person.occupation.replace('-', ' ')} · {person.district}
                    </p>
                  </div>

                  <Button href={`/schemes`} variant="secondary" size="sm" className="shrink-0">
                    View schemes
                  </Button>
                </div>

                {/* Top matches for this member */}
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {recs.map(({ scheme, result }) => (
                    <Link
                      key={scheme.id}
                      href={`/schemes/${scheme.id}`}
                      className="rounded-xl border border-[var(--border)] p-3 transition-colors hover:bg-brand-50/60 dark:hover:bg-brand-500/10"
                    >
                      <p className="text-[13px] font-bold leading-snug">{scheme.shortName}</p>
                      <p className="muted mt-1 line-clamp-1 text-xs">{scheme.benefitHeadline}</p>
                      <div className="mt-2">
                        <Badge tone={result.level === 'eligible' ? 'success' : 'warning'}>
                          {result.level === 'eligible' ? 'Eligible' : 'Verify'}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Their applications */}
                {apps.length > 0 && (
                  <ul className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
                    {apps.map((a) => {
                      const scheme = getScheme(a.schemeId);
                      return (
                        <li key={a.id} className="flex flex-wrap items-center gap-3 text-sm">
                          <Icon name="ClipboardList" className="h-4 w-4 shrink-0 text-brand-500" />
                          <span className="font-semibold">{scheme?.shortName}</span>
                          <StatusPill status={a.status} />
                          <span className="muted ml-auto text-xs">
                            {a.progressStep}/{a.totalSteps} steps
                          </span>
                          <div className="w-24 shrink-0">
                            <ProgressBar value={a.progressStep} max={a.totalSteps} label={`${scheme?.shortName} progress`} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>

        <Card className="flex flex-wrap items-center gap-4 p-5">
          <Icon name="UserPlus" className="h-6 w-6 shrink-0 text-brand-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Add another family member</p>
            <p className="muted mt-0.5 text-[13px]">
              MITRA will check every scheme against their profile too, and remind you about their
              deadlines alongside your own.
            </p>
          </div>
          <Button href="/settings" variant="secondary" size="sm">
            Add member
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
