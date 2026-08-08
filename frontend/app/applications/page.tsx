'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell';
import {
  ACCENTS,
  Button,
  Card,
  EmptyState,
  Icon,
  PageHeader,
  ProgressBar,
  StatusPill,
  Tabs,
  cx,
  formatDate,
  relativeDate,
} from '@/components/ui';
import { useStore } from '@/lib/store';
import { getScheme } from '@/lib/schemes';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'action', label: 'Need action' },
  { id: 'done', label: 'Completed' },
];

export default function ApplicationsPage() {
  const { applications, advanceApplication, t } = useStore();
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = applications.filter((a) => {
    if (filter === 'active') return ['draft', 'submitted', 'under-review'].includes(a.status);
    if (filter === 'action') return a.status === 'info-needed';
    if (filter === 'done') return ['approved', 'disbursed', 'rejected'].includes(a.status);
    return true;
  });

  const tabs = FILTERS.map((f) => ({
    ...f,
    count: applications.filter((a) => {
      if (f.id === 'active') return ['draft', 'submitted', 'under-review'].includes(a.status);
      if (f.id === 'action') return a.status === 'info-needed';
      if (f.id === 'done') return ['approved', 'disbursed', 'rejected'].includes(a.status);
      return true;
    }).length,
  }));

  return (
    <AppShell>
      <div id="main" className="mx-auto max-w-[1000px] space-y-5">
        <PageHeader title={t('apps.title')} subtitle={t('apps.sub')}>
          <Button href="/schemes">
            <Icon name="Plus" className="h-4 w-4" />
            New application
          </Button>
        </PageHeader>

        <Tabs tabs={tabs} active={filter} onChange={setFilter} />

        {filtered.length === 0 ? (
          <EmptyState
            icon="ClipboardList"
            title={t('apps.empty')}
            body="Once you start an application, you can track every step here and MITRA will remind you before any deadline."
            action={{ label: 'Find schemes for you', href: '/schemes' }}
          />
        ) : (
          <div className="stagger space-y-3">
            {filtered.map((app) => {
              const scheme = getScheme(app.schemeId);
              if (!scheme) return null;
              const accent = ACCENTS[scheme.accent] ?? ACCENTS.blue;
              const open = openId === app.id;

              return (
                <Card key={app.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-start gap-4 p-5">
                    <div className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', accent.bg, accent.fg)}>
                      <Icon name={scheme.icon} className="h-6 w-6" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-bold">{scheme.shortName}</h3>
                        <StatusPill status={app.status} />
                      </div>
                      <p className="muted mt-1 text-[13px]">
                        {app.applicantName} · {t('apps.reference')} {app.referenceNo}
                      </p>

                      <div className="mt-3 flex items-center gap-3">
                        <ProgressBar
                          value={app.progressStep}
                          max={app.totalSteps}
                          tone={
                            app.status === 'info-needed'
                              ? 'warning'
                              : app.status === 'rejected'
                                ? 'danger'
                                : app.status === 'approved' || app.status === 'disbursed'
                                  ? 'success'
                                  : 'brand'
                          }
                          label={`${scheme.shortName} progress`}
                        />
                        <span className="muted shrink-0 text-xs font-semibold">
                          {app.progressStep}/{app.totalSteps}
                        </span>
                      </div>

                      <p className="muted mt-2 text-xs">Updated {relativeDate(app.updatedAt)}</p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {app.status === 'draft' && (
                        <Button size="sm" onClick={() => advanceApplication(app.id)}>
                          Continue
                        </Button>
                      )}
                      {app.status === 'info-needed' && (
                        <Button size="sm" href="/documents/verify">
                          Fix issue
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setOpenId(open ? null : app.id)}
                        ariaLabel={open ? 'Hide progress' : 'Show progress'}
                      >
                        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} className="h-4 w-4" />
                        {t('apps.timeline')}
                      </Button>
                    </div>
                  </div>

                  {open && (
                    <div className="border-t border-[var(--border)] bg-[var(--canvas)] p-5 animate-fade-up">
                      <ol className="space-y-4">
                        {app.timeline.map((event, i) => (
                          <li key={`${event.at}-${i}`} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <span
                                className={cx(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                                  i === app.timeline.length - 1
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-[var(--surface)] text-brand-500 ring-1 ring-[var(--border)]',
                                )}
                              >
                                <Icon name="Check" className="h-3.5 w-3.5" />
                              </span>
                              {i < app.timeline.length - 1 && (
                                <span className="mt-1 w-px flex-1 bg-[var(--border)]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1 pb-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusPill status={event.status} />
                                <span className="muted text-xs">{formatDate(event.at)}</span>
                              </div>
                              <p className="mt-1.5 text-sm leading-relaxed">{event.note}</p>
                            </div>
                          </li>
                        ))}
                      </ol>

                      <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                        <Link href={`/schemes/${scheme.id}`} className="link-arrow">
                          About {scheme.shortName}
                          <Icon name="ArrowRight" className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
