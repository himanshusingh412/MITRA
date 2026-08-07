'use client';

import { useState } from 'react';
import { AppShell } from '@/components/shell';
import { Button, Card, EmptyState, Icon, PageHeader } from '@/components/ui';
import { useStore } from '@/lib/store';
import { SERVICES } from '@/lib/demoData';

export default function ServicesPage() {
  const { t } = useStore();
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
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <Card key={s.id} className="flex flex-col p-5">
                <span
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: `${s.accent}18`, color: s.accent }}
                >
                  <Icon name={s.icon} className="h-6 w-6" />
                </span>
                <h3 className="text-[15px] font-bold">{s.name}</h3>
                <p className="muted mt-1.5 flex-1 text-[13px] leading-relaxed">{s.description}</p>
                <Button href="/assistant" variant="secondary" size="sm" className="mt-4 self-start">
                  Get help with this
                  <Icon name="ArrowRight" className="h-3.5 w-3.5" />
                </Button>
              </Card>
            ))}
          </div>
        )}

        <Card className="flex flex-wrap items-center gap-4 p-5">
          <Icon name="Info" className="h-6 w-6 shrink-0 text-brand-500" />
          <p className="muted min-w-0 flex-1 text-[13px] leading-relaxed">
            In this prototype, each service opens guidance from the MITRA assistant. In a deployed
            version these connect directly to UMANG, DigiLocker and the relevant departmental portals
            so the citizen never leaves MITRA.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
