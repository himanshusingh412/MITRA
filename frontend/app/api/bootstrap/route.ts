import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { ok } from '@/lib/db/http';
import { handleError, rateLimit } from '@/lib/db/guard';
import {
  householdOf,
  mintSession,
  readSession,
  setSessionCookie,
  touch,
} from '@/lib/db/session';
import {
  toApplication,
  toCitizenProfile,
  toNotification,
  toStoredDocument,
} from '@/lib/db/mappers';

export const dynamic = 'force-dynamic';

/**
 * Everything the app needs to render, in one round trip.
 *
 * The client hydrates from a single call rather than five, because on a rural 3G
 * connection request count costs more than payload size.
 *
 * This is also where a first-time visitor gets their sandbox: with no valid session we
 * clone the template household and issue a cookie, so the app opens straight into a
 * working demo without a sign-in wall — but every subsequent read and write is scoped
 * to that session and cannot reach anyone else's data.
 */
export async function GET(req: NextRequest) {
  try {
    // Cloning a household is the most expensive thing an anonymous caller can trigger,
    // so session creation is the tightest budget in the app.
    rateLimit(req, 'bootstrap', 30, 60_000);

    let citizenId = await readSession();
    let issued = false;

    if (!citizenId) {
      rateLimit(req, 'mint', 5, 60_000);
      citizenId = await mintSession();
      await setSessionCookie(citizenId);
      issued = true;
    }

    const memberIds = await householdOf(citizenId);

    const [user, dependents, documents, applications, notifications] = await Promise.all([
      prisma.citizen.findUnique({ where: { id: citizenId } }),
      prisma.citizen.findMany({
        where: { primaryId: citizenId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.document.findMany({
        where: { ownerId: { in: memberIds }, deletedAt: null },
        orderBy: { uploadedAt: 'desc' },
      }),
      prisma.application.findMany({
        where: { applicantId: { in: memberIds } },
        include: { applicant: { select: { name: true } }, timeline: { orderBy: { at: 'asc' } } },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.notification.findMany({
        where: { citizenId },
        orderBy: { at: 'desc' },
      }),
    ]);

    if (!user) {
      // An empty database is a deployment state, not a client error — say so plainly.
      return ok(null, { seeded: false });
    }

    void touch(citizenId);

    return ok(
      {
        user: toCitizenProfile(user),
        family: dependents.map(toCitizenProfile),
        documents: documents.map(toStoredDocument),
        applications: applications.map(toApplication),
        notifications: notifications.map(toNotification),
      },
      { seeded: true, newSession: issued },
    );
  } catch (e) {
    return handleError('bootstrap', e);
  }
}
