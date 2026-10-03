import { NextResponse } from 'next/server';
import { readState, updateState } from '@/lib/db';

export const runtime = 'nodejs';

const ACTIVE = new Set(['queued', 'running', 'validating']);

/** Cancels the task's in-flight run. The executor honours it at the next stage boundary. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let outcome!: 'ok' | 'missing' | 'not_active';

  await updateState((s) => {
    const task = s.tasks.find((t) => t.id === id);
    const run = task?.latestRunId ? s.runs.find((r) => r.id === task.latestRunId) : undefined;
    if (!task || !run) {
      outcome = 'missing';
      return;
    }
    if (!ACTIVE.has(run.status)) {
      outcome = 'not_active';
      return;
    }
    const now = new Date().toISOString();
    run.status = 'cancelled';
    run.finishedAt = now;
    task.status = 'cancelled';
    task.updatedAt = now;
    s.events.push({
      id: `evt_${crypto.randomUUID()}`,
      runId: run.id,
      type: 'run.cancelled',
      step: 'cancel',
      progress: run.overallProgress,
      message: 'Cancellation requested; the workflow stops at the next stage boundary.',
      createdAt: now,
    });
  });

  if (outcome === 'missing') {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Task or run not found.' } },
      { status: 404 },
    );
  }
  if (outcome === 'not_active') {
    return NextResponse.json(
      { error: { code: 'NOT_ACTIVE', message: 'This run is not active.' } },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
