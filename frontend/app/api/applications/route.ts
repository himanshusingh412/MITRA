import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { ok } from '@/lib/db/http';
import { handleError, rateLimit, sameOrigin } from '@/lib/db/guard';
import { HttpError, householdOf, requireCitizen } from '@/lib/db/session';
import { toApplication } from '@/lib/db/mappers';
import { getScheme } from '@/lib/schemes';

export const dynamic = 'force-dynamic';

const INCLUDE = {
  applicant: { select: { name: true } },
  timeline: { orderBy: { at: 'asc' } },
} as const;

export async function GET(req: NextRequest) {
  try {
    rateLimit(req, 'applications', 60, 60_000);
    const citizenId = await requireCitizen();
    const memberIds = await householdOf(citizenId);

    const rows = await prisma.application.findMany({
      where: { applicantId: { in: memberIds } },
      include: INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
    return ok(rows.map(toApplication), { total: rows.length });
  } catch (e) {
    return handleError('applications:list', e);
  }
}

/** Creates a draft application for a household member against a scheme. */
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    rateLimit(req, 'applications:create', 20, 60_000);
    const citizenId = await requireCitizen();

    const { schemeId, applicantId } = ((await req.json().catch(() => ({}))) ?? {}) as {
      schemeId?: string;
      applicantId?: string;
    };

    if (typeof schemeId !== 'string' || typeof applicantId !== 'string') {
      throw new HttpError('VALIDATION_ERROR', 'schemeId and applicantId are required.', 422);
    }

    // The scheme must exist in the catalogue, or the application references nothing.
    if (!getScheme(schemeId)) {
      throw new HttpError('VALIDATION_ERROR', 'That scheme does not exist.', 422);
    }

    // The applicant must be in the caller's own household. Without this check a valid
    // session could open applications in a stranger's name.
    const memberIds = await householdOf(citizenId);
    if (!memberIds.includes(applicantId)) {
      throw new HttpError('NOT_FOUND', 'That applicant does not exist.', 404);
    }

    const applicant = await prisma.citizen.findUniqueOrThrow({ where: { id: applicantId } });

    // Sequential per scheme within the household, so a citizen reading one aloud at a
    // CSC counter can be found without the full id.
    const existing = await prisma.application.count({
      where: { schemeId, applicantId: { in: memberIds } },
    });
    const id = `a-${crypto.randomUUID().slice(0, 12)}`;
    const referenceNo = `DRAFT-${schemeId.toUpperCase().slice(0, 6)}-${String(existing + 1).padStart(4, '0')}`;

    const created = await prisma.application.create({
      data: {
        id,
        referenceNo,
        schemeId,
        applicantId,
        status: 'draft',
        progressStep: 1,
        totalSteps: 5,
        district: applicant.district,
        timeline: { create: [{ status: 'draft', note: 'Draft created through MITRA.' }] },
      },
      include: INCLUDE,
    });

    return ok(toApplication(created));
  } catch (e) {
    return handleError('applications:create', e);
  }
}
