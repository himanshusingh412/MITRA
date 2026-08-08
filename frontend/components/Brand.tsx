import { cx } from './ui';

/**
 * MITRA brand identity.
 *
 * The mark is two figures — one navy, one gold — standing together in a light disc. Two
 * people, not one: MITRA means *friend*, and the product is about a citizen and the state
 * meeting rather than a citizen submitting. That reading is why the figures overlap
 * slightly and share a baseline instead of standing apart.
 *
 * Drawn as SVG rather than shipped as a raster. A government service is read at 16px in a
 * browser tab and at 400px on a projector at a hackathon final; vector is the only way both
 * are crisp, and it is a few hundred bytes inlined rather than a network request in the
 * critical path.
 *
 * Five variants exist so the mark is never distorted to fit a context it was not drawn for:
 *   full   — mark + wordmark + descriptor, for headers and letterheads
 *   icon   — mark only, for favicons, avatars and tight navigation
 *   white  — reversed, for navy and photographic backgrounds
 *   mono   — single colour, for print, watermarks and faxed documents
 * Clear space is baked into the viewBox, so callers control size only. There is no prop
 * that stretches the mark, because the way logos get distorted is by making it possible.
 */

export const BRAND = {
  navy: '#252A5E',
  navyDeep: '#1A1E45',
  gold: '#E0A63C',
  goldSoft: '#F0C97A',
  disc: '#ECEEF8',
  descriptor: '#8A93A8',
} as const;

type MarkProps = {
  className?: string;
  /** Reversed for dark or photographic backgrounds. */
  variant?: 'colour' | 'white' | 'mono';
  /** Draw the surrounding disc. Off when the mark sits on its own coloured chip. */
  disc?: boolean;
  title?: string;
};

/**
 * The mark alone.
 *
 * `role="img"` with a title when it stands for the brand; purely decorative instances pass
 * `title=""` and become aria-hidden, so a screen reader is not told "MITRA" three times on
 * one screen.
 */
export function MitraMark({
  className = 'h-10 w-10',
  variant = 'colour',
  disc = true,
  title = 'MITRA',
}: MarkProps) {
  const navy = variant === 'white' ? '#FFFFFF' : variant === 'mono' ? 'currentColor' : BRAND.navy;
  const gold =
    variant === 'white'
      ? 'rgba(255,255,255,0.62)'
      : variant === 'mono'
        ? 'currentColor'
        : BRAND.gold;
  const discFill =
    variant === 'white' ? 'rgba(255,255,255,0.14)' : variant === 'mono' ? 'transparent' : BRAND.disc;

  const labelled = title.length > 0;

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : 'true'}
      focusable="false"
    >
      {disc && <circle cx="32" cy="32" r="32" fill={discFill} />}

      {/* Gold figure, set behind and to the right. */}
      <g fill={gold} opacity={variant === 'mono' ? 0.45 : 1}>
        <circle cx="40.5" cy="24" r="7.2" />
        <path d="M40.5 33.4c7.1 0 12.9 5.2 12.9 11.7v3.5a1.8 1.8 0 0 1-1.8 1.8H29.4a1.8 1.8 0 0 1-1.8-1.8v-3.5c0-6.5 5.8-11.7 12.9-11.7Z" />
      </g>

      {/* Navy figure, in front and to the left — the citizen the product serves. */}
      <g fill={navy}>
        <circle cx="24" cy="26.5" r="8" />
        <path d="M24 36.8c7.8 0 14.2 5.7 14.2 12.8v2.6a1.9 1.9 0 0 1-1.9 1.9H11.7a1.9 1.9 0 0 1-1.9-1.9v-2.6c0-7.1 6.4-12.8 14.2-12.8Z" />
      </g>
    </svg>
  );
}

/**
 * Mark, wordmark and descriptor locked up together.
 *
 * The wordmark splits MI / TRA across navy and gold — the same two-tone logic as the
 * figures, so the identity reads as one idea rather than a picture beside some letters.
 */
export function MitraLogo({
  className = 'h-10',
  variant = 'colour',
  showDescriptor = true,
}: {
  className?: string;
  variant?: 'colour' | 'white' | 'mono';
  showDescriptor?: boolean;
}) {
  const navy = variant === 'white' ? '#FFFFFF' : variant === 'mono' ? 'currentColor' : BRAND.navy;
  const gold =
    variant === 'white'
      ? 'rgba(255,255,255,0.75)'
      : variant === 'mono'
        ? 'currentColor'
        : BRAND.gold;
  const descriptor =
    variant === 'white'
      ? 'rgba(255,255,255,0.62)'
      : variant === 'mono'
        ? 'currentColor'
        : BRAND.descriptor;

  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <MitraMark className="h-full w-auto shrink-0 aspect-square" variant={variant} title="" />
      <span className="flex flex-col justify-center leading-none">
        <span
          className="text-[1.35em] font-extrabold tracking-[-0.02em]"
          style={{ color: navy }}
        >
          MI<span style={{ color: gold }}>TRA</span>
        </span>
        {showDescriptor && (
          <span
            className="mt-[0.28em] text-[0.44em] font-semibold uppercase tracking-[0.14em]"
            style={{ color: descriptor }}
          >
            Digital Citizen Assistant
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * The mark as a standalone SVG string.
 *
 * Used by the printable verification report, which is generated as a self-contained
 * document and cannot import a React component. Keeping one source for the geometry means
 * the printed report and the screen can never drift apart.
 */
export function markSvgString(size = 40): string {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="MITRA">
  <circle cx="32" cy="32" r="32" fill="${BRAND.disc}"/>
  <g fill="${BRAND.gold}">
    <circle cx="40.5" cy="24" r="7.2"/>
    <path d="M40.5 33.4c7.1 0 12.9 5.2 12.9 11.7v3.5a1.8 1.8 0 0 1-1.8 1.8H29.4a1.8 1.8 0 0 1-1.8-1.8v-3.5c0-6.5 5.8-11.7 12.9-11.7Z"/>
  </g>
  <g fill="${BRAND.navy}">
    <circle cx="24" cy="26.5" r="8"/>
    <path d="M24 36.8c7.8 0 14.2 5.7 14.2 12.8v2.6a1.9 1.9 0 0 1-1.9 1.9H11.7a1.9 1.9 0 0 1-1.9-1.9v-2.6c0-7.1 6.4-12.8 14.2-12.8Z"/>
  </g>
</svg>`;
}
