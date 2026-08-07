'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/adminShell';
import { Badge, Button, Card, EmptyState, Icon, StatusPill, Tabs, relativeDate } from '@/components/ui';
import { COMPLAINTS } from '@/lib/demoData';
import type { Complaint } from '@/types';

export default function AdminComplaintsPage() {
  const [rows, setRows] = useState<Complaint[]>(COMPLAINTS);
  const [filter, setFilter] = useState('all');

  const filtered = rows.filter((c) => (filter === 'all' ? true : c.status === filter));

  const tabs = [
    { id: 'all', label: 'All', count: rows.length },
    { id: 'open', label: 'Open', count: rows.filter((c) => c.status === 'open').length },
    { id: 'in-progress', label: 'In progress', count: rows.filter((c) => c.status === 'in-progress').length },
    { id: 'resolved', label: 'Resolved', count: rows.filter((c) => c.status === 'resolved').length },
  ];

  // Grouping by category is what turns individual complaints into a policy signal.
  const byCategory = rows.reduce<Record<string, number>>((acc, c) => {
    acc[c.category] = (acc[c.category] ?? 0) + 1;
    return acc;
  }, {});

  function advance(id: string) {
    setRows((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: c.status === 'open' ? 'in-progress' : 'resolved' }
          : c,
      ),
    );
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-[1100px] space-y-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Citizen complaints</h2>
          <p className="muted mt-1 text-sm">
            Grievances raised through MITRA, grouped so recurring problems are visible.
          </p>
        </div>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-bold">Complaints by cause</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <Badge key={cat} tone={count >= 2 ? 'warning' : 'neutral'}>
                  {cat} · {count}
                </Badge>
              ))}
          </div>
          <p className="muted mt-3 text-[13px] leading-relaxed">
            Document mismatch is the most common category here — the same pattern the
            pre-application document check is designed to prevent.
          </p>
        </Card>

        <Tabs tabs={tabs} active={filter} onChange={setFilter} />

        {filtered.length === 0 ? (
          <EmptyState icon="MessageSquareOff" title="No complaints here" body="Nothing matches this filter." />
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => (
              <Card key={c.id} className="flex flex-wrap items-start gap-4 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                  <Icon name="MessageSquareWarning" className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-bold leading-snug">{c.subject}</h3>
                    <StatusPill status={c.status} />
                  </div>
                  <p className="muted mt-1 text-[13px]">
                    {c.citizen} · {c.district} · {c.category} · raised {relativeDate(c.raisedAt)}
                  </p>
                </div>

                {c.status !== 'resolved' && (
                  <Button size="sm" variant="secondary" onClick={() => advance(c.id)} className="shrink-0">
                    <Icon name="ArrowRight" className="h-3.5 w-3.5" />
                    {c.status === 'open' ? 'Start work' : 'Mark resolved'}
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
