import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readState, updateState } from '@/lib/db';
import { applyResolution } from '@/lib/review';

export const runtime = 'nodejs';

const Body = z.object({ resolved: z.boolean() });

/** Resolve or reopen a validation/dedupe issue. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Body must be {"resolved": boolean}.' } },
      { status: 400 },
    );
  }

  let outcome!: 'ok' | 'missing';
  await updateState((s) => {
    const result = applyResolution(s, id, parsed.data.resolved);
    outcome = result.ok ? 'ok' : 'missing';
  });

  if (outcome === 'missing') {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Issue not found.' } },
      { status: 404 },
    );
  }

  const s = await readState();
  const issue = s.issues.find((i) => i.id === id);
  const record = issue ? s.records.find((r) => r.id === issue.recordId) : undefined;
  return NextResponse.json({ issue, record });
}
