'use client';

import { useState } from 'react';
import { AppShell } from '@/components/shell';
import { Badge, Button, Card, Icon, PageHeader, cx } from '@/components/ui';
import { useStore } from '@/lib/store';
import { CSC_CENTRES } from '@/lib/demoData';

const FAQS = [
  {
    q: 'Is MITRA an official Government of India service?',
    a: 'No. MITRA is an independent prototype built for Smart India Hackathon 2026. It uses publicly available scheme information to help you understand what you may qualify for. Always confirm at a Common Service Centre or on the official portal before you rely on a result.',
  },
  {
    q: 'How does MITRA decide which schemes to show me?',
    a: 'Each scheme has a set of published criteria — age, income, occupation, location, category and so on. MITRA checks your profile against every criterion and shows you which ones you meet and which you do not. You can see the full reasoning on any scheme page; nothing is hidden behind a score.',
  },
  {
    q: 'Does my personal data leave my device?',
    a: 'In this prototype, no. Eligibility checks, document reading and the assistant all run locally in your browser. A deployed version would store data on government-approved infrastructure with encryption at rest and full audit logging.',
  },
  {
    q: 'Why does MITRA say "verify" instead of just yes or no?',
    a: 'Some criteria depend on documents or state-level rules that MITRA cannot confirm on its own — an income threshold that differs by state, for example. Rather than guess, MITRA tells you it is close and worth checking, so you do not make a wasted trip or miss a scheme you would actually get.',
  },
  {
    q: 'What if my documents do not match each other?',
    a: 'Run a document check. MITRA compares every document against every other one and flags differences in name, date of birth or address — the clerical mismatches that cause most rejections — along with exactly what to correct and where.',
  },
  {
    q: 'Can I use MITRA for my parents or children?',
    a: 'Yes. Add them in the Family Dashboard and MITRA will check every scheme against their profile too, track their applications and remind you about their deadlines alongside your own.',
  },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { t } = useStore();

  return (
    <AppShell>
      <div id="main" className="mx-auto max-w-[900px] space-y-5">
        <PageHeader
          title="Help & Support"
          subtitle="Find a centre near you, or get answers to the questions people ask most."
        />

        {/* Quick help */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-5">
            <Icon name="Bot" className="mb-3 h-6 w-6 text-brand-500" />
            <h3 className="text-sm font-bold">Ask the assistant</h3>
            <p className="muted mt-1 text-[13px]">Describe your situation in your own language.</p>
            <Button href="/assistant" variant="secondary" size="sm" className="mt-3">
              Open assistant
            </Button>
          </Card>
          <Card className="p-5">
            <Icon name="Phone" className="mb-3 h-6 w-6 text-emerald-600" />
            <h3 className="text-sm font-bold">Call a helpline</h3>
            <p className="muted mt-1 text-[13px]">National CSC helpline, available in 12 languages.</p>
            <a href="tel:1800121-3468" className="link-arrow mt-3 inline-flex">
              1800-121-3468
              <Icon name="ArrowRight" className="h-4 w-4" />
            </a>
          </Card>
          <Card className="p-5">
            <Icon name="MessageSquareWarning" className="mb-3 h-6 w-6 text-amber-600" />
            <h3 className="text-sm font-bold">Raise a complaint</h3>
            <p className="muted mt-1 text-[13px]">If an application is stuck or wrongly rejected.</p>
            <Button href="/assistant" variant="secondary" size="sm" className="mt-3">
              Report an issue
            </Button>
          </Card>
        </div>

        {/* CSC locator */}
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Centres near you</h2>
              <p className="muted mt-0.5 text-sm">
                Common Service Centres and government offices around Muzaffarpur, Bihar.
              </p>
            </div>
            <Badge tone="brand" icon="MapPin">
              5 nearby
            </Badge>
          </div>

          {/* Simple map placeholder rendered as a schematic, not a dead image */}
          <div className="relative mb-4 h-40 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-blue-50 to-brand-50 dark:from-emerald-500/10 dark:via-blue-500/10 dark:to-brand-500/10">
            <div className="absolute inset-0 opacity-40" aria-hidden="true">
              <svg width="100%" height="100%" viewBox="0 0 400 160" preserveAspectRatio="none">
                <path d="M0 90 Q 100 60 200 95 T 400 70" stroke="#94a3b8" strokeWidth="2" fill="none" />
                <path d="M60 0 L 90 160" stroke="#cbd5e1" strokeWidth="8" fill="none" />
                <path d="M260 0 L 230 160" stroke="#cbd5e1" strokeWidth="6" fill="none" />
              </svg>
            </div>
            {CSC_CENTRES.slice(0, 4).map((c, i) => (
              <span
                key={c.id}
                className="absolute flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white shadow-lift"
                style={{ left: `${18 + i * 21}%`, top: `${30 + (i % 3) * 20}%` }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
            ))}
            <p className="muted absolute bottom-2 right-3 text-[11px]">
              Map view — connects to Google Maps in deployment
            </p>
          </div>

          <ul className="space-y-2">
            {CSC_CENTRES.map((c, i) => (
              <li key={c.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-[var(--border)] p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold">{c.name}</h3>
                    <Badge tone={c.open ? 'success' : 'neutral'}>{c.open ? 'Open now' : 'Closed'}</Badge>
                  </div>
                  <p className="muted mt-1 text-[13px]">{c.address}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.services.map((s) => (
                      <span
                        key={s}
                        className="muted rounded-lg bg-[var(--canvas)] px-2 py-1 text-[11px] font-semibold"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-sm font-bold">{c.distanceKm} km</span>
                  <a href={`tel:${c.phone}`} className="link-arrow text-xs">
                    <Icon name="Phone" className="h-3.5 w-3.5" />
                    Call
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* FAQ */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold">Common questions</h2>
          <ul className="divide-y divide-[var(--border)]">
            {FAQS.map((f, i) => (
              <li key={f.q}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="flex w-full items-start gap-3 py-4 text-left"
                >
                  <Icon
                    name="ChevronRight"
                    className={cx(
                      'mt-0.5 h-5 w-5 shrink-0 text-brand-500 transition-transform',
                      openFaq === i && 'rotate-90',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{f.q}</span>
                    {openFaq === i && (
                      <span className="muted mt-2 block text-sm leading-relaxed animate-fade-up">{f.a}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
