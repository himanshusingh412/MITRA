'use client';

import { AdminShell } from '@/components/adminShell';
import { Badge, Card, Icon, ProgressBar, Stat } from '@/components/ui';
import { COMPLAINTS, DISTRICT_STATS, REJECTION_REASONS } from '@/lib/demoData';

/**
 * AI insights.
 *
 * Everything here is computed from the same local data the citizen app uses — these are
 * aggregate observations, not predictions, and each one names the action it implies.
 * An insight a district officer cannot act on is not worth showing.
 */
const TOP_QUESTIONS = [
  { question: 'Which schemes can I get after losing my job?', count: 1842, trend: 'up' },
  { question: 'What documents do I need for a scholarship?', count: 1611, trend: 'up' },
  { question: 'Why was my application rejected?', count: 1204, trend: 'up' },
  { question: 'How do I renew my income certificate?', count: 987, trend: 'flat' },
  { question: 'Is my father eligible for old age pension?', count: 854, trend: 'up' },
  { question: 'When will my PM-KISAN instalment arrive?', count: 731, trend: 'down' },
];

const LIFE_EVENT_TRENDS = [
  { event: 'Started studies', count: 3120, share: 28 },
  { event: 'Farming season', count: 2740, share: 25 },
  { event: 'Job loss', count: 1980, share: 18 },
  { event: 'Senior citizen', count: 1540, share: 14 },
  { event: 'Childbirth', count: 890, share: 8 },
  { event: 'Started business', count: 780, share: 7 },
];

export default function AdminInsightsPage() {
  const totalApplications = DISTRICT_STATS.reduce((s, d) => s + d.applications, 0);
  const preventable = REJECTION_REASONS.filter((r) =>
    ['Name mismatch across documents', 'Expired supporting certificate', 'Date of birth inconsistency'].includes(r.reason),
  ).reduce((s, r) => s + r.count, 0);
  const totalRejections = REJECTION_REASONS.reduce((s, r) => s + r.count, 0);
  const preventableShare = Math.round((preventable / totalRejections) * 100);

  return (
    <AdminShell>
      <div className="mx-auto max-w-[1100px] space-y-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight">AI insights</h2>
          <p className="muted mt-1 text-sm">
            What citizens are asking, where they get stuck, and what that implies for the department.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Questions answered" value="18,240" delta="Across all districts this month" icon="MessagesSquare" accent="blue" />
          <Stat label="Preventable rejections" value={`${preventableShare}%`} delta={`${preventable.toLocaleString('en-IN')} of ${totalRejections.toLocaleString('en-IN')}`} icon="ShieldAlert" accent="rose" />
          <Stat label="Assisted submissions" value={totalApplications.toLocaleString('en-IN')} delta="Started through MITRA" icon="FileCheck2" accent="green" />
        </div>

        {/* The headline finding */}
        <Card className="border-brand-200 bg-brand-50/50 p-6 dark:border-brand-500/25 dark:bg-brand-500/10">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
              <Icon name="Lightbulb" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold">
                {preventableShare}% of rejections are clerical, not eligibility failures
              </h3>
              <p className="muted mt-1.5 text-sm leading-relaxed">
                Name spellings that differ between documents, expired certificates and mismatched
                dates of birth account for {preventable.toLocaleString('en-IN')} rejections. These
                citizens qualified — their paperwork simply disagreed with itself. Catching this
                before submission is the single highest-leverage intervention available to this
                department, and it needs no policy change.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-bold">What citizens ask most</h3>
            <ul className="space-y-3">
              {TOP_QUESTIONS.map((q) => (
                <li key={q.question} className="flex items-start gap-3">
                  <Icon
                    name={q.trend === 'up' ? 'TrendingUp' : q.trend === 'down' ? 'TrendingDown' : 'Minus'}
                    className={cxTrend(q.trend)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{q.question}</p>
                    <p className="muted mt-0.5 text-xs">{q.count.toLocaleString('en-IN')} times this month</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="muted mt-4 rounded-xl bg-[var(--canvas)] p-3.5 text-[13px] leading-relaxed">
              &quot;Why was my application rejected?&quot; rising sharply suggests rejection notices are not
              explaining themselves. Adding a plain-language reason to the notice would cut this
              volume directly.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-bold">Life events driving demand</h3>
            <ul className="space-y-3">
              {LIFE_EVENT_TRENDS.map((e) => (
                <li key={e.event}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold">{e.event}</span>
                    <span className="muted text-xs">{e.count.toLocaleString('en-IN')}</span>
                  </div>
                  <ProgressBar value={e.share} max={30} tone="brand" label={e.event} />
                </li>
              ))}
            </ul>
            <p className="muted mt-4 rounded-xl bg-[var(--canvas)] p-3.5 text-[13px] leading-relaxed">
              Study-related demand peaks ahead of the scholarship window. Staffing CSCs more heavily
              in the four weeks before the portal closes would reduce the queue at the deadline.
            </p>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold">Where citizens drop out</h3>
          <ul className="space-y-4">
            {[
              { stage: 'Found a matching scheme', pct: 100 },
              { stage: 'Read the eligibility explanation', pct: 84 },
              { stage: 'Opened the document checklist', pct: 61 },
              { stage: 'Uploaded all documents', pct: 38 },
              { stage: 'Submitted the application', pct: 31 },
            ].map((s) => (
              <li key={s.stage}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold">{s.stage}</span>
                  <span className="muted text-xs">{s.pct}%</span>
                </div>
                <ProgressBar value={s.pct} tone={s.pct < 45 ? 'warning' : 'brand'} label={s.stage} />
              </li>
            ))}
          </ul>
          <p className="muted mt-4 rounded-xl bg-[var(--canvas)] p-3.5 text-[13px] leading-relaxed">
            The steepest fall is between opening the checklist and completing uploads — 23 points.
            Document collection, not motivation, is where citizens are lost. DigiLocker auto-fetch
            would remove most of this step entirely.
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="mb-3 text-lg font-bold">Recurring complaint themes</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(
              COMPLAINTS.reduce<Record<string, number>>((acc, c) => {
                acc[c.category] = (acc[c.category] ?? 0) + 1;
                return acc;
              }, {}),
            )
              .sort((a, b) => b[1] - a[1])
              .map(([cat, n]) => (
                <Badge key={cat} tone={n >= 2 ? 'warning' : 'neutral'}>
                  {cat} · {n}
                </Badge>
              ))}
          </div>
        </Card>

        <p className="muted px-1 text-xs leading-relaxed">
          Figures shown are representative prototype data for demonstration. A deployed system would
          compute these from live application records, with citizen identifiers removed before
          aggregation.
        </p>
      </div>
    </AdminShell>
  );
}

function cxTrend(trend: string): string {
  const base = 'mt-0.5 h-4 w-4 shrink-0 ';
  if (trend === 'up') return `${base}text-rose-600`;
  if (trend === 'down') return `${base}text-emerald-600`;
  return `${base}text-slate-400`;
}
