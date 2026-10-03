import { NextResponse } from 'next/server';
import { readState } from '@/lib/db';
import { getPlannerJob } from '@/lib/planner-jobs';

export const runtime = 'nodejs';

/** Snapshot of the transparent planner job for live UI polling. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const job = getPlannerJob(id);
  if (job) {
    return NextResponse.json(
      {
        status: job.status,
        source: job.source,
        error: job.error,
        elapsedMs: (job.finishedAt ?? Date.now()) - job.startedAt,
        steps: job.steps.map((s) => ({
          label: s.label,
          detail: s.detail,
          state: s.state,
          durationMs: s.finishedAt && s.startedAt ? s.finishedAt - s.startedAt : undefined,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // No in-memory job (e.g. server restarted): infer from the persisted task.
  const task = (await readState()).tasks.find((t) => t.id === id);
  if (!task) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Task not found.' } },
      { status: 404 },
    );
  }
  if (task.plan) {
    return NextResponse.json({
      status: 'ready',
      source: task.planSource,
      elapsedMs: 0,
      steps: [],
    });
  }
  return NextResponse.json({
    status: 'idle',
    elapsedMs: 0,
    steps: [],
  });
}
