'use client';

import { AdminShell } from '@/components/adminShell';
import { Badge, Card, Icon, ProgressBar, Stat, StatusPill, cx, relativeDate } from '@/components/ui';
import {
  APPLICATIONS,
  COMPLAINTS,
  DISTRICT_STATS,
  MONTHLY_TREND,
  REJECTION_REASONS,
} from '@/lib/demoData';
import { getScheme } from '@/lib/schemes';
import Link from 'next/link';

export default function AdminDashboard() {
  const totals = DISTRICT_STATS.reduce(
    (acc, d) => ({
      applications: acc.applications + d.applications,
      approved: acc.approved + d.approved,
      pending: acc.pending + d.pending,
      rejected: acc.rejected + d.rejected,
    }),
    { applications: 0, approved: 0, pending: 0, rejected: 0 },
  );

  const approvalRate = Math.round((totals.approved / totals.applications) * 100);
  const openComplaints = COMPLAINTS.filter((c) => c.status !== 'resolved').length;
  const maxTrend = Math.max(...MONTHLY_TREND.map((m) => m.applications));

  return (
    <AdminShell>
      <div className="mx-auto max-w-[1100px] space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total applications" value={totals.applications.toLocaleString('en-IN')} delta="Across 5 districts" icon="ClipboardList" accent="blue" />
          <Stat label="Approval rate" value={`${approvalRate}%`} delta={`${totals.approved.toLocaleString('en-IN')} approved`} icon="CircleCheck" accent="green" />
          <Stat label="Pending review" value={totals.pending.toLocaleString('en-IN')} delta="Awaiting officer action" icon="Clock" accent="amber" />
          <Stat label="Open complaints" value={String(openComplaints)} delta={`${COMPLAINTS.length} raised in total`} icon="MessageSquareWarning" accent="rose" />
        </div>

        {/* Trend */}
        <Card className="p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Applications over time</h2>
              <p className="muted mt-0.5 text-sm">Submissions and approvals, last six months.</p>
            </div>
            <div className="flex gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" />
                Submitted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                Approved
              </span>
            </div>
          </div>

          <div className="flex h-48 items-end gap-3">
            {MONTHLY_TREND.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end justify-center gap-1">
                  <div
                    className="w-full max-w-[18px] rounded-t-md bg-brand-500 transition-all"
                    style={{ height: `${(m.applications / maxTrend) * 100}%` }}
                    title={`${m.applications} submitted in ${m.month}`}
                  />
                  <div
                    className="w-full max-w-[18px] rounded-t-md bg-emerald-500 transition-all"
                    style={{ height: `${(m.approvals / maxTrend) * 100}%` }}
                    title={`${m.approvals} approved in ${m.month}`}
                  />
                </div>
                <span className="muted text-xs font-semibold">{m.month}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Districts */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-bold">By district</h2>
            <ul className="space-y-4">
              {DISTRICT_STATS.map((d) => {
                const rate = Math.round((d.approved / d.applications) * 100);
                return (
                  <li key={d.district}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                      <span className="font-semibold">{d.district}</span>
                      <span className="muted text-xs">
                        {d.applications.toLocaleString('en-IN')} · {rate}% approved
                      </span>
                    </div>
                    <ProgressBar value={rate} tone={rate >= 70 ? 'success' : rate >= 60 ? 'warning' : 'danger'} label={`${d.district} approval rate`} />
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Rejection reasons — the evidence for the document-verification feature */}
          <Card className="p-6">
            <div className="mb-1 flex items-center gap-2">
              <Icon name="TrendingDown" className="h-5 w-5 text-rose-600" />
              <h2 className="text-lg font-bold">Why applications fail</h2>
            </div>
            <p className="muted mb-4 text-sm">
              Nearly three quarters of rejections are clerical, not eligibility-based.
            </p>
            <ul className="space-y-3">
              {REJECTION_REASONS.map((r) => (
                <li key={r.reason}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate font-semibold">{r.reason}</span>
                    <span className="muted shrink-0 text-xs">{r.share}%</span>
                  </div>
                  <ProgressBar value={r.share} max={35} tone="danger" label={r.reason} />
                </li>
              ))}
            </ul>
            <p className="muted mt-4 rounded-xl bg-[var(--canvas)] p-3.5 text-[13px] leading-relaxed">
              MITRA&apos;s pre-application document check targets the top three causes directly —
              together they account for 71% of all rejections in this district.
            </p>
          </Card>
        </div>

        {/* Recent queue */}
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Applications needing review</h2>
            <Link href="/admin/applications" className="link-arrow">
              Open queue
              <Icon name="ArrowRight" className="h-4 w-4" />
            </Link>
          </div>
          <ul className="space-y-2">
            {APPLICATIONS.slice(0, 4).map((a) => {
              const scheme = getScheme(a.schemeId);
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] p-3.5">
                  <Icon name="FileText" className="h-5 w-5 shrink-0 text-brand-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{scheme?.shortName}</p>
                    <p className="muted text-xs">
                      {a.applicantName} · {a.referenceNo}
                    </p>
                  </div>
                  <StatusPill status={a.status} />
                  <span className="muted shrink-0 text-xs">{relativeDate(a.updatedAt)}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </AdminShell>
  );
}
