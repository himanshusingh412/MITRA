'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '@/lib/store';
import { LOCALES } from '@/lib/i18n';
import { Badge, Icon, cx } from './ui';
import { MitraMark } from './Brand';
import type { Locale } from '@/types';

const NAV = [
  { href: '/dashboard', icon: 'Home', key: 'nav.home' },
  { href: '/schemes', icon: 'LayoutList', key: 'nav.schemes' },
  { href: '/services', icon: 'Grid2x2', key: 'nav.services' },
  { href: '/applications', icon: 'ClipboardList', key: 'nav.applications' },
  { href: '/documents', icon: 'FileText', key: 'nav.documents' },
  { href: '/family', icon: 'Users', key: 'nav.family' },
  { href: '/notifications', icon: 'Bell', key: 'nav.notifications' },
  { href: '/help', icon: 'CircleHelp', key: 'nav.help' },
  { href: '/settings', icon: 'Settings', key: 'nav.settings' },
];

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  // The mark carries its own disc, so no coloured chip is drawn behind it — stacking one
  // on the other is what makes a logo look pasted in rather than designed in.
  return <MitraMark className={size === 'sm' ? 'h-9 w-9' : 'h-11 w-11'} title="" />;
}

function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.language')}
        className="surface flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10"
      >
        <Icon name="Globe" className="h-4 w-4 text-brand-500" />
        <span className={compact ? 'hidden sm:inline' : ''}>{current.native}</span>
        <Icon name="ChevronDown" className="h-4 w-4 opacity-60" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="surface absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl p-1 shadow-lift animate-fade-up"
        >
          {LOCALES.map((l) => (
            <li key={l.code}>
              <button
                role="option"
                aria-selected={l.code === locale}
                onClick={() => {
                  setLocale(l.code as Locale);
                  setOpen(false);
                }}
                className={cx(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors',
                  l.code === locale
                    ? 'bg-brand-50 font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'
                    : 'hover:bg-brand-50 dark:hover:bg-brand-500/10',
                )}
              >
                <span>{l.native}</span>
                <span className="muted text-xs">{l.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t, unreadCount } = useStore();

  return (
    <nav aria-label="Main navigation" className="flex h-full flex-col gap-1 p-4">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="mb-6 flex items-center gap-3 rounded-xl px-1 py-1"
        aria-label="MITRA home"
      >
        <Logo />
        <div className="leading-tight">
          <p className="text-lg font-extrabold tracking-tight text-brand-500 dark:text-white">
            MI<span className="text-gold-500">TRA</span>
          </p>
          <p className="muted text-[10px] font-medium">Digital Citizen Assistant</p>
        </div>
      </Link>

      <ul className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-400/25 dark:text-white'
                    : 'muted hover:bg-brand-50/70 dark:hover:bg-brand-500/10',
                )}
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
                <span className="truncate">{t(item.key)}</span>
                {item.href === '/notifications' && unreadCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
        <Link
          href="/assistant"
          onClick={onNavigate}
          className="flex h-11 w-full items-center gap-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-400 px-3 text-sm font-semibold text-white dark:from-brand-400 dark:to-brand-300 dark:text-brand-900 transition-opacity hover:opacity-95"
        >
          <Icon name="Mic" className="h-[18px] w-[18px]" />
          Voice Assistant
        </Link>
        <Link
          href="/admin/login"
          onClick={onNavigate}
          className="muted flex h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold transition-colors hover:bg-brand-50/70 dark:hover:bg-brand-500/10"
        >
          <Icon name="Shield" className="h-4 w-4" />
          Government Portal
        </Link>
      </div>
    </nav>
  );
}

function OfflineBanner() {
  const { online, t } = useStore();
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 dark:bg-amber-500/15 dark:text-amber-300"
    >
      <Icon name="CloudOff" className="h-4 w-4" />
      {t('common.offline')}
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, t, theme, toggleTheme, unreadCount } = useStore();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--canvas)]/85 backdrop-blur-md">
      <OfflineBanner />
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          onClick={onMenu}
          aria-label="Open menu"
          className="surface flex h-11 w-11 items-center justify-center rounded-xl lg:hidden"
        >
          <Icon name="Menu" className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold tracking-tight sm:text-[22px]">
            Digital Citizen Assistant
          </h1>
          <p className="muted hidden truncate text-xs sm:block">{t('app.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />

          <button
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="surface flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10"
          >
            <Icon name={theme === 'light' ? 'Moon' : 'Sun'} className="h-[18px] w-[18px]" />
          </button>

          <Link
            href="/notifications"
            aria-label={`${t('nav.notifications')}${unreadCount ? `, ${unreadCount} unread` : ''}`}
            className="surface relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10"
          >
            <Icon name="Bell" className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[var(--surface)]" />
            )}
          </Link>

          <Link
            href="/settings"
            className="surface flex h-11 items-center gap-2 rounded-xl pl-1.5 pr-3 transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: user.avatarColor }}
              aria-hidden="true"
            >
              {user.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
            </span>
            <span className="hidden text-sm font-semibold sm:inline">{user.name}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 border-r border-[var(--border)] bg-[var(--surface)] lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 h-full w-[264px] bg-[var(--surface)] shadow-lift animate-fade-up">
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMenuOpen(true)} />
        {/*
          Keyed on pathname so the entrance animation replays on every route change,
          giving navigation a sense of forward motion. The key also discards the previous
          route's DOM outright, which is what prevents the old page from being visible
          underneath the new one during the transition.
        */}
        <main key={pathname} className="route-enter flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
        <FeatureStrip />
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: 'Languages', key: 'feature.multilingual', descKey: 'feature.multilingualDesc', accent: 'text-brand-500 bg-brand-50 dark:bg-brand-500/15' },
  { icon: 'Mic', key: 'feature.voice', descKey: 'feature.voiceDesc', accent: 'text-violet-600 bg-violet-50 dark:bg-violet-500/15' },
  { icon: 'ShieldCheck', key: 'feature.secure', descKey: 'feature.secureDesc', accent: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15' },
  { icon: 'UserRoundCheck', key: 'feature.personal', descKey: 'feature.personalDesc', accent: 'text-blue-600 bg-blue-50 dark:bg-blue-500/15' },
  { icon: 'BellRing', key: 'feature.updated', descKey: 'feature.updatedDesc', accent: 'text-amber-600 bg-amber-50 dark:bg-amber-500/15' },
];

function FeatureStrip() {
  const { t } = useStore();
  return (
    <footer className="mt-6 border-t border-[var(--border)] bg-brand-50/50 px-4 py-8 dark:bg-brand-500/[0.06] sm:px-6 lg:px-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {FEATURES.map((f) => (
          <div key={f.key} className="flex gap-3">
            <div className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', f.accent)}>
              <Icon name={f.icon} className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">{t(f.key)}</p>
              <p className="muted mt-0.5 text-xs leading-relaxed">{t(f.descKey)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <p className="text-xs">
            <span className="font-bold text-brand-600 dark:text-brand-300">MITRA</span>
            <span className="muted"> — Multilingual Intelligent Technology for Responsive Assistance</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {LOCALES.map((l) => (
            <Badge key={l.code} tone="neutral">
              {l.native}
            </Badge>
          ))}
          <Badge tone="brand">+18 more</Badge>
        </div>
      </div>
      <p className="muted mt-4 text-[11px] leading-relaxed">
        MITRA is an independent prototype built for Smart India Hackathon 2026. It is not an official
        Government of India product. Eligibility results are advisory — always confirm at a Common
        Service Centre before you rely on them.
      </p>
    </footer>
  );
}
