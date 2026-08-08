import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Departmental admin authentication.
 *
 * Deliberately separate from the citizen session in every respect — different cookie,
 * different signing key, different audience — so a citizen token can never be replayed
 * as an officer token, and compromising one key does not grant the other's access.
 *
 * The password is verified server-side against a scrypt hash held in an environment
 * variable. Nothing about the credential reaches the browser bundle.
 */

const COOKIE = 'mitra_admin';
const TTL_MINUTES = 60;

export interface AdminClaims {
  officerId: string;
  name: string;
  role: string;
  district: string;
}

function secret(): Uint8Array {
  const s = process.env.JWT_ADMIN_SECRET;
  if (!s || s.length < 32) {
    throw new Error('JWT_ADMIN_SECRET is missing or shorter than 32 characters.');
  }
  return new TextEncoder().encode(s);
}

/**
 * Parses `scrypt:N:r:p:saltB64:hashB64` and verifies in constant time.
 *
 * Colon-delimited rather than the conventional `$`, because dotenv performs variable
 * expansion on `$name` and would silently mangle the hash into an unusable value — a
 * failure that looks like a wrong password rather than a config error.
 */
export async function verifyPassword(password: string): Promise<boolean> {
  const stored = process.env.ADMIN_PASSWORD_HASH;
  if (!stored) return false;

  const parts = stored.split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, N, r, p, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');

  try {
    const actual = await scrypt(password, salt, expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });
    // Length check first: timingSafeEqual throws on a mismatch rather than returning false.
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function issueAdminSession(claims: AdminClaims): Promise<void> {
  const token = await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.officerId)
    .setIssuedAt()
    .setIssuer('mitra')
    .setAudience('mitra-admin')
    // Short-lived by design: an unattended terminal in a district office is a real
    // threat model for a government portal.
    .setExpirationTime(`${TTL_MINUTES}m`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: TTL_MINUTES * 60,
  });
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Reads the admin session in a route handler. Returns null when absent or invalid. */
export async function readAdminClaims(): Promise<AdminClaims | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: 'mitra',
      audience: 'mitra-admin',
    });
    return {
      officerId: String(payload.sub ?? ''),
      name: String(payload.name ?? ''),
      role: String(payload.role ?? ''),
      district: String(payload.district ?? ''),
    };
  } catch {
    return null;
  }
}

export const ADMIN_COOKIE = COOKIE;
