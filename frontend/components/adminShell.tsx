'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Icon, cx } from './ui';

/**
 * Admin session.
 *
 * Deliberately separate from the citizen store: a different storage key, a different
 * shell, and no shared provider. In the deployed system this maps to a distinct JWT
 * audience and cookie so a citizen token can never be replayed against an admin route.
 * The prototype keeps the same boundary in the UI so the separation is demonstrable.
 */
const ADMIN_SESSION_KEY = 'mitra.admin.session.v1';

export interface AdminSession {
  name: string;
  role: string;
  district: string;
}

export function readAdminSession(): AdminSession | null {
  try {
    const raw = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
}

export function writeAdminSession(session: AdminSession) {
  window.sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

const ADMIN_NAV = [
  { href: '/admin', icon: 'LayoutDashboard', label: 'Dashboard' },
  { href: '/admin/applications', icon: 'ClipboardCheck', label: 'Applications' },
  { href: '/admin/schemes', icon: 'LayoutList', label: 'Schemes' },
  { href: '/admin/complaints', icon: 'MessageSquareWarning', label: 'Complaints' },
  { href: '/admin/insights', icon: 'ChartNoAxesCombined', label: 'AI Insights' },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const s = readAdminSession();
    setSession(s);
    setChecked(true);
    if (!s) router.replace('/admin/login');
  }, [router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="skeleton h-10 w-40" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[230px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4 lg:flex">
        <div className="mb-6 flex items-center gap-3 px-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white">
            <Icon name="Landmark" className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-extrabold tracking-tight">MITRA</p>
            <p className="muted text-[10px] font-semibold uppercase tracking-wide">Government Portal</p>
          </div>
        </div>

        <nav aria-label="Admin navigation" className="flex flex-1 flex-col gap-1">
          {ADMIN_NAV.map((item) => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'muted hover:bg-slate-100 dark:hover:bg-slate-500/10',
                )}
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] pt-4">
          <div className="mb-3 px-1">
            <p className="text-sm font-bold">{session.name}</p>
            <p className="muted text-xs">{session.role}</p>
            <p className="muted text-xs">{session.district} district</p>
          </div>
          <button
            onClick={() => {
              clearAdminSession();
              router.push('/admin/login');
            }}
            className="muted flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-slate-500/10"
          >
            <Icon name="LogOut" className="h-4 w-4" />
            Sign out
          </button>
          <Link
            href="/"
            className="muted mt-1 flex h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-slate-500/10"
          >
            <Icon name="ArrowLeft" className="h-4 w-4" />
            Citizen app
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--canvas)]/85 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold tracking-tight">Government Dashboard</h1>
            <p className="muted truncate text-xs">
              Bihar · {session.district} district · data refreshed hourly
            </p>
          </div>
          <span className="hidden items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 sm:flex">
            <Icon name="ShieldAlert" className="h-4 w-4" />
            Restricted — official use only
          </span>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>

        {/* Mobile nav */}
        <nav className="sticky bottom-0 flex border-t border-[var(--border)] bg-[var(--surface)] lg:hidden">
          {ADMIN_NAV.map((item) => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold',
                  active ? 'text-brand-600 dark:text-brand-300' : 'muted',
                )}
              >
                <Icon name={item.icon} className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
