import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { ok } from '@/lib/db/http';
import { handleError, rateLimit, sameOrigin } from '@/lib/db/guard';
import { HttpError, assertOwned, requireCitizen } from '@/lib/db/session';
import { statusToDb, toApplication } from '@/lib/db/mappers';
import type { ApplicationStatus } from '@/types';

export const dynamic = 'force-dynamic';

const INCLUDE = {
  applicant: { select: { name: true } },
  timeline: { orderBy: { at: 'asc' } },
} as const;

const STATUSES: ApplicationStatus[] = [
  'draft', 'submitted', 'under-review', 'info-needed', 'approved', 'rejected', 'disbursed',
];

/**
 * Advances an application one step, or sets an explicit status.
 *
 * Every transition appends a timeline event in the same transaction as the status
 * change — an application whose status moved without a recorded reason is exactly the
 * opacity MITRA exists to remove.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(req);
    rateLimit(req, 'applications:update', 60, 60_000);
    const citizenId = await requireCitizen();

    const { id } = await ctx.params;
    // Ownership before existence: this both authorises the write and answers 404 for
    // rows belonging to anyone else.
    await assertOwned('application', id, citizenId);

    const body = ((await req.json().catch(() => ({}))) ?? {}) as {
      action?: 'advance';
      status?: ApplicationStatus;
      note?: string;
    };

    if (body.status !== undefined && !STATUSES.includes(body.status)) {
      throw new HttpError('VALIDATION_ERROR', 'That status is not valid.', 422);
    }
    if (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 500)) {
      throw new HttpError('VALIDATION_ERROR', 'The note is too long.', 422);
    }

    const current = await prisma.application.findUniqueOrThrow({ where: { id } });

    const nextStep =
      body.action === 'advance'
        ? Math.min(current.progressStep + 1, current.totalSteps)
        : current.progressStep;

    if (body.action === 'advance' && nextStep === current.progressStep) {
      throw new HttpError('CONFLICT', 'This application is already at its final step.', 409);
    }

    const nextStatus = body.status ? statusToDb(body.status) : current.status;
    const note =
      body.note ??
      (body.action === 'advance'
        ? `Progressed to step ${nextStep} of ${current.totalSteps}.`
        : 'Status updated.');

    const updated = await prisma.application.update({
      where: { id },
      data: {
        progressStep: nextStep,
        status: nextStatus,
        timeline: { create: [{ status: nextStatus, note }] },
      },
      include: INCLUDE,
    });

    return ok(toApplication(updated));
  } catch (e) {
    return handleError('applications:update', e);
  }
}
