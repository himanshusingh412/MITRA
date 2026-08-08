import type { Metadata } from 'next';
import { readSession } from '@/lib/db/session';
import { prisma } from '@/lib/db/client';
import { LandingPage } from '@/components/LandingPage';

/**
 * The application's front door.
 *
 * `/` is always the landing page — never the dashboard, and never an automatic sign-in.
 * A visitor is introduced to the platform first and then chooses a door: the citizen
 * portal, which opens an auth dialog, or the government portal, which is a separate route
 * with a separate session.
 *
 * Session state is read on the server only to decide whether the primary call to action
 * says "Continue as Citizen" or "Go to your dashboard". A signed-in citizen is never
 * silently redirected past this page, because being bounced somewhere you did not ask to
 * go is disorienting — and it would make the platform impossible to explain to someone
 * you handed the link to.
 */

export const metadata: Metadata = {
  title: 'MITRA — One AI companion for every citizen’s government journey',
  description:
    'Discover the government schemes you qualify for, verify your documents before you apply, and track every application to the day the benefit arrives — in your own language.',
};

export default async function HomePage() {
  const citizenId = await readSession();

  const citizen = citizenId
    ? await prisma.citizen.findFirst({
        where: { id: citizenId, deletedAt: null },
        select: { id: true },
      })
    : null;

  return <LandingPage signedIn={Boolean(citizen)} />;
}
