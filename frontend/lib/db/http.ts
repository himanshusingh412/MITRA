import { NextResponse } from 'next/server';

/**
 * Response envelope shared with the FastAPI service: { data, error, meta }.
 * Route handlers return the same shape whichever backend serves them, so the client
 * never needs to know which one answered.
 */

export const ok = <T>(data: T, meta: Record<string, unknown> = {}) =>
  NextResponse.json({ data, error: null, meta });

export const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ data: null, error: { code, message }, meta: {} }, { status });

/** Never leak a driver error to the client — log it, return something generic. */
export function serverError(scope: string, e: unknown) {
  console.error(`[api:${scope}]`, e);
  return fail('INTERNAL_ERROR', 'Something went wrong on our side.', 500);
}

/** Database reads must never be cached by the framework — the point is that they change. */
export const dynamic = 'force-dynamic';
