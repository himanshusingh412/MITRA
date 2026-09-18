import { NextResponse, type NextRequest } from 'next/server';
import { syncSchemes } from '@/lib/services/schemeSync';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const adminCookie = req.cookies.get('mitra_admin')?.value;
    const cronSecret = process.env.CRON_SECRET;

    const isCronAuthorized = cronSecret && cronSecret !== 'your_cron_secret_here' && authHeader === `Bearer ${cronSecret}`;
    const isAdminAuthorized = Boolean(adminCookie);

    if (process.env.NODE_ENV === 'production' && !isCronAuthorized && !isAdminAuthorized) {
      return NextResponse.json(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'Manual sync requires administrator authentication.' } },
        { status: 401 }
      );
    }

    const summary = await syncSchemes();
    return NextResponse.json({ data: summary, error: null });
  } catch (err: unknown) {
    console.error('[POST /api/schemes/sync] Error:', err);
    return NextResponse.json(
      { data: null, error: { code: 'SYNC_FAILED', message: 'Failed to synchronize live government schemes.' } },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
