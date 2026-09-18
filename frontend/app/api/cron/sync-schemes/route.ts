import { NextResponse, type NextRequest } from 'next/server';
import { syncSchemes } from '@/lib/services/schemeSync';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Reject unauthenticated calls if CRON_SECRET is configured
    if (cronSecret && cronSecret !== 'your_cron_secret_here') {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized cron synchronization request.' } },
          { status: 401 }
        );
      }
    } else if (process.env.NODE_ENV === 'production') {
      // In production, CRON_SECRET is required to trigger cron sync
      return NextResponse.json(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'CRON_SECRET configuration required.' } },
        { status: 401 }
      );
    }

    const summary = await syncSchemes();
    return NextResponse.json({ data: summary, error: null });
  } catch (err: unknown) {
    console.error('[GET /api/cron/sync-schemes] Error:', err);
    return NextResponse.json(
      { data: null, error: { code: 'CRON_SYNC_FAILED', message: 'Cron scheme sync failed.' } },
      { status: 500 }
    );
  }
}
