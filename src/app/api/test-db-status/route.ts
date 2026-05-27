import { NextResponse } from 'next/server';
import { isTestDbActive } from '@/lib/environmentMode';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { testDbActive: isTestDbActive() },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
