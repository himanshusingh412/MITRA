'use client';

import { useState } from 'react';
import { AppShell } from '@/components/shell';
import { Card, EmptyState, Icon, PageHeader } from '@/components/ui';
import Link from 'next/link';
import { SERVICES } from '@/lib/demoData';

export default function ServicesPage() {
  const [query, setQuery] = useState('');

  const filtered = SERVICES.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.description.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell>
      <div id="main" className="mx-auto max-w-[1000px] space-y-5">
        <PageHeader
          title="Government Services"
          subtitle="Apply for and manage the documents and identity records that most schemes depend on."
        />

        <div className="surface flex h-12 items-center gap-2 rounded-xl px-4">
          <Icon name="Search" className="h-4 w-4 opacity-50" />
          <label htmlFor="svc" className="sr-only">
            Search services
          </label>
          <input
            id="svc"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services"
            className="input-bare"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="SearchX"
            title="No service matches that"
            body="Try a different term, or ask the assistant — it can point you to the right service."
            action={{ label: 'Ask MITRA', href: '/assistant' }}
          />
        ) : (
          <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* The whole card is the link, not a small button inside it — a 44px
                target inside a 200px card is the wrong thing to ask a thumb to hit. */}
            {filtered.map((s) => (
              <Link
                key={s.id}
                href={s.href}
                className="card card-interactive group flex flex-col p-5"
              >
                <span
                  aria-hidden="true"
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: `${s.accent}18`, color: s.accent }}
                >
                  <Icon name={s.icon} className="h-6 w-6" />
                </span>
                <h3 className="text-[15px] font-bold">{s.name}</h3>
                <p className="muted mt-1.5 flex-1 text-[13px] leading-relaxed">{s.description}</p>
                <span className="link-arrow mt-4">
                  View details
                  <Icon
                    name="ArrowRight"
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            ))}
          </div>
        )}

        <Card className="flex flex-wrap items-center gap-4 p-5">
          <Icon name="Info" className="h-6 w-6 shrink-0 text-brand-500" />
          <p className="muted min-w-0 flex-1 text-[13px] leading-relaxed">
            Each service page explains what you can do, what to bring and where to go. In a deployed
            version these connect directly to UMANG, DigiLocker and the relevant departmental portals
            so the citizen never leaves MITRA.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
