import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'MITRA',
    aiConfigured: Boolean(process.env.AI_API_KEY),
    aiModel: process.env.AI_MODEL || 'gemini-3.1-flash-lite',
  });
}
