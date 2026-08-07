'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/shell';
import { SchemeRow } from '@/components/SchemeCard';
import { Badge, Card, EmptyState, Icon, PageHeader, Skeleton, Tabs } from '@/components/ui';
import { useStore } from '@/lib/store';
import { recommendSchemes } from '@/lib/eligibility';
import { SECTOR_LABELS } from '@/lib/schemes';
import { ALL_PEOPLE } from '@/lib/demoData';

function SchemesView() {
  const { user, allPeople, t } = useStore();
  const params = useSearchParams();
  const [sector, setSector] = useState<string>(params.get('sector') ?? 'all');
  const [personId, setPersonId] = useState(user.id);
  const [query, setQuery] = useState('');
  const [showIneligible, setShowIneligible] = useState(false);

  const person = allPeople.find((p) => p.id === personId) ?? user;

  const rows = useMemo(() => {
    const all = recommendSchemes(person, { includeIneligible: true });
    return all
      .filter((r) => (sector === 'all' ? true : r.scheme.sector === sector))
      .filter((r) => (showIneligible ? true : r.result.level !== 'not-eligible'))
      .filter((r) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          r.scheme.name.toLowerCase().includes(q) ||
          r.scheme.shortName.toLowerCase().includes(q) ||
          r.scheme.tagline.toLowerCase().includes(q) ||
          r.scheme.ministry.toLowerCase().includes(q)
        );
      });
  }, [person, sector, query, showIneligible]);

  const eligibleCount = rows.filter((r) => r.result.level === 'eligible').length;
  const verifyCount = rows.filter((r) => r.result.level === 'verify').length;

  const sectorTabs = useMemo(() => {
    const all = recommendSchemes(person, { includeIneligible: true });
    const counts = new Map<string, number>();
    for (const r of all) {
      if (r.result.level === 'not-eligible' && !showIneligible) continue;
      counts.set(r.scheme.sector, (counts.get(r.scheme.sector) ?? 0) + 1);
    }
    return [
      { id: 'all', label: t('schemes.all'), count: [...counts.values()].reduce((a, b) => a + b, 0) },
      ...Object.entries(SECTOR_LABELS)
        .filter(([key]) => counts.has(key))
        .map(([key, label]) => ({ id: key, label, count: counts.get(key) })),
    ];
  }, [person, showIneligible, t]);

  return (
    <AppShell>
      <div id="main" className="mx-auto max-w-[1180px]">
        <PageHeader title={t('schemes.title')} subtitle={t('schemes.sub')} />

        {/* Smart eligibility filter — whose profile are we matching against */}
        <Card className="mb-5 p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="person" className="text-sm font-semibold">
                Showing matches for
              </label>
              <select
                id="person"
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                className="surface h-10 rounded-xl px-3 text-sm font-semibold outline-none"
              >
                {allPeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.relation ? ` — ${p.relation}` : ' — You'}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                <Badge tone="success" icon="CheckCircle2">
                  {eligibleCount} eligible
                </Badge>
                <Badge tone="warning" icon="AlertCircle">
                  {verifyCount} to verify
                </Badge>
              </div>
            </div>

            <ProfileSummary person={person} />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="surface flex h-11 flex-1 items-center gap-2 rounded-xl px-3">
                <Icon name="Search" className="h-4 w-4 opacity-50" />
                <label htmlFor="scheme-search" className="sr-only">
                  {t('common.search')}
                </label>
                <input
                  id="scheme-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search schemes, ministries or benefits"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
                />
                {query && (
                  <button onClick={() => setQuery('')} aria-label="Clear search">
                    <Icon name="X" className="h-4 w-4 opacity-50" />
                  </button>
                )}
              </div>
              <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl px-1 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={showIneligible}
                  onChange={(e) => setShowIneligible(e.target.checked)}
                  className="h-4 w-4 rounded accent-brand-500"
                />
                Show schemes I do not qualify for
              </label>
            </div>
          </div>
        </Card>

        <div className="mb-5">
          <Tabs tabs={sectorTabs} active={sector} onChange={setSector} />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon="SearchX"
            title={t('schemes.empty')}
            body="Try a different category, clear your search, or turn on schemes you do not currently qualify for to see the full catalogue."
            action={{ label: 'Ask MITRA instead', href: '/assistant' }}
          />
        ) : (
          <div className="grid gap-3">
            {rows.map(({ scheme, result }) => (
              <SchemeRow key={scheme.id} scheme={scheme} result={result} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

/** Shows exactly which profile attributes drive the matching, so results feel explainable. */
function ProfileSummary({ person }: { person: (typeof ALL_PEOPLE)[number] }) {
  const chips = [
    { icon: 'Cake', label: `${person.age} years` },
    { icon: 'MapPin', label: `${person.district}, ${person.state}` },
    { icon: person.area === 'rural' ? 'Trees' : 'Building2', label: person.area === 'rural' ? 'Rural' : 'Urban' },
    { icon: 'Briefcase', label: person.occupation.replace('-', ' ') },
    { icon: 'IndianRupee', label: `${(person.annualIncome / 1000).toFixed(0)}k / year` },
    { icon: 'Users', label: `${person.familySize} in family` },
    { icon: 'Tag', label: person.category.toUpperCase() },
  ];
  if (person.hasDisability) chips.push({ icon: 'Accessibility', label: `${person.disabilityPercent ?? 0}% disability` });

  return (
    <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
      {chips.map((c) => (
        <span
          key={c.label}
          className="muted flex items-center gap-1.5 rounded-lg bg-[var(--canvas)] px-2.5 py-1.5 text-xs font-semibold capitalize"
        >
          <Icon name={c.icon} className="h-3.5 w-3.5" />
          {c.label}
        </span>
      ))}
    </div>
  );
}

export default function SchemesPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="mx-auto max-w-[1180px] space-y-4">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </AppShell>
      }
    >
      <SchemesView />
    </Suspense>
  );
}
