import { NextResponse } from 'next/server';
import { id, readState, updateState } from '@/lib/db';
import { buildReport } from '@/lib/report';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const datasetId: unknown = body?.datasetId;

  if (typeof datasetId !== 'string' || !datasetId) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'datasetId is required.' } },
      { status: 400 },
    );
  }

  const state = await readState();
  const dataset = state.datasets.find((x) => x.id === datasetId);
  if (!dataset) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Dataset not found.' } },
      { status: 404 },
    );
  }
  if (dataset.status !== 'ready') {
    return NextResponse.json(
      { error: { code: 'DATASET_NOT_READY', message: 'This dataset is still being collected.' } },
      { status: 409 },
    );
  }

  const rows = state.records.filter((r) => r.datasetId === dataset.id);
  if (!rows.length) {
    return NextResponse.json(
      { error: { code: 'NO_RECORDS', message: 'This dataset has no records to report on.' } },
      { status: 422 },
    );
  }

  const report = {
    ...buildReport(
      dataset.id,
      dataset.name,
      rows,
      state.tasks.find((t) => t.id === dataset.taskId)?.plan?.fields ?? [],
    ),
    id: id('report'),
    createdAt: new Date().toISOString(),
  };

  await updateState((st) => {
    st.reports.push(report);
  });

  return NextResponse.json({ report }, { status: 201 });
}
