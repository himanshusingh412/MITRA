'use client';

import Link from 'next/link';
import type { EligibilityResult, Scheme } from '@/types';
import { ACCENTS, EligibilityBadge, Icon, cx } from './ui';

/**
 * Scheme card used across the dashboard, the scheme list and assistant replies.
 * Always shows the eligibility verdict, because a scheme the citizen cannot get is
 * worse than useless — it wastes a trip to the CSC.
 */
export function SchemeCard({
  scheme,
  result,
  compact = false,
  ctaLabel = 'Check Now',
}: {
  scheme: Scheme;
  result: EligibilityResult;
  compact?: boolean;
  ctaLabel?: string;
}) {
  const accent = ACCENTS[scheme.accent] ?? ACCENTS.blue;

  return (
    <Link
      href={`/schemes/${scheme.id}`}
      className="card card-interactive group flex h-full flex-col p-5"
    >
      <div className={cx('mb-4 flex h-12 w-12 items-center justify-center rounded-2xl', accent.bg, accent.fg)}>
        <Icon name={scheme.icon} className="h-6 w-6" />
      </div>

      <h3 className="text-[15px] font-bold leading-snug">{scheme.shortName}</h3>
      <p className="muted mt-1.5 line-clamp-2 text-[13px] leading-relaxed">{scheme.tagline}</p>

      {!compact && (
        <p className="mt-3 text-sm font-bold text-brand-600 dark:text-brand-300">{scheme.benefitHeadline}</p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        <EligibilityBadge level={result.level} />
        <span className="link-arrow">
          {ctaLabel}
          <Icon name="ArrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/** Horizontal variant used in list views where vertical space is tight. */
export function SchemeRow({ scheme, result }: { scheme: Scheme; result: EligibilityResult }) {
  const accent = ACCENTS[scheme.accent] ?? ACCENTS.blue;

  return (
    <Link
      href={`/schemes/${scheme.id}`}
      className="card card-interactive group flex items-start gap-4 p-4 sm:items-center"
    >
      <div className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', accent.bg, accent.fg)}>
        <Icon name={scheme.icon} className="h-6 w-6" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-bold">{scheme.shortName}</h3>
          <EligibilityBadge level={result.level} />
        </div>
        <p className="muted mt-1 line-clamp-1 text-[13px]">{scheme.tagline}</p>
        <p className="mt-1.5 text-sm font-semibold text-brand-600 dark:text-brand-300">
          {scheme.benefitHeadline}
        </p>
      </div>

      <Icon
        name="ChevronRight"
        className="mt-1 h-5 w-5 shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5 sm:mt-0"
      />
    </Link>
  );
}
