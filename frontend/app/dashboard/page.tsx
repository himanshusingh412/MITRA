import { redirect } from 'next/navigation';
import { readSession } from '@/lib/db/session';
import { prisma } from '@/lib/db/client';
import { CitizenDashboard } from '@/components/CitizenDashboard';

/**
 * Citizen dashboard.
 *
 * Guarded on the server. An unauthenticated visitor is sent back to the landing page
 * rather than shown a sign-in form here — there is exactly one front door, and routing
 * everyone through it is what makes "never bypass the landing page" true in practice
 * rather than merely intended.
 */
export default async function DashboardPage() {
  const citizenId = await readSession();
  if (!citizenId) redirect('/');

  const citizen = await prisma.citizen.findFirst({
    where: { id: citizenId, deletedAt: null },
    select: { id: true },
  });

  if (!citizen) redirect('/');

  return <CitizenDashboard />;
}
