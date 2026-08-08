import { NextRequest, NextResponse } from 'next/server';
import { HttpError } from './session';

/**
 * Per-route request guards: rate limiting, origin checking and error shaping.
 *
 * The limiter is an in-process fixed window. On Vercel that means the budget is per
 * warm instance rather than global, so it throttles a single abusive client but is not
 * a distributed quota — a determined attacker spraying across cold starts gets more
 * than the nominal limit. It is the honest ceiling of what runs without a KV store, and
 * it is documented as such in SECURITY.md rather than overstated. Swap the two calls
 * below for @upstash/ratelimit when Vercel KV is provisioned.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientKey(req: NextRequest, scope: string): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';
  return `${scope}:${ip}`;
}

export function rateLimit(req: NextRequest, scope: string, limit: number, windowMs: number) {
  const key = clientKey(req, scope);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // Opportunistic sweep so an instance that has been warm for hours does not grow
    // a bucket per address it has ever seen.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
    }
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    throw new HttpError(
      'RATE_LIMITED',
      'Too many requests. Please wait a moment and try again.',
      429,
    );
  }
}

/**
 * Rejects cross-site mutations.
 *
 * sameSite=strict on the session cookie already blocks the classic CSRF shape; this is
 * the second lock, and it also stops other origins driving the AI endpoint.
 */
export function sameOrigin(req: NextRequest) {
  if (req.method === 'GET' || req.method === 'HEAD') return;

  const origin = req.headers.get('origin');
  if (!origin) return; // same-origin fetches from the app omit it

  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    throw new HttpError('FORBIDDEN', 'Request blocked.', 403);
  }

  const expected = req.headers.get('host');
  if (expected && host !== expected) {
    throw new HttpError('FORBIDDEN', 'Request blocked.', 403);
  }
}

/**
 * Single exit point for route errors.
 *
 * Anything that is not an explicit HttpError is logged and returned as a generic 500 —
 * driver messages and stack traces never reach a client.
 */
export function handleError(scope: string, e: unknown): NextResponse {
  if (e instanceof HttpError) {
    return NextResponse.json(
      { data: null, error: { code: e.code, message: e.message }, meta: {} },
      { status: e.status },
    );
  }
  console.error(`[api:${scope}]`, e);
  return NextResponse.json(
    {
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side.' },
      meta: {},
    },
    { status: 500 },
  );
}
