import { NextResponse } from 'next/server';
import { resetState } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Clears the entire workspace. Deliberately requires an explicit confirmation
 * body so a stray POST (preflight, crawler, mis-scoped form) cannot wipe data.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { confirm?: boolean } | null;
  if (!body || body.confirm !== true) {
    return NextResponse.json(
      {
        error: {
          code: 'CONFIRMATION_REQUIRED',
          message: 'Send {"confirm": true} to clear the workspace.',
        },
      },
      { status: 400 },
    );
  }

  await resetState();
  return NextResponse.json({ ok: true });
}
