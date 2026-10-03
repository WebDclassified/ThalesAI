import { NextResponse } from 'next/server';
import { readState, updateState } from '@/lib/db';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const state = await readState();
  const task = state.tasks.find((t) => t.id === id);
  if (!task) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Task not found.' } },
      { status: 404 },
    );
  }
  const runs = state.runs.filter((r) => r.taskId === id);
  const dataset = task.datasetId
    ? state.datasets.find((d) => d.id === task.datasetId)
    : undefined;
  return NextResponse.json({ task, runs, dataset });
}

/** Deletes a task and everything that belongs to it: runs, events, dataset, records, issues, reports. */
export async function DELETE(_: Request, { params }: Ctx) {
  const { id } = await params;
  let deleted = false;

  await updateState((s) => {
    const task = s.tasks.find((t) => t.id === id);
    if (!task) return;

    const datasetIds = new Set(
      s.datasets.filter((d) => d.taskId === id).map((d) => d.id),
    );
    const runIds = new Set(s.runs.filter((r) => r.taskId === id).map((r) => r.id));
    const recordIds = new Set(
      s.records.filter((r) => datasetIds.has(r.datasetId)).map((r) => r.id),
    );

    s.tasks = s.tasks.filter((t) => t.id !== id);
    s.runs = s.runs.filter((r) => r.taskId !== id);
    s.events = s.events.filter((e) => !runIds.has(e.runId));
    s.datasets = s.datasets.filter((d) => !datasetIds.has(d.id));
    s.records = s.records.filter((r) => !datasetIds.has(r.datasetId));
    s.issues = s.issues.filter((i) => !recordIds.has(i.recordId));
    s.reports = s.reports.filter((r) => !datasetIds.has(r.datasetId));
    deleted = true;
  });

  if (!deleted) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Task not found.' } },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
