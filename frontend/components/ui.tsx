'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import * as Icons from 'lucide-react';
import type { MatchLevel } from '@/types';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Renders a Lucide icon by name so icons can be stored as data in the scheme catalogue. */
export function Icon({
  name,
  className = 'h-5 w-5',
  strokeWidth = 2,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <Cmp className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

export const ACCENTS: Record<string, { bg: string; fg: string; ring: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-500/15', fg: 'text-blue-600 dark:text-blue-300', ring: 'ring-blue-100 dark:ring-blue-500/20' },
  green: { bg: 'bg-emerald-50 dark:bg-emerald-500/15', fg: 'text-emerald-600 dark:text-emerald-300', ring: 'ring-emerald-100 dark:ring-emerald-500/20' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-500/15', fg: 'text-amber-600 dark:text-amber-300', ring: 'ring-amber-100 dark:ring-amber-500/20' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-500/15', fg: 'text-violet-600 dark:text-violet-300', ring: 'ring-violet-100 dark:ring-violet-500/20' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-500/15', fg: 'text-rose-600 dark:text-rose-300', ring: 'ring-rose-100 dark:ring-rose-500/20' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-500/15', fg: 'text-teal-600 dark:text-teal-300', ring: 'ring-teal-100 dark:ring-teal-500/20' },
};

export function Card({
  children,
  className = '',
  as = 'div',
  id,
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
  id?: string;
}) {
  const Tag = as;
  return (
    <Tag id={id} className={cx('card', className)}>
      {children}
    </Tag>
  );
}

export function Button({
  children,
  onClick,
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  disabled,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const variants = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm',
    secondary: 'surface hover:bg-brand-50 dark:hover:bg-brand-500/10',
    ghost: 'hover:bg-brand-50 dark:hover:bg-brand-500/10',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
  };
  // Minimum 44px height on md/lg: this product is used by elderly citizens on small phones.
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  };
  const cls = cx(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cls} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} className={cls} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className = '',
  icon,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
  className?: string;
  icon?: string;
}) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300',
    danger: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

/**
 * Eligibility badge. Status is conveyed by icon and words as well as colour — colour
 * alone would exclude colour-blind users, and this is the single most important
 * signal in the product.
 */
export function EligibilityBadge({ level, label }: { level: MatchLevel; label?: string }) {
  const map = {
    eligible: { tone: 'success' as const, icon: 'CheckCircle2', text: 'You may be eligible' },
    verify: { tone: 'warning' as const, icon: 'AlertCircle', text: 'Likely eligible — verify' },
    'not-eligible': { tone: 'neutral' as const, icon: 'MinusCircle', text: 'Not eligible right now' },
  };
  const cfg = map[level];
  return (
    <Badge tone={cfg.tone} icon={cfg.icon}>
      {label ?? cfg.text}
    </Badge>
  );
}

export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div className={cx('skeleton', className)} aria-hidden="true" />;
}

export function EmptyState({
  icon = 'Inbox',
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/15">
        <Icon name={icon} className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="muted mt-1 max-w-sm text-sm">{body}</p>
      {action && (
        <Button href={action.href} variant="secondary" className="mt-5">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  tone = 'brand',
  label,
}: {
  value: number;
  max?: number;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  const tones = {
    brand: 'bg-brand-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
  };
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progress'}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/50"
    >
      <div className={cx('h-full rounded-full transition-all duration-500', tones[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
      {action && (
        <Link href={action.href} className="link-arrow shrink-0">
          {action.label}
          <Icon name="ArrowRight" className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="muted mt-1 max-w-2xl text-sm">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function Stat({
  label,
  value,
  delta,
  icon,
  accent = 'blue',
}: {
  label: string;
  value: string;
  delta?: string;
  icon: string;
  accent?: keyof typeof ACCENTS;
}) {
  const a = ACCENTS[accent] ?? ACCENTS.blue;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="muted text-xs font-semibold uppercase tracking-wide">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          {delta && <p className="muted mt-1 text-xs">{delta}</p>}
        </div>
        <div className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', a.bg, a.fg)}>
          <Icon name={icon} className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="tablist" className="scrollbar-thin flex gap-1.5 overflow-x-auto pb-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cx(
            'whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors',
            active === tab.id
              ? 'bg-brand-500 text-white'
              : 'surface muted hover:bg-brand-50 dark:hover:bg-brand-500/10',
          )}
        >
          {tab.label}
          {typeof tab.count === 'number' && (
            <span className={cx('ml-1.5 text-xs', active === tab.id ? 'text-white/80' : 'opacity-60')}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Status pill for applications, shared between the citizen and admin views. */
export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { tone: Parameters<typeof Badge>[0]['tone']; label: string; icon: string }> = {
    draft: { tone: 'neutral', label: 'Draft', icon: 'FilePen' },
    submitted: { tone: 'info', label: 'Submitted', icon: 'Send' },
    'under-review': { tone: 'info', label: 'Under review', icon: 'Loader' },
    'info-needed': { tone: 'warning', label: 'Action needed', icon: 'AlertTriangle' },
    approved: { tone: 'success', label: 'Approved', icon: 'CheckCircle2' },
    rejected: { tone: 'danger', label: 'Rejected', icon: 'XCircle' },
    disbursed: { tone: 'success', label: 'Disbursed', icon: 'BadgeCheck' },
    open: { tone: 'warning', label: 'Open', icon: 'CircleDot' },
    'in-progress': { tone: 'info', label: 'In progress', icon: 'Loader' },
    resolved: { tone: 'success', label: 'Resolved', icon: 'CheckCircle2' },
  };
  const cfg = map[status] ?? { tone: 'neutral' as const, label: status, icon: 'Circle' };
  return (
    <Badge tone={cfg.tone} icon={cfg.icon}>
      {cfg.label}
    </Badge>
  );
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relativeDate(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return formatDate(iso);
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}
