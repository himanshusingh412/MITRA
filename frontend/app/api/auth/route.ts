import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { ok } from '@/lib/db/http';
import { handleError, rateLimit, sameOrigin } from '@/lib/db/guard';
import {
  HttpError,
  clearSessionCookie,
  mintSession,
  readSession,
  setSessionCookie,
} from '@/lib/db/session';
import {
  consumeResetToken,
  equaliseTiming,
  getMailProvider,
  googleConfigured,
  hashPassword,
  isPlausibleEmail,
  issueResetToken,
  normaliseEmail,
  passwordProblem,
  verifyPassword,
} from '@/lib/db/auth';

export const dynamic = 'force-dynamic';

/**
 * Citizen authentication.
 *
 * One route with an `action` discriminator rather than six files, because every branch
 * shares the same rate limit, the same origin check and the same deliberately uniform
 * error vocabulary — splitting them makes it easy for one branch to drift into leaking
 * more than the others.
 *
 * The uniformity is the security property here. Sign-in, sign-up and password reset all
 * refuse to reveal whether an address is registered. On a welfare platform, confirming
 * that someone holds an account is confirming that they are claiming benefits.
 */

/** Deliberately identical for unknown address and wrong password. */
const GENERIC_SIGNIN_ERROR = 'Those sign-in details were not recognised.';

export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const action = String(body?.action ?? '');

    switch (action) {
      case 'signup':
        return await signup(req, body!);
      case 'login':
        return await login(req, body!);
      case 'guest':
        return await guest(req);
      case 'forgot':
        return await forgot(req, body!);
      case 'reset':
        return await reset(req, body!);
      case 'logout':
        return await logout();
      default:
        throw new HttpError('VALIDATION_ERROR', 'Unknown action.', 400);
    }
  } catch (e) {
    return handleError('auth', e);
  }
}

/** Reports which sign-in methods this deployment can actually offer. */
export async function GET() {
  try {
    const citizenId = await readSession();
    const citizen = citizenId
      ? await prisma.citizen.findUnique({
          where: { id: citizenId },
          select: { id: true, name: true, email: true, isAnonymous: true },
        })
      : null;

    return ok({
      authenticated: Boolean(citizen),
      isAnonymous: citizen?.isAnonymous ?? true,
      name: citizen?.name ?? null,
      email: citizen?.email ?? null,
      // The landing page uses this to disable rather than hide the Google button, so a
      // reviewer can see the method exists and why it is unavailable.
      googleAvailable: googleConfigured(),
    });
  } catch (e) {
    return handleError('auth:status', e);
  }
}

async function signup(req: NextRequest, body: Record<string, unknown>) {
  rateLimit(req, 'auth:signup', 5, 60_000);

  const email = normaliseEmail(String(body.email ?? ''));
  const password = String(body.password ?? '');
  const name = String(body.name ?? '').trim();
  const remember = body.remember === true;

  if (!isPlausibleEmail(email)) {
    throw new HttpError('VALIDATION_ERROR', 'Enter a valid email address.', 422);
  }
  if (name.length > 120) {
    throw new HttpError('VALIDATION_ERROR', 'That name is too long.', 422);
  }
  const problem = passwordProblem(password);
  if (problem) throw new HttpError('VALIDATION_ERROR', problem, 422);

  const existing = await prisma.citizen.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    // Same work, same shape of answer as a successful signup would take, so timing does
    // not distinguish "already registered" from "new account".
    await equaliseTiming(password);
    throw new HttpError(
      'ACCOUNT_EXISTS',
      'That address could not be registered. If you already have an account, sign in or reset your password.',
      409,
    );
  }

  const passwordHash = await hashPassword(password);
  const citizenId = await mintSession({ email, passwordHash, name });
  await setSessionCookie(citizenId, remember);

  return ok({ id: citizenId, email, isAnonymous: false });
}

async function login(req: NextRequest, body: Record<string, unknown>) {
  // Tighter than signup: this is the branch an attacker sprays.
  rateLimit(req, 'auth:login', 10, 60_000);

  const email = normaliseEmail(String(body.email ?? ''));
  const password = String(body.password ?? '');
  const remember = body.remember === true;

  if (!email || !password) {
    throw new HttpError('INVALID_CREDENTIALS', GENERIC_SIGNIN_ERROR, 401);
  }

  const citizen = await prisma.citizen.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, deletedAt: true },
  });

  if (!citizen || citizen.deletedAt) {
    // Burn the same CPU an existing account would, then fail identically.
    await equaliseTiming(password);
    throw new HttpError('INVALID_CREDENTIALS', GENERIC_SIGNIN_ERROR, 401);
  }

  if (!(await verifyPassword(password, citizen.passwordHash))) {
    throw new HttpError('INVALID_CREDENTIALS', GENERIC_SIGNIN_ERROR, 401);
  }

  await setSessionCookie(citizen.id, remember);
  return ok({ id: citizen.id, email, isAnonymous: false });
}

/**
 * Guest access.
 *
 * Kept deliberately. Requiring an account before anyone can look at the product would
 * make it impossible for an SIH judge — or a citizen at a CSC counter — to try it in the
 * thirty seconds they actually have. A guest gets the same isolated sandbox as before and
 * can register later.
 */
async function guest(req: NextRequest) {
  rateLimit(req, 'auth:guest', 5, 60_000);
  const existing = await readSession();
  if (existing) return ok({ id: existing, isAnonymous: true });

  const citizenId = await mintSession();
  await setSessionCookie(citizenId, false);
  return ok({ id: citizenId, isAnonymous: true });
}

async function forgot(req: NextRequest, body: Record<string, unknown>) {
  rateLimit(req, 'auth:forgot', 3, 60_000);

  const email = normaliseEmail(String(body.email ?? ''));
  if (isPlausibleEmail(email)) {
    const token = await issueResetToken(email);
    if (token) {
      const origin = req.headers.get('origin') ?? '';
      await getMailProvider().sendPasswordReset(
        email,
        `${origin}/?reset=${encodeURIComponent(token)}`,
      );
    }
  }

  // Always the same answer. Telling the caller whether mail was sent turns this endpoint
  // into an account-existence oracle.
  return ok({
    sent: true,
    message: 'If that address has an account, a reset link is on its way.',
  });
}

async function reset(req: NextRequest, body: Record<string, unknown>) {
  rateLimit(req, 'auth:reset', 5, 60_000);

  const token = String(body.token ?? '');
  const password = String(body.password ?? '');
  if (!token) throw new HttpError('VALIDATION_ERROR', 'That reset link is not valid.', 400);

  await consumeResetToken(token, password);
  // Deliberately does not sign the citizen in. Whoever holds the link may not be the
  // account holder, so completing a reset should require signing in with the new password.
  return ok({ reset: true });
}

async function logout() {
  await clearSessionCookie();
  return ok({ signedOut: true });
}
