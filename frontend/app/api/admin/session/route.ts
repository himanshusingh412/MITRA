import { NextRequest } from 'next/server';
import { ok } from '@/lib/db/http';
import { handleError, rateLimit } from '@/lib/db/guard';
import { HttpError } from '@/lib/db/session';
import { readAdminClaims } from '@/lib/db/admin';

export const dynamic = 'force-dynamic';

/**
 * Returns the signed-in officer's display details for the sidebar.
 *
 * Carries no authority of its own — middleware.ts has already decided whether the
 * request may reach /admin. This exists so the shell can show a name without the client
 * holding a forgeable copy of the session.
 */
export async function GET(req: NextRequest) {
  try {
    rateLimit(req, 'admin:session', 60, 60_000);

    const claims = await readAdminClaims();
    if (!claims) throw new HttpError('UNAUTHENTICATED', 'Not signed in.', 401);

    return ok({ name: claims.name, role: claims.role, district: claims.district });
  } catch (e) {
    return handleError('admin:session', e);
  }
}
