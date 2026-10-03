import { NextResponse } from 'next/server';
import { readState } from '@/lib/db';

export const runtime = 'nodejs';

/** Dataset payloads are addressable by dataset id or by the owning task id. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await readState();

  const dataset = s.datasets.find((d) => d.id === id || d.taskId === id);
  if (!dataset) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Dataset not found.' } },
      { status: 404 },
    );
  }

  const records = s.records.filter((r) => r.datasetId === dataset.id);
  const recordIds = new Set(records.map((r) => r.id));
  const issues = s.issues.filter((i) => recordIds.has(i.recordId));

  return NextResponse.json({ dataset, records, issues });
}
