'use client';

import { useState } from 'react';
import { AppShell } from '@/components/shell';
import { Badge, Button, Card, Icon, PageHeader, cx } from '@/components/ui';
import { useStore } from '@/lib/store';
import { LOCALES } from '@/lib/i18n';
import type { Area, Category, Occupation } from '@/types';

const OCCUPATIONS: Occupation[] = [
  'farmer', 'student', 'salaried', 'self-employed', 'daily-wage', 'homemaker', 'unemployed', 'retired', 'artisan',
];
const CATEGORIES: Category[] = ['general', 'obc', 'sc', 'st', 'ews', 'minority'];

export default function SettingsPage() {
  const { user, updateProfile, locale, setLocale, theme, toggleTheme, t } = useStore();
  const [saved, setSaved] = useState(false);

  function patch<K extends keyof typeof user>(key: K, value: (typeof user)[K]) {
    updateProfile({ [key]: value } as Partial<typeof user>);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <AppShell>
      <div id="main" className="mx-auto max-w-[820px] space-y-5">
        <PageHeader
          title="Settings"
          subtitle="Your profile drives every recommendation. Keeping it current is what makes MITRA useful."
        >
          {saved && (
            <Badge tone="success" icon="Check">
              Saved
            </Badge>
          )}
        </PageHeader>

        {/* Profile */}
        <Card className="p-6">
          <h2 className="mb-1 text-lg font-bold">Your profile</h2>
          <p className="muted mb-5 text-sm">
            Changing anything here immediately re-checks all 18 schemes against your new details.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input
                value={user.name}
                onChange={(e) => patch('name', e.target.value)}
                className="input h-11"
              />
            </Field>

            <Field label="Age" hint="Drives pension and scholarship eligibility">
              <input
                type="number"
                min={0}
                max={120}
                value={user.age}
                onChange={(e) => patch('age', Number(e.target.value))}
                className="input h-11"
              />
            </Field>

            <Field label="Annual household income" hint="Most schemes have an income ceiling">
              <input
                type="number"
                min={0}
                step={1000}
                value={user.annualIncome}
                onChange={(e) => patch('annualIncome', Number(e.target.value))}
                className="input h-11"
              />
            </Field>

            <Field label="Occupation">
              <select
                value={user.occupation}
                onChange={(e) => patch('occupation', e.target.value as Occupation)}
                className="input h-11 capitalize"
              >
                {OCCUPATIONS.map((o) => (
                  <option key={o} value={o}>
                    {o.replace('-', ' ')}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Category">
              <select
                value={user.category}
                onChange={(e) => patch('category', e.target.value as Category)}
                className="input h-11 uppercase"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.toUpperCase()}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Area">
              <select
                value={user.area}
                onChange={(e) => patch('area', e.target.value as Area)}
                className="input h-11 capitalize"
              >
                <option value="rural">Rural</option>
                <option value="urban">Urban</option>
              </select>
            </Field>

            <Field label="District">
              <input
                value={user.district}
                onChange={(e) => patch('district', e.target.value)}
                className="input h-11"
              />
            </Field>

            <Field label="State">
              <input
                value={user.state}
                onChange={(e) => patch('state', e.target.value)}
                className="input h-11"
              />
            </Field>

            <Field label="Family size">
              <input
                type="number"
                min={1}
                value={user.familySize}
                onChange={(e) => patch('familySize', Number(e.target.value))}
                className="input h-11"
              />
            </Field>

            <Field label="Land holding (hectares)" hint="Required for PM-KISAN">
              <input
                type="number"
                min={0}
                step={0.1}
                value={user.landHoldingHectares ?? 0}
                onChange={(e) => patch('landHoldingHectares', Number(e.target.value))}
                className="input h-11"
              />
            </Field>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] p-4">
            <input
              type="checkbox"
              checked={user.hasDisability}
              onChange={(e) => patch('hasDisability', e.target.checked)}
              className="h-4 w-4 rounded accent-brand-500"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">I have a certified disability</span>
              <span className="muted block text-[13px]">Unlocks disability pension and related schemes</span>
            </span>
          </label>

          {user.hasDisability && (
            <div className="mt-3 animate-fade-up">
              <Field label="Disability percentage" hint="80% or above qualifies for the disability pension">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={user.disabilityPercent ?? 0}
                  onChange={(e) => patch('disabilityPercent', Number(e.target.value))}
                  className="input h-11 sm:w-48"
                />
              </Field>
            </div>
          )}
        </Card>

        {/* Language */}
        <Card className="p-6">
          <h2 className="mb-1 text-lg font-bold">{t('common.language')}</h2>
          <p className="muted mb-4 text-sm">
            The interface and the assistant both switch language immediately.
          </p>
          <div className="flex flex-wrap gap-2">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLocale(l.code)}
                aria-pressed={locale === l.code}
                className={cx(
                  'flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors',
                  locale === l.code
                    ? 'bg-brand-500 text-white'
                    : 'surface hover:bg-brand-50 dark:hover:bg-brand-500/10',
                )}
              >
                {l.native}
                <span className={cx('text-xs', locale === l.code ? 'text-white/70' : 'opacity-60')}>
                  {l.label}
                </span>
              </button>
            ))}
          </div>
          <p className="muted mt-3 text-[13px]">
            18 further scheduled languages are planned; the architecture adds a language by adding a
            message catalogue, with no code changes.
          </p>
        </Card>

        {/* Accessibility & appearance */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold">Appearance & accessibility</h2>
          <ul className="space-y-3">
            <li className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] p-4">
              <Icon name={theme === 'light' ? 'Sun' : 'Moon'} className="h-5 w-5 shrink-0 text-brand-500" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Theme</span>
                <span className="muted block text-[13px]">
                  Both themes meet WCAG AA contrast on every screen.
                </span>
              </span>
              <Button variant="secondary" size="sm" onClick={toggleTheme}>
                Switch to {theme === 'light' ? 'dark' : 'light'}
              </Button>
            </li>
            <li className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] p-4">
              <Icon name="Type" className="h-5 w-5 shrink-0 text-brand-500" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Text size</span>
                <span className="muted block text-[13px]">
                  Use your browser or phone zoom — MITRA stays usable up to 200%.
                </span>
              </span>
            </li>
            <li className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] p-4">
              <Icon name="Accessibility" className="h-5 w-5 shrink-0 text-brand-500" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Reduced motion</span>
                <span className="muted block text-[13px]">
                  MITRA follows your system setting automatically — no animation if you have asked
                  your device to reduce it.
                </span>
              </span>
            </li>
          </ul>
        </Card>

        {/* Privacy */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold">Data & privacy</h2>
          <ul className="muted space-y-2.5 text-sm leading-relaxed">
            <li className="flex gap-2.5">
              <Icon name="ShieldCheck" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              In this prototype your profile, documents and conversations never leave your browser.
            </li>
            <li className="flex gap-2.5">
              <Icon name="Lock" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Only your language and theme preferences are saved between visits.
            </li>
            <li className="flex gap-2.5">
              <Icon name="FileKey" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              A deployed version would encrypt personal data at rest, log every administrative
              access, and keep citizen and government sessions fully separate.
            </li>
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
      {hint && <span className="muted mt-1 block text-xs">{hint}</span>}
    </label>
  );
}
