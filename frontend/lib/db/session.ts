import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './client';

/**
 * Citizen sessions.
 *
 * MITRA is a public prototype with no identity provider yet, but "no sign-in" must not
 * mean "no boundary". Every visitor is issued a signed, httpOnly session bound to a
 * household cloned just for them, so there is no record two visitors can both reach.
 * An authorisation slip therefore exposes a citizen's own sandbox, never someone else's
 * welfare data. When Google OAuth lands in Phase 5, only `mintSession` changes: the
 * subject stops being a cloned sandbox and becomes the authenticated citizen.
 *
 * The session id is the citizen id. It is read from a signed cookie and never from a
 * request body or query string — a client-supplied identity is not an identity.
 */

const COOKIE = 'mitra_session';
/** Anonymous demo sandbox. Short — nothing in it is worth keeping. */
const TTL_HOURS = 12;
/** "Remember me" on a real account. Long enough to survive a fortnight between visits. */
const REMEMBER_DAYS = 30;

function secret(): Uint8Array {
  const s = process.env.JWT_CITIZEN_SECRET;
  // Failing closed is the point: a missing signing key must stop the app, not silently
  // downgrade every session to unauthenticated.
  if (!s || s.length < 32) {
    throw new Error('JWT_CITIZEN_SECRET is missing or shorter than 32 characters.');
  }
  return new TextEncoder().encode(s);
}

export class HttpError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function sign(citizenId: string, remember: boolean): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(citizenId)
    .setIssuedAt()
    .setIssuer('mitra')
    .setAudience('mitra-citizen')
    .setExpirationTime(remember ? `${REMEMBER_DAYS}d` : `${TTL_HOURS}h`)
    .sign(secret());
}

/** Returns the citizen id from a valid session cookie, or null. Never throws on a bad token. */
export async function readSession(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: 'mitra',
      audience: 'mitra-citizen',
    });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    // Expired or tampered. Treat exactly like no session at all.
    return null;
  }
}

/** Requires a session. Used by every route that reads or writes citizen data. */
export async function requireCitizen(): Promise<string> {
  const id = await readSession();
  if (!id) throw new HttpError('UNAUTHENTICATED', 'Your session has expired.', 401);

  const exists = await prisma.citizen.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  // A signed token for a deleted sandbox is not a valid session.
  if (!exists) throw new HttpError('UNAUTHENTICATED', 'Your session has expired.', 401);

  return id;
}

/**
 * Confirms a row belongs to the session before it is read or written.
 *
 * Sandbox isolation already prevents cross-visitor access, but defence in depth matters
 * here: when real accounts arrive, this is the check that stops one citizen advancing
 * another citizen's application by guessing an id.
 */
export async function assertOwned(
  kind: 'application' | 'document',
  id: string,
  citizenId: string,
): Promise<void> {
  const householdIds = await householdOf(citizenId);

  const owned =
    kind === 'application'
      ? await prisma.application.findFirst({
          where: { id, applicantId: { in: householdIds } },
          select: { id: true },
        })
      : await prisma.document.findFirst({
          where: { id, ownerId: { in: householdIds }, deletedAt: null },
          select: { id: true },
        });

  // Deliberately 404, not 403: confirming a row exists but is someone else's is itself
  // a disclosure.
  if (!owned) throw new HttpError('NOT_FOUND', 'That record does not exist.', 404);
}

/** Every citizen id in the session's household — the head plus their dependents. */
export async function householdOf(citizenId: string): Promise<string[]> {
  const members = await prisma.citizen.findMany({
    where: { OR: [{ id: citizenId }, { primaryId: citizenId }], deletedAt: null },
    select: { id: true },
  });
  return members.map((m) => m.id);
}

/**
 * Clones the template household into a fresh sandbox and returns the new head's id.
 *
 * Copied in one transaction: a half-built household would show a citizen a family with
 * missing members and an incoherent document-verification report.
 */
