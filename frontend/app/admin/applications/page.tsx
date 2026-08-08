'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/adminShell';
import { Button, Card, EmptyState, Icon, ProgressBar, StatusPill, Tabs, formatDate } from '@/components/ui';
import { APPLICATIONS } from '@/lib/demoData';
import { getScheme } from '@/lib/schemes';
import type { ApplicationStatus } from '@/types';

export default function AdminApplicationsPage() {
  const [rows, setRows] = useState(APPLICATIONS);
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [audit, setAudit] = useState<string[]>([]);

  const filtered = rows.filter((a) => {
    if (filter === 'review') return ['submitted', 'under-review'].includes(a.status);
    if (filter === 'action') return a.status === 'info-needed';
    if (filter === 'decided') return ['approved', 'rejected', 'disbursed'].includes(a.status);
    return true;
  });

  const tabs = [
    { id: 'all', label: 'All', count: rows.length },
    { id: 'review', label: 'To review', count: rows.filter((a) => ['submitted', 'under-review'].includes(a.status)).length },
    { id: 'action', label: 'Info requested', count: rows.filter((a) => a.status === 'info-needed').length },
    { id: 'decided', label: 'Decided', count: rows.filter((a) => ['approved', 'rejected', 'disbursed'].includes(a.status)).length },
  ];

  /** Every decision is written to an audit trail — required for any government workflow. */
  function decide(id: string, status: ApplicationStatus, note: string) {
    const app = rows.find((a) => a.id === id);
    if (!app) return;
    const now = new Date().toISOString();
    setRows((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              updatedAt: now,
              progressStep: status === 'approved' ? a.totalSteps : a.progressStep,
              timeline: [...a.timeline, { at: now, status, note }],
            }
          : a,
      ),
    );
    setAudit((prev) => [
      `${new Date().toLocaleTimeString('en-IN')} — P. Sharma set ${app.referenceNo} to "${status}"`,
      ...prev,
    ]);
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-[1100px] space-y-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Application queue</h2>
          <p className="muted mt-1 text-sm">
            Review, approve or request more information. Every action is recorded against your officer ID.
          </p>
        </div>

        <Tabs tabs={tabs} active={filter} onChange={setFilter} />

        {audit.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
              <Icon name="ScrollText" className="h-3.5 w-3.5" />
              Audit trail (this session)
            </h3>
            <ul className="muted space-y-1 text-xs">
              {audit.slice(0, 5).map((entry, i) => (
                <li key={i}>{entry}</li>
              ))}
            </ul>
          </Card>
        )}

        {filtered.length === 0 ? (
          <EmptyState icon="ClipboardCheck" title="Nothing in this queue" body="No applications match this filter right now." />
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => {
              const scheme = getScheme(a.schemeId);
              const open = openId === a.id;
              const decided = ['approved', 'rejected', 'disbursed'].includes(a.status);

              return (
                <Card key={a.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-start gap-4 p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-bold">{scheme?.shortName}</h3>
                        <StatusPill status={a.status} />
                      </div>
                      <p className="muted mt-1 text-[13px]">
                        {a.applicantName} · {a.district} · {a.referenceNo}
                      </p>
                      <p className="muted mt-0.5 text-xs">Submitted {formatDate(a.submittedAt)}</p>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="max-w-xs flex-1">
                          <ProgressBar value={a.progressStep} max={a.totalSteps} label="Application progress" />
                        </div>
                        <span className="muted text-xs font-semibold">
                          {a.progressStep}/{a.totalSteps}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!decided && (
                        <>
                          <Button size="sm" onClick={() => decide(a.id, 'approved', 'Approved after document verification by the district office.')}>
                            <Icon name="Check" className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => decide(a.id, 'info-needed', 'Additional information requested from the applicant.')}
                          >
                            <Icon name="MessageCircleQuestion" className="h-3.5 w-3.5" />
                            Request info
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => decide(a.id, 'rejected', 'Rejected — eligibility criteria not met.')}>
                            <Icon name="X" className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setOpenId(open ? null : a.id)}>
                        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} className="h-4 w-4" />
                        History
                      </Button>
                    </div>
                  </div>

                  {open && (
                    <div className="border-t border-[var(--border)] bg-[var(--canvas)] p-5 animate-fade-up">
                      <ol className="space-y-3">
                        {a.timeline.map((e, i) => (
                          <li key={`${e.at}-${i}`} className="flex gap-3 text-sm">
                            <Icon name="CircleDot" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusPill status={e.status} />
                                <span className="muted text-xs">{formatDate(e.at)}</span>
                              </div>
                              <p className="mt-1 leading-relaxed">{e.note}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
