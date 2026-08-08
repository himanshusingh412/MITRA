import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Server-side gate for the government portal.
 *
 * This is the actual authorisation boundary. The client-side check inside AdminShell is
 * only there to avoid rendering a flash of the dashboard before redirecting — it is a
 * convenience, never the control. Anything a client can set, a client can forge, so the
 * decision has to be made here, on a signed token the browser cannot mint.
 *
 * Runs on the Edge runtime, so it uses `jose` (Web Crypto) rather than node:crypto.
 *
 * Named `proxy.ts` because Next 16 renamed the `middleware` convention; the behaviour
 * and the request contract are unchanged.
 */

const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const secretValue = process.env.JWT_ADMIN_SECRET;
  if (!secretValue || secretValue.length < 32) {
    // Fail closed. A misconfigured deployment must lock the portal, not open it.
    console.error('[proxy] JWT_ADMIN_SECRET missing — denying admin access.');
    return NextResponse.redirect(new URL('/admin/login?error=config', req.url));
  }

  const token = req.cookies.get('mitra_admin')?.value;
  if (!token) return NextResponse.redirect(new URL('/admin/login', req.url));

  try {
    await jwtVerify(token, new TextEncoder().encode(secretValue), {
      issuer: 'mitra',
      audience: 'mitra-admin',
    });
  } catch {
    const res = NextResponse.redirect(new URL('/admin/login?error=expired', req.url));
    res.cookies.set('mitra_admin', '', { path: '/', maxAge: 0 });
    return res;
  }

  const res = NextResponse.next();
  // The portal must never be cached by a shared proxy or indexed by a crawler.
  res.headers.set('Cache-Control', 'no-store, must-revalidate');
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
