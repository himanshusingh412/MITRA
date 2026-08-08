import Link from 'next/link';
import { Button, Icon } from '@/components/ui';

/**
 * 404.
 *
 * Without this file Next serves its default black-on-white "404 | This page could not be
 * found" — an unstyled page that reads as a broken deployment rather than a wrong address.
 *
 * A citizen who lands here is usually following a stale link from a CSC operator or a
 * forwarded message, so the page does the useful thing and offers the four destinations
 * they were most likely aiming for instead of only apologising.
 */
export default function NotFound() {
  const destinations = [
    { href: '/schemes', icon: 'LayoutList', label: 'Find schemes', hint: 'See what you qualify for' },
    { href: '/applications', icon: 'ClipboardList', label: 'My applications', hint: 'Track what you have started' },
    { href: '/documents', icon: 'FileText', label: 'My documents', hint: 'Check your document vault' },
    { href: '/assistant', icon: 'Bot', label: 'Ask MITRA', hint: 'Describe your situation' },
  ];

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-[680px] flex-col items-center justify-center px-5 py-16 text-center"
    >
      <div className="route-enter">
        <span
          aria-hidden="true"
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-500 dark:bg-brand-500/15"
        >
          <Icon name="Compass" className="h-8 w-8" />
        </span>

        <p className="muted text-sm font-semibold uppercase tracking-wide">Page not found</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          This page has moved or never existed
        </h1>
        <p className="muted mx-auto mt-3 max-w-[46ch] text-sm leading-relaxed">
          Nothing is wrong with your account and no application has been lost. The address
          you followed does not match a page in MITRA.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button href="/" size="lg">
            <Icon name="House" className="h-4 w-4" />
            Go to home
          </Button>
          <Button href="/help" variant="secondary" size="lg">
            <Icon name="LifeBuoy" className="h-4 w-4" />
            Get help
          </Button>
        </div>
      </div>

      <div className="stagger mt-10 grid w-full gap-3 sm:grid-cols-2">
        {destinations.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="card card-interactive flex items-center gap-3 p-4 text-left"
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--canvas)] text-brand-500"
            >
              <Icon name={d.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold">{d.label}</span>
              <span className="muted block text-xs">{d.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