export async function mintSession(identity?: {
  email: string;
  passwordHash: string;
  name?: string;
}): Promise<string> {
  const template = await prisma.citizen.findFirst({
    where: { isTemplate: true, primaryId: null },
    include: { dependents: true },
  });
  if (!template) {
    throw new HttpError('NOT_SEEDED', 'The demo household has not been seeded.', 503);
  }

  const sandbox = crypto.randomUUID().slice(0, 8);
  const newId = (originalId: string) => `${sandbox}_${originalId}`;
  const members = [template, ...template.dependents];
  const memberIds = members.map((m) => m.id);

  const [documents, applications, notifications] = await Promise.all([
    prisma.document.findMany({ where: { ownerId: { in: memberIds }, deletedAt: null } }),
    prisma.application.findMany({
      where: { applicantId: { in: memberIds } },
      include: { timeline: { orderBy: { at: 'asc' } } },
    }),
    prisma.notification.findMany({ where: { citizenId: template.id } }),
  ]);

  const citizenRow = (m: (typeof members)[number]) => ({
    id: newId(m.id),
    name: m.name,
    age: m.age,
    gender: m.gender,
    state: m.state,
    district: m.district,
    area: m.area,
    occupation: m.occupation,
    annualIncome: m.annualIncome,
    category: m.category,
    familySize: m.familySize,
    hasDisability: m.hasDisability,
    disabilityPercent: m.disabilityPercent,
    landHoldingHectares: m.landHoldingHectares,
    existingBenefits: m.existingBenefits,
    lifeEvents: m.lifeEvents,
    relation: m.relation,
    avatarColor: m.avatarColor,
    locale: m.locale,
    isTemplate: false,
    primaryId: m.id === template.id ? null : newId(template.id),
    // Credentials live on the head of the household only. A dependent is a person in
    // the record, not an account, so giving them a login would be a privilege bug.
    ...(identity && m.id === template.id
      ? {
          email: identity.email,
          passwordHash: identity.passwordHash,
          name: identity.name?.trim() || m.name,
          isAnonymous: false,
        }
      : {}),
  });

  // Batched rather than looped. A per-row round trip to a remote Postgres blows past
  // the transaction deadline before the household is finished, and a sandbox that is
  // half-created is worse than one that failed outright.
  await prisma.$transaction(
    async (tx) => {
      // The head must land before its dependents can reference it.
      await tx.citizen.create({ data: citizenRow(template) });
      const dependents = members.filter((m) => m.id !== template.id);
      if (dependents.length) {
        await tx.citizen.createMany({ data: dependents.map(citizenRow) });
      }

      if (documents.length) {
        await tx.document.createMany({
          data: documents.map((d) => ({
            id: newId(d.id),
            ownerId: newId(d.ownerId),
            name: d.name,
            type: d.type,
            source: d.source,
            extracted: d.extracted ?? undefined,
            verified: d.verified,
            uploadedAt: d.uploadedAt,
            expiresAt: d.expiresAt,
          })),
        });
      }

      if (applications.length) {
        await tx.application.createMany({
          data: applications.map((a) => ({
            id: newId(a.id),
            referenceNo: a.referenceNo,
            schemeId: a.schemeId,
            applicantId: newId(a.applicantId),
            status: a.status,
            progressStep: a.progressStep,
            totalSteps: a.totalSteps,
            district: a.district,
            submittedAt: a.submittedAt,
          })),
        });

        const events = applications.flatMap((a) =>
          a.timeline.map((e) => ({
            applicationId: newId(a.id),
            status: e.status,
            note: e.note,
            at: e.at,
          })),
        );
        if (events.length) await tx.applicationEvent.createMany({ data: events });
      }

      if (notifications.length) {
        await tx.notification.createMany({
          data: notifications.map((n) => ({
            id: newId(n.id),
            citizenId: newId(template.id),
            kind: n.kind,
            title: n.title,
            body: n.body,
            href: n.href,
            read: n.read,
            at: n.at,
          })),
        });
      }
    },
    // Generous because the first visitor after a Neon autosuspend pays a cold start.
    { timeout: 20_000, maxWait: 10_000 },
  );

  return newId(template.id);
}

/**
 * Issues the session cookie. httpOnly + sameSite=strict is the CSRF defence.
 *
 * The cookie lifetime and the token expiry are set from the same flag, so "remember me"
 * cannot leave a long-lived cookie carrying a token that has already expired — which
 * would log the citizen out with no explanation.
 */
export async function setSessionCookie(citizenId: string, remember = false): Promise<void> {
  (await cookies()).set(COOKIE, await sign(citizenId, remember), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: remember ? REMEMBER_DAYS * 86_400 : TTL_HOURS * 3600,
  });
}

/** Ends the session. */
export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Records activity so abandoned sandboxes can be swept up later. */
export async function touch(citizenId: string): Promise<void> {
  await prisma.citizen
    .update({ where: { id: citizenId }, data: { lastSeenAt: new Date() } })
    .catch(() => {
      /* housekeeping only — never fail a request because a timestamp did not update */
    });
}
