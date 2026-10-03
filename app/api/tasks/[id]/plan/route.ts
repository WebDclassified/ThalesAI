import { NextResponse } from 'next/server';
import { readState, updateState } from '@/lib/db';
import { isPlannerRunning, startPlannerJob } from '@/lib/planner-jobs';

export const runtime = 'nodejs';

const ACTIVE_RUN = new Set(['queued', 'running', 'validating']);

/**
 * Starts plan generation as a background job and returns immediately.
 * Progress is polled via GET /api/tasks/:id/plan-status.
 */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const state = await readState();
  const task = state.tasks.find((t) => t.id === id);
  if (!task) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Task not found.' } },
      { status: 404 },
    );
  }
  if (isPlannerRunning(id)) {
    return NextResponse.json({ status: 'running' });
  }
  const activeRun = task.latestRunId
    ? state.runs.find((r) => r.id === task.latestRunId && ACTIVE_RUN.has(r.status))
    : undefined;
  if (activeRun) {
    return NextResponse.json(
      {
        error: {
          code: 'RUN_ACTIVE',
          message: 'A collection run is in progress; wait for it to finish before replanning.',
        },
      },
      { status: 409 },
    );
  }

  await updateState((s) => {
    const t = s.tasks.find((x) => x.id === id);
    if (t) {
      t.status = 'planning';
      t.updatedAt = new Date().toISOString();
    }
  });

  startPlannerJob(id, task.prompt);
  return NextResponse.json({ status: 'running' }, { status: 202 });
}
