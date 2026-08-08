import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { ok } from '@/lib/db/http';
import { handleError, rateLimit, sameOrigin } from '@/lib/db/guard';
import { HttpError, requireCitizen } from '@/lib/db/session';
import { toNotification } from '@/lib/db/mappers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    rateLimit(req, 'notifications', 60, 60_000);
    const citizenId = await requireCitizen();

    const rows = await prisma.notification.findMany({
      where: { citizenId },
      orderBy: { at: 'desc' },
    });
    return ok(rows.map(toNotification), { unread: rows.filter((n) => !n.read).length });
  } catch (e) {
    return handleError('notifications:list', e);
  }
}

/** Marks notifications read — a specific one with { id }, or all of them without. */
export async function PATCH(req: NextRequest) {
  try {
    sameOrigin(req);
    rateLimit(req, 'notifications:update', 60, 60_000);
    const citizenId = await requireCitizen();

    const { id } = ((await req.json().catch(() => ({}))) ?? {}) as { id?: unknown };
    if (id !== undefined && (typeof id !== 'string' || id.length > 120)) {
      throw new HttpError('VALIDATION_ERROR', 'That notification id is not valid.', 422);
    }

    // Scoped by citizenId, so an id belonging to another session matches nothing.
    await prisma.notification.updateMany({
      where: { citizenId, ...(id ? { id } : { read: false }) },
      data: { read: true },
    });

    const rows = await prisma.notification.findMany({
      where: { citizenId },
      orderBy: { at: 'desc' },
    });
    return ok(rows.map(toNotification), { unread: rows.filter((n) => !n.read).length });
  } catch (e) {
    return handleError('notifications:update', e);
  }
}
