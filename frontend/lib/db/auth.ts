import { scrypt as scryptCb, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { prisma } from './client';
import { HttpError } from './session';

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Citizen credentials.
 *
 * Shares the scrypt parameters and the colon-delimited encoding used for the admin
 * account, for one reason: two password implementations in one codebase means two places
 * to get wrong, and the weaker one sets the security level.
 *
 * Everything here is written so that an attacker learns nothing from a failure. Sign-in
 * returns the same message and does the same work whether the address is unknown or the
 * password is wrong. Password reset says "if that address has an account" regardless.
 * An enumerable auth endpoint on a welfare platform tells an attacker who is claiming
 * benefits, which is a disclosure in itself.
 */

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt:${N}:${R}:${P}:${salt.toString('base64')}:${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, n, r, p, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');
  try {
    const actual = await scrypt(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * A dummy hash of known cost.
 *
 * Verified against when no account exists, so an unknown address costs the same wall
 * time as a wrong password. Without this, response timing enumerates registered citizens.
 */
let dummyHash: string | null = null;
export async function equaliseTiming(password: string): Promise<void> {
  if (!dummyHash) dummyHash = await hashPassword('timing-equalisation-placeholder');
  await verifyPassword(password, dummyHash);
}

export const normaliseEmail = (email: string): string => email.trim().toLowerCase();

/** Deliberately permissive: the authority on whether an address works is a delivered mail. */
export function isPlausibleEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

/**
 * Password policy.
 *
 * Length is the only hard requirement. Composition rules (one symbol, one digit) push
 * people towards `Password1!` and away from length, which is the property that actually
 * matters — and they are a real barrier for a citizen typing on a feature phone keypad.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < 10) return 'Use at least 10 characters.';
  if (password.length > 200) return 'That password is too long.';
  const trivial = ['password', '1234567890', 'qwertyuiop', 'aadhaar123'];
  if (trivial.some((t) => password.toLowerCase().includes(t))) {
    return 'That password is too easy to guess. Try a short phrase instead.';
  }
  return null;
}

// ─── Password reset ──────────────────────────────────────────────────────────

const hashToken = (raw: string): string => createHash('sha256').update(raw).digest('hex');

/**
 * Issues a reset token.
 *
 * Only the hash is stored, so a database leak does not hand over working reset links.
 * Returns the raw token for the caller to put in the email; it is never persisted or
 * logged. One hour is short enough to limit exposure and long enough for someone who
 * checks mail on a shared device later in the day.
 */
export async function issueResetToken(email: string): Promise<string | null> {
  const citizen = await prisma.citizen.findUnique({
    where: { email: normaliseEmail(email) },
    select: { id: true },
  });
  if (!citizen) return null;

  const raw = randomBytes(32).toString('base64url');
  await prisma.citizen.update({
    where: { id: citizen.id },
    data: {
      resetTokenHash: hashToken(raw),
      resetTokenExpiresAt: new Date(Date.now() + 60 * 60_000),
    },
  });
  return raw;
}

/** Consumes a reset token and sets the new password. Single use. */
export async function consumeResetToken(rawToken: string, newPassword: string): Promise<void> {
  const citizen = await prisma.citizen.findFirst({
    where: {
      resetTokenHash: hashToken(rawToken),
      resetTokenExpiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  // Same message for an unknown, expired and already-used token — distinguishing them
  // tells an attacker whether a captured token was ever valid.
  if (!citizen) {
    throw new HttpError('INVALID_TOKEN', 'That reset link is no longer valid. Request a new one.', 400);
  }

  const problem = passwordProblem(newPassword);
  if (problem) throw new HttpError('VALIDATION_ERROR', problem, 422);

  await prisma.citizen.update({
    where: { id: citizen.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    },
  });
}

// ─── Mail transport ──────────────────────────────────────────────────────────

export interface MailProvider {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>;
}

/**
 * Console transport — active until an email provider is configured.
 *
 * Logs the reset link to the server log so the flow is fully testable without SMTP
 * credentials. It never logs the recipient's full address.
 */
export class ConsoleMailProvider implements MailProvider {
  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const masked = to.replace(/^(.).*(@.*)$/, '$1***$2');
    console.info(`[mail] password reset for ${masked}\n  ${resetUrl}`);
  }
}

/** Real transport. Unimplemented rather than silently dropping mail. */
export class SmtpMailProvider implements MailProvider {
  async sendPasswordReset(): Promise<void> {
    throw new Error(
      'Email delivery requires SMTP_HOST, SMTP_USER, SMTP_PASSWORD and MAIL_FROM, ' +
        'or an API key for Resend / SendGrid / Amazon SES.',
    );
  }
}

export function getMailProvider(): MailProvider {
  return process.env.SMTP_HOST ? new SmtpMailProvider() : new ConsoleMailProvider();
}

/** Whether Google sign-in can actually work in this deployment. */
export const googleConfigured = (): boolean =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
