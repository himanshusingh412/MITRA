'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell';
import { Badge, Button, Card, Icon, PageHeader, Skeleton, cx } from '@/components/ui';
import { useStore } from '@/lib/store';
import {
  MockDigiLockerProvider,
  SCOPE_LABEL,
  toStoredDocument,
  type DigiLockerAccount,
  type DigiLockerIssuedDoc,
  type DigiLockerScope,
} from '@/lib/integrations/digilocker';

/**
 * DigiLocker connection flow.
 *
 * Four states, matching the real OAuth journey: disconnected → consent → fetching →
 * connected. The consent step lists scopes individually and shows Aadhaar KYC as
 * explicitly *not* requested, because the trust question a citizen actually has is "what
 * are you taking?", and answering it precisely is the only honest way to ask.
 */
export default function DigiLockerPage() {
  const router = useRouter();
  const { user, documents, addDocuments } = useStore();

  const [account, setAccount] = useState<DigiLockerAccount | null>(null);
  const [stage, setStage] = useState<'idle' | 'consent' | 'authorising' | 'fetching' | 'done'>('idle');
  const [issued, setIssued] = useState<DigiLockerIssuedDoc[]>([]);
  const [imported, setImported] = useState(0);
  const [error, setError] = useState('');

  const provider = new MockDigiLockerProvider();
  const requested: DigiLockerScope[] = ['issued-documents', 'profile'];

  async function connect() {
    setError('');
    setStage('authorising');
    try {
      const { state } = await provider.beginAuthorisation(requested);
      const acct = await provider.completeAuthorisation('mock-code', state);
      setAccount(acct);

      setStage('fetching');
      const docs = await provider.listIssuedDocuments();
      setIssued(docs);

      const converted = docs.map((d) => toStoredDocument(d, user.id));
      addDocuments(converted);
      setImported(converted.length);
      setStage('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to DigiLocker.');
      setStage('idle');
    }
  }

  async function disconnect() {
    await provider.disconnect();
    setAccount(null);
    setIssued([]);
    setImported(0);
    setStage('idle');
  }

  const alreadyHeld = (type: string) =>
    documents.some((d) => d.ownerId === user.id && d.type === type && d.source !== 'digilocker');

  return (
    <AppShell>
      <div id="main" className="mx-auto max-w-[880px] space-y-5">
        <Link href="/documents" className="link-arrow">
          <Icon name="ArrowLeft" className="h-4 w-4" />
          My documents
        </Link>

        <PageHeader
          title="Connect DigiLocker"
          subtitle="Fetch documents the government has already issued to you, signed at source."
        />

        {/* ── Not connected ─────────────────────────────────────────────── */}
        {stage === 'idle' && !account && (
          <>
            <Card className="p-6">
              <div className="flex flex-wrap items-start gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/15"
                >
                  <Icon name="ShieldCheck" className="h-7 w-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold">Why connect</h2>
                  <p className="muted mt-1.5 max-w-[62ch] text-sm leading-relaxed">
                    A document fetched from DigiLocker is digitally signed by the issuing
                    department. When your documents disagree with each other, MITRA trusts the
                    signed copy — so connecting usually resolves mismatches rather than adding
                    them.
                  </p>
                </div>
              </div>

              <ul className="stagger mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: 'FileCheck2', t: 'Signed at source', d: 'No photograph, no OCR guesswork.' },
                  { icon: 'RefreshCw', t: 'Always current', d: 'Renewed certificates arrive automatically.' },
                  { icon: 'EyeOff', t: 'Read-only', d: 'MITRA cannot alter anything in your locker.' },
                ].map((b) => (
                  <li key={b.t} className="rounded-xl bg-[var(--canvas)] p-4">
                    <Icon name={b.icon} className="h-5 w-5 text-brand-500" />
                    <p className="mt-2 text-sm font-bold">{b.t}</p>
                    <p className="muted mt-0.5 text-[13px] leading-relaxed">{b.d}</p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-bold">What MITRA will ask for</h2>
              <p className="muted mt-1 text-sm">
                You approve these on DigiLocker&apos;s own screen, and can revoke them there at
                any time.
              </p>

              <ul className="mt-4 space-y-2.5">
                {(Object.keys(SCOPE_LABEL) as DigiLockerScope[]).map((scope) => {
                  const asked = requested.includes(scope);
                  return (
                    <li
                      key={scope}
                      className={cx(
                        'flex items-start gap-3 rounded-xl border p-3.5',
                        asked
                          ? 'border-[var(--border)] bg-[var(--canvas)]'
                          : 'border-dashed border-[var(--border)] opacity-70',
                      )}
                    >
                      <Icon
                        name={asked ? 'CircleCheck' : 'CircleSlash'}
                        className={cx('mt-0.5 h-4 w-4 shrink-0', asked ? 'text-emerald-600' : 'opacity-50')}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">
                          {SCOPE_LABEL[scope].label}{' '}
                          {!asked && <Badge tone="neutral">Not requested</Badge>}
                        </p>
                        <p className="muted mt-0.5 text-[13px] leading-relaxed">
                          {SCOPE_LABEL[scope].detail}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {error && (
                <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3.5 py-3 text-[13px] font-semibold text-rose-800 dark:bg-rose-500/15 dark:text-rose-300">
                  {error}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <Button size="lg" onClick={connect}>
                  <Icon name="Link2" className="h-4 w-4" />
                  Connect DigiLocker
                </Button>
                <Button href="/documents" variant="secondary" size="lg">
                  Upload manually instead
                </Button>
              </div>

              <p className="muted mt-4 flex items-start gap-2 text-xs leading-relaxed">
                <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                This prototype runs against a simulated DigiLocker. Live access requires a
                registered MeitY partner application — the integration interface is complete and
                swaps to the real API without any change to this screen.
              </p>
            </Card>
          </>
        )}

        {/* ── Working ───────────────────────────────────────────────────── */}
        {(stage === 'authorising' || stage === 'fetching') && (
          <Card className="p-6" aria-busy="true">
            <div className="flex items-center gap-3">
              <Icon name="LoaderCircle" className="h-5 w-5 animate-spin text-brand-500" />
              <p className="text-sm font-bold">
                {stage === 'authorising'
                  ? 'Waiting for you to approve access on DigiLocker…'
                  : 'Fetching your issued documents…'}
              </p>
            </div>
            <div className="mt-5 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Connected ─────────────────────────────────────────────────── */}
        {stage === 'done' && account && (
          <>
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <Icon name="ShieldCheck" className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold">DigiLocker connected</h2>
                    <p className="muted mt-0.5 text-sm">
                      {account.name} · {account.maskedId} · {imported} documents imported
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <Button variant="secondary" onClick={connect}>
                    <Icon name="RefreshCw" className="h-4 w-4" />
                    Sync now
                  </Button>
                  <Button variant="ghost" onClick={disconnect}>
                    Disconnect
                  </Button>
                </div>
              </div>

              <div className="muted mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--border)] pt-4 text-[13px]">
                <span className="flex items-center gap-1.5">
                  <Icon name="Clock" className="h-4 w-4" />
                  Synced just now
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="KeyRound" className="h-4 w-4" />
                  {account.grantedScopes.map((s) => SCOPE_LABEL[s].label).join(', ')}
                </span>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-bold">Documents fetched</h2>
              <p className="muted mt-1 text-sm">
                Signed copies now take precedence over anything photographed.
              </p>
              <ul className="stagger mt-4 space-y-2.5">
                {issued.map((d) => (
                  <li
                    key={d.uri}
                    className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--canvas)] p-3.5"
                  >
                    <Icon name="FileCheck2" className="h-5 w-5 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{d.name}</p>
                      <p className="muted truncate text-xs">{d.issuer}</p>
                    </div>
                    <Badge tone="success" icon="ShieldCheck">
                      Verified
                    </Badge>
                    {alreadyHeld(d.type) && (
                      <Badge tone="brand" icon="ArrowUpCircle">
                        Replaces uploaded copy
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={() => router.push('/documents/verify')}>
                  <Icon name="ScanSearch" className="h-4 w-4" />
                  Re-check my documents
                </Button>
                <Button href="/documents" variant="secondary">
                  Back to vault
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
