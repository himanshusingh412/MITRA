'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/adminShell';
import { ACCENTS, Badge, Button, Card, Icon, Tabs, cx } from '@/components/ui';
import { SCHEMES, SECTOR_LABELS } from '@/lib/schemes';

export default function AdminSchemesPage() {
  const [sector, setSector] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = SCHEMES.filter((s) => (sector === 'all' ? true : s.sector === sector));

  const tabs = [
    { id: 'all', label: 'All', count: SCHEMES.length },
    ...Object.entries(SECTOR_LABELS)
      .map(([id, label]) => ({ id, label, count: SCHEMES.filter((s) => s.sector === id).length }))
      .filter((t) => t.count > 0),
  ];

  return (
    <AdminShell>
      <div className="mx-auto max-w-[1100px] space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Scheme management</h2>
            <p className="muted mt-1 text-sm">
              {SCHEMES.length} schemes in the catalogue. Eligibility criteria are stored as data, so
              adding or amending a scheme needs no code change.
            </p>
          </div>
          <Button>
            <Icon name="Plus" className="h-4 w-4" />
            Add scheme
          </Button>
        </div>

        <Tabs tabs={tabs} active={sector} onChange={setSector} />

        <div className="space-y-3">
          {filtered.map((s) => {
            const accent = ACCENTS[s.accent] ?? ACCENTS.blue;
            const open = openId === s.id;
            return (
              <Card key={s.id} className="overflow-hidden">
                <div className="flex flex-wrap items-start gap-4 p-5">
                  <div className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', accent.bg, accent.fg)}>
                    <Icon name={s.icon} className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-bold">{s.shortName}</h3>
                      <Badge tone="brand">{SECTOR_LABELS[s.sector]}</Badge>
                      <Badge tone="neutral">{s.level}</Badge>
                    </div>
                    <p className="muted mt-1 text-[13px]">{s.ministry}</p>
                    <p className="muted mt-1 text-xs">
                      {s.rules.length} criteria · {s.documents.length} documents · {s.processingDays} day
                      processing
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setOpenId(open ? null : s.id)}>
                      <Icon name={open ? 'ChevronUp' : 'Settings2'} className="h-3.5 w-3.5" />
                      Rules
                    </Button>
                  </div>
                </div>

                {open && (
                  <div className="grid gap-5 border-t border-[var(--border)] bg-[var(--canvas)] p-5 animate-fade-up lg:grid-cols-2">
                    <div>
                      <h4 className="mb-3 text-xs font-bold uppercase tracking-wide">Eligibility criteria</h4>
                      <ul className="space-y-2">
                        {s.rules.map((r) => (
                          <li key={r.label} className="flex items-start gap-2.5 text-sm">
                            <Icon
                              name={r.soft ? 'CircleDashed' : 'CircleCheck'}
                              className={cx('mt-0.5 h-4 w-4 shrink-0', r.soft ? 'text-amber-600' : 'text-emerald-600')}
                            />
                            <span className="min-w-0 flex-1 leading-relaxed">
                              {r.label}
                              <code className="muted ml-1.5 rounded bg-[var(--surface)] px-1.5 py-0.5 text-[11px]">
                                {String(r.field)} {r.op} {JSON.stringify(r.value ?? '')}
                              </code>
                              {r.soft && <span className="muted"> — advisory</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="mb-3 text-xs font-bold uppercase tracking-wide">Required documents</h4>
                      <ul className="space-y-2">
                        {s.documents.map((d) => (
                          <li key={d.id} className="flex items-start gap-2.5 text-sm">
                            <Icon name="FileText" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                            <span className="min-w-0 flex-1 leading-relaxed">
                              {d.name}
                              {d.requiredIf && <span className="muted"> — only if {d.requiredIf.label.toLowerCase()}</span>}
                              {d.validityMonths && <span className="muted"> · valid {d.validityMonths} months</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
