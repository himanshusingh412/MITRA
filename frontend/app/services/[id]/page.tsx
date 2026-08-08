import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/shell';
import { Button, Card, Icon } from '@/components/ui';
import { allServiceIds, getService } from '@/lib/services';
import { getScheme } from '@/lib/schemes';

/**
 * Service detail page.
 *
 * These eight routes did not exist. Every "Popular Services" tile on the home screen and
 * every card on the Services page pointed here and returned Next's 404 — the most visible
 * broken behaviour left in the product.
 *
 * Rendered as a server component with `generateStaticParams`, so all eight are prerendered
 * at build time and cost no client JavaScript: the content is static reference material.
 */

export function generateStaticParams() {
  return allServiceIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const service = getService(id);
  if (!service) return { title: 'Service not found — MITRA' };
  return { title: `${service.name} — MITRA`, description: service.summary };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = getService(id);
  if (!service) notFound();

  const relatedSchemes = service.relatedSchemeIds
    .map((schemeId) => getScheme(schemeId))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <AppShell>
      <div id="main" className="mx-auto max-w-[900px] space-y-5">
        <Link href="/services" className="link-arrow">
          <Icon name="ArrowLeft" className="h-4 w-4" />
          All services
        </Link>

        <Card className="p-6">
          <div className="flex flex-wrap items-start gap-4">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: `${service.accent}18`, color: service.accent }}
            >
              <Icon name={service.icon} className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight">{service.name}</h1>
              <p className="muted mt-2 max-w-[62ch] text-sm leading-relaxed">{service.summary}</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Fee', value: service.fee, icon: 'IndianRupee' },
              { label: 'Processing time', value: service.processingTime, icon: 'Clock' },
              { label: 'Issued by', value: service.officialName, icon: 'Landmark' },
            ].map((f) => (
              <div key={f.label} className="rounded-xl bg-[var(--canvas)] p-3.5">
                <dt className="muted flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                  <Icon name={f.icon} className="h-3.5 w-3.5" />
                  {f.label}
                </dt>
                <dd className="mt-1.5 text-sm font-semibold">{f.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold">What you can do</h2>
          <ul className="stagger mt-4 space-y-3">
            {service.actions.map((a) => (
              <li key={a.title} className="flex gap-3 rounded-xl bg-[var(--canvas)] p-3.5">
                <Icon name="CircleCheck" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                <div className="min-w-0">
                  <p className="text-sm font-bold">{a.title}</p>
                  <p className="muted mt-0.5 text-[13px] leading-relaxed">{a.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-bold">What to bring</h2>
            <ul className="mt-4 space-y-2.5">
              {service.requires.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-sm">
                  <Icon name="FileText" className="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
                  <span className="leading-relaxed">{r}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold">Where to go</h2>
            <ul className="mt-4 space-y-2.5">
              {service.where.map((w) => (
                <li key={w} className="flex items-start gap-2.5 text-sm">
                  <Icon name="MapPin" className="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
                  <span className="leading-relaxed">{w}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {relatedSchemes.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-bold">Schemes that need this</h2>
            <p className="muted mt-1 text-sm">
              Keeping this document current keeps these applications moving.
            </p>
            <div className="stagger mt-4 grid gap-3 sm:grid-cols-2">
              {relatedSchemes.map((s) => (
                <Link
                  key={s.id}
                  href={`/schemes/${s.id}`}
                  className="card card-interactive flex items-center gap-3 p-4"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--canvas)] text-brand-500"
                  >
                    <Icon name={s.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{s.shortName}</span>
                    <span className="muted block truncate text-xs">{s.tagline}</span>
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-bold">Not sure where to start?</h2>
              <p className="muted mt-1 text-sm">
                Describe your situation and MITRA will tell you which step applies to you.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button href={`/assistant?q=${encodeURIComponent(`How do I apply for ${service.name}?`)}`}>
                <Icon name="Bot" className="h-4 w-4" />
                Ask MITRA
              </Button>
              <Button
                href={service.officialUrl}
                variant="secondary"
                ariaLabel={`Open the official ${service.officialName} portal in a new tab`}
              >
                Official portal
                <Icon name="ExternalLink" className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <p className="muted mt-4 flex items-start gap-2 text-xs leading-relaxed">
            <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Fees and processing times vary between states and are revised periodically.
            Confirm at a Common Service Centre before you rely on them.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
