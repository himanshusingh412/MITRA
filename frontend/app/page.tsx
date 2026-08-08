import { readSession } from '@/lib/db/session';
import { prisma } from '@/lib/db/client';
import { AuthLanding } from '@/components/AuthLanding';
import { CitizenDashboard } from '@/components/CitizenDashboard';

/**
 * Entry point.
 *
 * `/` is both the landing page and the dashboard: unauthenticated visitors get the
 * sign-in experience, everyone else goes straight to their household. Keeping one route
 * rather than redirecting to `/login` means every "Home" link in the app stays correct,
 * a signed-in citizen never sees a sign-in screen flash before the redirect fires, and
 * there is no dangling `/login` for a search engine to index.
 *
 * The decision is made on the server from the signed session cookie, so the correct
 * screen is in the very first byte of HTML — no client-side flicker, and the dashboard
 * markup is never sent to someone who is not signed in.
 */
export default async function HomePage() {
  const citizenId = await readSession();

  const citizen = citizenId
    ? await prisma.citizen.findFirst({
        where: { id: citizenId, deletedAt: null },
        select: { id: true },
      })
    : null;

  // A signed token whose sandbox has been swept up is not a session.
  if (!citizen) return <AuthLanding />;

  return <CitizenDashboard />;
}
