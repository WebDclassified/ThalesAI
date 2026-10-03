import { NextResponse } from 'next/server';
import { readState } from '@/lib/db';

export const runtime = 'nodejs';

/** Snapshot of one run plus its event log; the run page polls this. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params;
  const runId = new URL(req.url).searchParams.get('runId');

  const s = await readState();
  const task = s.tasks.find((t) => t.id === taskId);
  const run = runId
    ? s.runs.find((r) => r.id === runId && r.taskId === taskId)
    : task?.latestRunId
      ? s.runs.find((r) => r.id === task.latestRunId)
      : undefined;

  if (!task || !run) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Run not found.' } },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { run, events: s.events.filter((e) => e.runId === run.id) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
