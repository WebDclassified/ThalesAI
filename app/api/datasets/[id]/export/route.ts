import { NextResponse } from 'next/server';
import { readState } from '@/lib/db';
import { exportGuard, renderExport, type ExportFormat } from '@/lib/export';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requested = (new URL(req.url).searchParams.get('format') || 'csv').toLowerCase();

  if (requested !== 'csv' && requested !== 'json') {
    return NextResponse.json(
      { error: { code: 'INVALID_FORMAT', message: 'format must be csv or json.' } },
      { status: 400 },
    );
  }
  const format = requested as ExportFormat;

  const state = await readState();
  const dataset = state.datasets.find((d) => d.id === id || d.taskId === id);
  const rows = dataset
    ? state.records.filter((r) => r.datasetId === dataset.id)
    : [];

  const guard = exportGuard(dataset, rows);
  if (!guard.ok) {
    return NextResponse.json(
      { error: { code: guard.code, message: guard.message } },
      { status: guard.status },
    );
  }

  // Column order comes from the task's plan; datasets without a reachable plan
  // fall back to the union of the records' own field keys.
  const task = dataset ? state.tasks.find((t) => t.id === dataset.taskId) : undefined;
  const fields = task?.plan?.fields?.length
    ? task.plan.fields
    : rows.flatMap((r) => Object.keys(r.fields).map((key) => ({ key, label: key, required: false, type: 'text' })));

  const file = renderExport(dataset!, rows, format, fields);
  return new Response(file.body, {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
