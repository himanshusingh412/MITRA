import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { ok } from '@/lib/db/http';
import { handleError, rateLimit, sameOrigin } from '@/lib/db/guard';
import { HttpError, householdOf, requireCitizen } from '@/lib/db/session';
import { toStoredDocument } from '@/lib/db/mappers';
import type { StoredDocument } from '@/types';

export const dynamic = 'force-dynamic';

const SOURCES = ['upload', 'digilocker', 'csc'] as const;
/** OCR writes only these keys. Anything else is discarded rather than stored blindly. */
const EXTRACTED_KEYS = ['name', 'dob', 'address', 'gender', 'idNumber', 'fatherName'] as const;
const MAX_BATCH = 25;

export async function GET(req: NextRequest) {
  try {
    rateLimit(req, 'documents', 60, 60_000);
    const citizenId = await requireCitizen();
    const memberIds = await householdOf(citizenId);

    const rows = await prisma.document.findMany({
      where: { ownerId: { in: memberIds }, deletedAt: null },
      orderBy: { uploadedAt: 'desc' },
    });
    return ok(rows.map(toStoredDocument), { total: rows.length });
  } catch (e) {
    return handleError('documents:list', e);
  }
}

/** Validates one incoming document and returns only the fields we are willing to store. */
function clean(doc: unknown, memberIds: string[], fallbackOwner: string) {
  if (!doc || typeof doc !== 'object') {
    throw new HttpError('VALIDATION_ERROR', 'Each document must be an object.', 422);
  }
  const d = doc as Partial<StoredDocument>;

  if (typeof d.name !== 'string' || !d.name.trim() || d.name.length > 120) {
    throw new HttpError('VALIDATION_ERROR', 'Each document needs a name.', 422);
  }
  if (typeof d.type !== 'string' || !d.type.trim() || d.type.length > 60) {
    throw new HttpError('VALIDATION_ERROR', 'Each document needs a type.', 422);
  }

  const ownerId = d.ownerId ?? fallbackOwner;
  // A document may only be filed against a member of the caller's own household.
  if (!memberIds.includes(ownerId)) {
    throw new HttpError('NOT_FOUND', 'That document owner does not exist.', 404);
  }

  const source = SOURCES.includes(d.source as never) ? d.source! : 'upload';

  // Copy known keys only, capped in length. Storing an arbitrary client-supplied object
  // is how a JSON column becomes an unbounded write primitive.
  let extracted: Record<string, string> | undefined;
  if (d.extracted && typeof d.extracted === 'object') {
    extracted = {};
    for (const key of EXTRACTED_KEYS) {
      const value = (d.extracted as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.length <= 240) extracted[key] = value;
    }
  }

  const when = (v: unknown): Date | null => {
    if (typeof v !== 'string') return null;
    const parsed = new Date(v);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  return {
    id: typeof d.id === 'string' && d.id.length <= 120 ? d.id : `d-${crypto.randomUUID()}`,
    ownerId,
    name: d.name.trim(),
    type: d.type.trim(),
    source: source as never,
    extracted,
    verified: d.verified === true,
    uploadedAt: when(d.uploadedAt) ?? new Date(),
    expiresAt: when(d.expiresAt),
  };
}

/**
 * Adds documents to the vault. Accepts a batch because DigiLocker import brings back
 * several at once, and a partial import would leave the verification report misleading —
 * so the whole batch is written in one transaction or none of it is.
 */
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    rateLimit(req, 'documents:create', 20, 60_000);
    const citizenId = await requireCitizen();
    const memberIds = await householdOf(citizenId);

    const body = (await req.json().catch(() => null)) as
      | { documents?: unknown[] }
      | unknown
      | null;

    const incoming = Array.isArray((body as { documents?: unknown[] })?.documents)
      ? (body as { documents: unknown[] }).documents
      : [body];

    if (incoming.length === 0) {
      throw new HttpError('VALIDATION_ERROR', 'No documents were supplied.', 422);
    }
    if (incoming.length > MAX_BATCH) {
      throw new HttpError('VALIDATION_ERROR', `At most ${MAX_BATCH} documents at a time.`, 422);
    }

    const cleaned = incoming.map((d) => clean(d, memberIds, citizenId));

    const saved = await prisma.$transaction(
      cleaned.map(({ id, ...data }) =>
        prisma.document.upsert({
          where: { id },
          create: { id, ...data, deletedAt: null },
          update: { ...data, deletedAt: null },
        }),
      ),
    );

    return ok(saved.map(toStoredDocument), { added: saved.length });
  } catch (e) {
    return handleError('documents:create', e);
  }
}
