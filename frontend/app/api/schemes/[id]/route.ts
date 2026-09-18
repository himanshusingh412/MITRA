import { NextResponse, type NextRequest } from 'next/server';
import { getLiveSchemeById } from '@/lib/services/schemeSync';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scheme = await getLiveSchemeById(id);

    if (!scheme) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Scheme not found.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: scheme, error: null });
  } catch (err: unknown) {
    console.error('[GET /api/schemes/[id]] Error:', err);
    return NextResponse.json(
      { data: null, error: { code: 'SERVER_ERROR', message: 'Failed to retrieve scheme.' } },
      { status: 500 }
    );
  }
}
