'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  PageHeader,
  ProgressBar,
  Skeleton,
  cx,
} from '@/components/ui';
import { useStore } from '@/lib/store';
import { autofillValues, verifyDocumentSet } from '@/lib/documentVerification';
import type { IssueSeverity, VerificationIssue } from '@/lib/documentVerification';

const SEVERITY_STYLE: Record<IssueSeverity, { tone: 'danger' | 'warning' | 'info'; icon: string; label: string; ring: string }> = {
  blocker: { tone: 'danger', icon: 'OctagonAlert', label: 'Will likely cause rejection', ring: 'border-rose-200 dark:border-rose-500/30' },
  warning: { tone: 'warning', icon: 'TriangleAlert', label: 'Worth fixing', ring: 'border-amber-200 dark:border-amber-500/30' },
  info: { tone: 'info', icon: 'Info', label: 'For your information', ring: 'border-blue-200 dark:border-blue-500/30' },
};

export default function VerifyDocumentsPage() {
  const { user, allPeople, documents, t } = useStore();
  const [personId, setPersonId] = useState(user.id);
  const [scanning, setScanning] = useState(false);
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const person = allPeople.find((p) => p.id === personId) ?? user;
  const report = useMemo(() => verifyDocumentSet(person, documents), [person, documents]);

  const openIssues = report.issues.filter((i) => !resolved.has(i.id));
  const blockers = openIssues.filter((i) => i.severity === 'blocker');
  const warnings = openIssues.filter((i) => i.severity === 'warning');
  const personDocs = documents.filter((d) => d.ownerId === person.id);
  const autofill = autofillValues(report);

  function rescan() {
    setScanning(true);
    window.setTimeout(() => setScanning(false), 900);
  }

  return (
    <AppShell>
      <div id="main" className="mx-auto max-w-[900px] space-y-5">
        <Link href="/documents" className="link-arrow">
          <Icon name="ArrowLeft" className="h-4 w-4" />
          My documents
        </Link>

        <PageHeader title={t('docs.verifyTitle')} subtitle={t('docs.verifySub')}>
          <select
            value={personId}
            onChange={(e) => {
              setPersonId(e.target.value);
              setResolved(new Set());
            }}
            aria-label="Check documents for"
            className="surface h-11 rounded-xl px-3 text-sm font-semibold outline-none"
          >
            {allPeople.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.relation ? ` — ${p.relation}` : ' — You'}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={rescan} disabled={scanning}>
            <Icon name={scanning ? 'Loader' : 'ScanSearch'} className={cx('h-4 w-4', scanning && 'animate-spin')} />
            {scanning ? 'Scanning' : 'Re-scan'}
          </Button>
        </PageHeader>

        {personDocs.length === 0 ? (
          <EmptyState
            icon="FileStack"
            title="No documents to check yet"
            body={`${person.name.split(' ')[0]} has no documents in the vault. Upload them, or import from DigiLocker, and MITRA will cross-check every field before you apply.`}
            action={{ label: 'Add documents', href: '/documents' }}
          />
        ) : (
          <>
            {/* ── Summary ────────────────────────────────────────────────── */}
            <Card className="p-6">
              {scanning ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-52" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={cx(
                          'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
                          blockers.length > 0
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300'
                            : warnings.length > 0
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300'
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
                        )}
                      >
                        <Icon
                          name={blockers.length > 0 ? 'ShieldAlert' : warnings.length > 0 ? 'ShieldQuestion' : 'ShieldCheck'}
                          className="h-7 w-7"
                        />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">
                          {blockers.length === 0 ? t('docs.ready') : t('docs.notReady')}
                        </h2>
                        <p className="muted mt-0.5 text-sm">{report.summary}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold tracking-tight">{report.consistencyScore}%</p>
                      <p className="muted text-xs font-semibold uppercase tracking-wide">
                        {t('docs.consistency')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <ProgressBar
                      value={report.consistencyScore}
                      tone={blockers.length > 0 ? 'danger' : warnings.length > 0 ? 'warning' : 'success'}
                      label="Document consistency"
                    />
                  </div>

                  <div className="muted mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--border)] pt-4 text-[13px]">
                    <span className="flex items-center gap-1.5">
                      <Icon name="Files" className="h-4 w-4" />
                      {report.documentsChecked} documents read
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon name="GitCompareArrows" className="h-4 w-4" />
                      {report.fieldsCompared} field pairs compared
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon name="OctagonAlert" className="h-4 w-4" />
                      {blockers.length} blocking
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon name="TriangleAlert" className="h-4 w-4" />
                      {warnings.length} to review
                    </span>
                  </div>
                </>
              )}
            </Card>

            {/* ── Issues ─────────────────────────────────────────────────── */}
            {openIssues.length === 0 ? (
              <Card className="flex flex-col items-center gap-3 p-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15">
                  <Icon name="CheckCheck" className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold">Everything matches</h3>
                <p className="muted max-w-md text-sm leading-relaxed">
                  All of {person.name.split(' ')[0]}&apos;s documents agree with each other. Applications
                  submitted with this set are unlikely to be rejected on document grounds.
                </p>
                <Button href="/schemes" className="mt-2">
                  Find schemes to apply for
                </Button>
              </Card>
            ) : (
              <section className="space-y-3">
                <h2 className="text-lg font-bold">
                  {openIssues.length} {openIssues.length === 1 ? 'issue' : 'issues'} to fix
                </h2>
                {openIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    documents={documents}
                    onResolve={() => setResolved((prev) => new Set(prev).add(issue.id))}
                  />
                ))}
              </section>
            )}

            {/* ── Auto-fill preview ──────────────────────────────────────── */}
            {Object.keys(autofill).length > 0 && (
              <Card className="p-6">
                <div className="mb-1 flex items-center gap-2">
                  <Icon name="Wand2" className="h-5 w-5 text-brand-500" />
                  <h2 className="text-lg font-bold">What MITRA will fill into your forms</h2>
                </div>
                <p className="muted mb-4 text-sm leading-relaxed">
                  These values are taken from your most authoritative documents rather than what you
                  typed, because the department will verify against the documents.
                </p>
                <dl className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(autofill).map(([field, { value, confidence }]) => (
                    <div key={field} className="rounded-xl border border-[var(--border)] p-3.5">
                      <dt className="muted text-xs font-bold uppercase tracking-wide">
                        {FIELD_LABELS[field] ?? field}
                      </dt>
                      <dd className="mt-1 truncate text-sm font-semibold" title={value}>
                        {value}
                      </dd>
                      <dd className="mt-2">
                        <Badge tone={confidence >= 80 ? 'success' : confidence >= 60 ? 'warning' : 'danger'}>
                          {confidence}% of documents agree
                        </Badge>
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}

            {/* ── Documents read ─────────────────────────────────────────── */}
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-bold">Documents checked</h2>
              <ul className="space-y-2">
                {personDocs.map((doc) => {
                  const involved = openIssues.filter((i) => i.documentIds.includes(doc.id)).length;
                  return (
                    <li
                      key={doc.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] p-3.5"
                    >
                      <Icon name="FileText" className="h-5 w-5 shrink-0 text-brand-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{doc.name}</p>
                        <p className="muted mt-0.5 text-xs">
                          {Object.keys(doc.extracted ?? {}).length} fields read
                          {doc.source === 'digilocker' && ' · from DigiLocker'}
                          {doc.source === 'csc' && ' · issued at a CSC'}
                        </p>
                      </div>
                      {doc.source === 'digilocker' && <Badge tone="info" icon="BadgeCheck">Digitally signed</Badge>}
                      <Badge tone={involved === 0 ? 'success' : 'warning'}>
                        {involved === 0 ? 'Consistent' : `${involved} issue${involved > 1 ? 's' : ''}`}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </>
        )}

        <p className="muted px-1 text-xs leading-relaxed">
          MITRA reads your documents on your device and compares them locally. Detection is advisory —
          a department may still ask for corrections MITRA did not anticipate.
        </p>
      </div>
    </AppShell>
  );
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  dob: 'Date of birth',
  address: 'Address',
  gender: 'Gender',
  idNumber: 'ID number',
  fatherName: "Father's / husband's name",
};

function IssueCard({
  issue,
  documents,
  onResolve,
}: {
  issue: VerificationIssue;
  documents: ReturnType<typeof useStore>['documents'];
  onResolve: () => void;
}) {
  const style = SEVERITY_STYLE[issue.severity];
  const involved = documents.filter((d) => issue.documentIds.includes(d.id));

  return (
    <Card className={cx('p-5', style.ring)}>
      <div className="flex items-start gap-3.5">
        <div
          className={cx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            issue.severity === 'blocker'
              ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300'
              : issue.severity === 'warning'
                ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300'
                : 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
          )}
        >
          <Icon name={style.icon} className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={style.tone}>{style.label}</Badge>
            <Badge tone="neutral">{FIELD_LABELS[issue.field] ?? issue.field}</Badge>
          </div>

          <h3 className="mt-2 text-[15px] font-bold leading-snug">{issue.title}</h3>
          <p className="muted mt-1.5 text-sm leading-relaxed">{issue.detail}</p>

          <div className="mt-3.5 rounded-xl bg-brand-50 p-3.5 dark:bg-brand-500/10">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-300">
              <Icon name="Lightbulb" className="h-3.5 w-3.5" />
              What to do
            </p>
            <p className="mt-1.5 text-sm leading-relaxed">{issue.suggestion}</p>
            {issue.recommendedValue && (
              <p className="mt-2 text-sm">
                <span className="muted">Correct value: </span>
                <span className="font-bold">{issue.recommendedValue}</span>
              </p>
            )}
          </div>

          {involved.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {involved.map((d) => (
                <span
                  key={d.id}
                  className="muted flex items-center gap-1.5 rounded-lg bg-[var(--canvas)] px-2.5 py-1.5 text-xs font-semibold"
                >
                  <Icon name="FileText" className="h-3.5 w-3.5" />
                  {d.name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button href="/help" variant="secondary" size="sm">
              <Icon name="MapPin" className="h-3.5 w-3.5" />
              Find a centre to fix this
            </Button>
            <Button variant="ghost" size="sm" onClick={onResolve}>
              <Icon name="Check" className="h-3.5 w-3.5" />
              Mark as sorted
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
