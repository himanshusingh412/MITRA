import { NextResponse, type NextRequest } from 'next/server';
import { getLiveSchemes } from '@/lib/services/schemeSync';
import { SECTOR_LABELS } from '@/lib/schemes';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const sector = searchParams.get('sector');
    const state = searchParams.get('state');
    const ministry = searchParams.get('ministry');
    const search = searchParams.get('search') || searchParams.get('q');
    const level = searchParams.get('level');

    const { schemes, lastSyncedAt, isLive, dataSource, sourceTypeCounts } = await getLiveSchemes();

    let filtered = schemes;

    if (sector && sector !== 'all') {
      filtered = filtered.filter((s) => s.sector === sector);
    }

    if (level) {
      filtered = filtered.filter((s) => s.level === level);
    }

    if (state) {
      filtered = filtered.filter((s) => !s.state || s.state.toLowerCase() === state.toLowerCase() || s.level === 'central');
    }

    if (ministry) {
      const m = ministry.toLowerCase();
      filtered = filtered.filter((s) => s.ministry.toLowerCase().includes(m));
    }

    if (search && search.trim().length > 0) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.shortName.toLowerCase().includes(q) ||
          s.tagline.toLowerCase().includes(q) ||
          s.ministry.toLowerCase().includes(q) ||
          s.summary.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      data: filtered,
      meta: {
        total: filtered.length,
        totalCount: schemes.length,
        lastSyncedAt,
        isLive,
        dataSource,
        sourceTypeCounts,
        sectors: SECTOR_LABELS,
      },
      error: null,
    });
  } catch (err: unknown) {
    console.error('[GET /api/schemes] Error:', err);
    return NextResponse.json(
      {
        data: [],
        meta: { total: 0, totalCount: 0, isLive: false },
        error: { code: 'SERVER_ERROR', message: 'Failed to retrieve schemes catalogue.' },
      },
      { status: 500 }
    );
  }
}
