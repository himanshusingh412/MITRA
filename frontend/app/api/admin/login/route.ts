import { NextRequest } from 'next/server';
import { ok } from '@/lib/db/http';
import { handleError, sameOrigin } from '@/lib/db/guard';
import { HttpError } from '@/lib/db/session';
import { clearAdminSession, issueAdminSession, verifyPassword } from '@/lib/db/admin';

export const dynamic = 'force-dynamic';

/**
 * Officer sign-in.
 *
 * Three properties matter here and each is deliberate:
 *
 *  1. The credential is compared server-side against a scrypt hash. Nothing about it is
 *     reachable from the browser bundle.
 *  2. The failure message and the failure timing are identical for an unknown officer id
 *     and a wrong password. Revealing which one was wrong lets an attacker enumerate
 *     valid government user ids.
 *  3. The lockout is counted here, not in React state, because a counter the client owns
 *     is a counter the client can reset with F5.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60_000;

type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();

function clientKey(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function checkLockout(key: string): number {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now > a.resetAt) return 0;
  return a.count;
}

function recordFailure(key: string): void {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now > a.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  a.count += 1;
}

export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const key = clientKey(req);

    if (checkLockout(key) >= MAX_ATTEMPTS) {
      throw new HttpError(
        'LOCKED',
        'Too many sign-in attempts. Try again in 15 minutes.',
        429,
      );
    }

    const { officerId, password } = ((await req.json().catch(() => ({}))) ?? {}) as {
      officerId?: unknown;
      password?: unknown;
    };

    if (typeof officerId !== 'string' || typeof password !== 'string') {
      throw new HttpError('VALIDATION_ERROR', 'Officer ID and password are required.', 422);
    }
    if (officerId.length > 120 || password.length > 200) {
      throw new HttpError('VALIDATION_ERROR', 'Officer ID and password are required.', 422);
    }

    const expectedId = (process.env.ADMIN_OFFICER_ID ?? 'officer').trim().toLowerCase();
    const idMatches = officerId.trim().toLowerCase() === expectedId;

    // Always run the hash comparison, even when the id is wrong. Short-circuiting here
    // would make a wrong id measurably faster than a wrong password.
    const passwordMatches = await verifyPassword(password);

    if (!idMatches || !passwordMatches) {
      recordFailure(key);
      const remaining = Math.max(0, MAX_ATTEMPTS - checkLockout(key));
      throw new HttpError(
        'INVALID_CREDENTIALS',
        remaining > 0
          ? 'Those sign-in details were not recognised.'
          : 'Too many sign-in attempts. Try again in 15 minutes.',
        401,
      );
    }

    attempts.delete(key);

    await issueAdminSession({
      officerId: expectedId,
      name: 'Priya Sharma',
      role: 'District Welfare Officer',
      district: 'Muzaffarpur',
    });

    return ok({ name: 'Priya Sharma', role: 'District Welfare Officer', district: 'Muzaffarpur' });
  } catch (e) {
    return handleError('admin:login', e);
  }
}

/** Sign out. */
export async function DELETE(req: NextRequest) {
  try {
    sameOrigin(req);
    await clearAdminSession();
    return ok({ signedOut: true });
  } catch (e) {
    return handleError('admin:logout', e);
  }
}
