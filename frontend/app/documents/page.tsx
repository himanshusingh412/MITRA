'use client';

import { useMemo, useState } from 'react';
import { AppShell } from '@/components/shell';
import { Badge, Button, Card, EmptyState, Icon, PageHeader, Tabs, cx, formatDate } from '@/components/ui';
import { useStore } from '@/lib/store';
import { verifyDocumentSet } from '@/lib/documentVerification';

export default function DocumentsPage() {
  const { user, allPeople, documents, t } = useStore();
  const [owner, setOwner] = useState('all');

  const visible = documents.filter((d) => (owner === 'all' ? true : d.ownerId === owner));
  const report = useMemo(() => verifyDocumentSet(user, documents), [user, documents]);

  const tabs = [
    { id: 'all', label: 'Everyone', count: documents.length },
    ...allPeople.map((p) => ({
      id: p.id,
      label: p.id === user.id ? 'You' : p.name.split(' ')[0],
      count: documents.filter((d) => d.ownerId === p.id).length,
    })),
  ];

  const expiring = documents.filter(
    (d) => d.expiresAt && new Date(d.expiresAt).getTime() - Date.now() < 90 * 86_400_000,
  );

  return (
    <AppShell>
      <div id="main" className="mx-auto max-w-[1000px] space-y-5">
        <PageHeader title={t('docs.title')} subtitle={t('docs.sub')}>
          <Button href="/documents/digilocker" variant="secondary">
            <Icon name="ShieldCheck" className="h-4 w-4" />
            {t('docs.importDigilocker')}
          </Button>
          <Button href="/documents/verify">
            <Icon name="ScanSearch" className="h-4 w-4" />
            {t('docs.verify')}
          </Button>
        </PageHeader>

        {/* Verification status strip */}
        <Card
          className={cx(
            'flex flex-wrap items-center gap-4 p-5',
            report.readyToSubmit
              ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/25 dark:bg-emerald-500/10'
              : 'border-amber-200 bg-amber-50/50 dark:border-amber-500/25 dark:bg-amber-500/10',
          )}
        >
          <Icon
            name={report.readyToSubmit ? 'ShieldCheck' : 'ShieldAlert'}
            className={cx('h-6 w-6 shrink-0', report.readyToSubmit ? 'text-emerald-600' : 'text-amber-600')}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">
              {report.consistencyScore}% consistent across your documents
            </p>
            <p className="muted mt-0.5 text-[13px]">{report.summary}</p>
          </div>
          <Button href="/documents/verify" variant="secondary" size="sm">
            See details
          </Button>
        </Card>

        {expiring.length > 0 && (
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Icon name="CalendarClock" className="h-4 w-4 text-amber-600" />
              Expiring or expired
            </h2>
            <ul className="space-y-2">
              {expiring.map((d) => {
                const days = Math.round((new Date(d.expiresAt!).getTime() - Date.now()) / 86_400_000);
                const person = allPeople.find((p) => p.id === d.ownerId);
                return (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 text-sm">
                    <Icon name="FileWarning" className="h-4 w-4 shrink-0 text-amber-600" />
                    <span className="font-semibold">{d.name}</span>
                    <span className="muted">{person?.name}</span>
                    <Badge tone={days < 0 ? 'danger' : 'warning'}>
                      {days < 0 ? `Expired ${Math.abs(days)} days ago` : `${days} days left`}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <Tabs tabs={tabs} active={owner} onChange={setOwner} />

        {visible.length === 0 ? (
          <EmptyState
            icon="FileStack"
            title="No documents here yet"
            body="Import from DigiLocker or upload a photo. MITRA reads the details automatically and checks them against your other documents."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {visible.map((doc) => {
              const person = allPeople.find((p) => p.id === doc.ownerId);
              const expired = doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now();
              return (
                <Card key={doc.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15">
                      <Icon name="FileText" className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold">{doc.name}</h3>
                      <p className="muted mt-0.5 text-xs">{person?.name}</p>

                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {doc.source === 'digilocker' && (
                          <Badge tone="info" icon="BadgeCheck">
                            DigiLocker
                          </Badge>
                        )}
                        {doc.verified ? (
                          <Badge tone="success" icon="CircleCheck">
                            Verified
                          </Badge>
                        ) : (
                          <Badge tone="warning" icon="CircleAlert">
                            Unverified
                          </Badge>
                        )}
                        {expired && <Badge tone="danger" icon="CircleX">Expired</Badge>}
                      </div>

                      {doc.extracted && Object.keys(doc.extracted).length > 0 && (
                        <dl className="mt-3 space-y-1 border-t border-[var(--border)] pt-3">
                          {Object.entries(doc.extracted).slice(0, 3).map(([k, v]) => (
                            <div key={k} className="flex gap-2 text-xs">
                              <dt className="muted w-24 shrink-0 capitalize">{k.replace(/([A-Z])/g, ' $1')}</dt>
                              <dd className="min-w-0 flex-1 truncate font-semibold" title={v}>
                                {v}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}

                      <p className="muted mt-3 text-xs">
                        Added {formatDate(doc.uploadedAt)}
                        {doc.expiresAt && ` · valid to ${formatDate(doc.expiresAt)}`}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
