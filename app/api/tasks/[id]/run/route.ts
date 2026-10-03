import { NextResponse } from 'next/server';
import { id, readState, updateState } from '@/lib/db';
import { execute } from '@/lib/workflow';
import type { Dataset, WorkflowRun } from '@/lib/types';

export const runtime = 'nodejs';

const ACTIVE = new Set(['queued', 'running', 'validating']);

type Outcome =
  | { kind: 'created'; run: WorkflowRun; taskId: string }
  | { kind: 'reused'; run: WorkflowRun; taskId: string }
  | { kind: 'missing' }
  | { kind: 'no_plan' }
  | { kind: 'planning' };

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params;

  // Existence is checked up front for a fast 404; the authoritative check happens
  // inside the same locked update that creates the run, so two rapid POSTs can
  // never both slip past the in-flight guard and start duplicate runs.
  const exists = (await readState()).tasks.some((t) => t.id === taskId);
  if (!exists) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Task not found.' } },
      { status: 404 },
    );
  }

  let outcome!: Outcome;
  await updateState((s) => {
    const task = s.tasks.find((t) => t.id === taskId);
    if (!task) {
      outcome = { kind: 'missing' };
      return;
    }
    if (!task.plan) {
      outcome = { kind: 'no_plan' };
      return;
    }
    if (task.status === 'planning') {
      outcome = { kind: 'planning' };
      return;
    }

    const existing = task.latestRunId
      ? s.runs.find((r) => r.id === task.latestRunId && ACTIVE.has(r.status))
      : undefined;
    if (existing) {
      outcome = { kind: 'reused', run: existing, taskId };
      return;
    }

    const now = new Date().toISOString();
    const run: WorkflowRun = {
      id: id('run'),
      taskId,
      status: 'queued',
      overallProgress: 0,
      recordsDiscovered: 0,
      recordsExtracted: 0,
      recordsValidated: 0,
      duplicatesRemoved: 0,
    };
    const datasetId = task.datasetId || id('ds');
    const dataset: Dataset = {
      id: datasetId,
      taskId,
      name: task.name,
      status: 'processing',
      recordCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    s.runs.push(run);
    if (!s.datasets.some((d) => d.id === datasetId)) s.datasets.push(dataset);
    task.latestRunId = run.id;
    task.datasetId = datasetId;
    task.status = 'running';
    task.updatedAt = now;
    outcome = { kind: 'created', run, taskId };
  });

  if (outcome.kind === 'missing') {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Task not found.' } },
      { status: 404 },
    );
  }
  if (outcome.kind === 'no_plan') {
    return NextResponse.json(
      { error: { code: 'NO_PLAN', message: 'Generate the research plan first.' } },
      { status: 409 },
    );
  }
  if (outcome.kind === 'planning') {
    return NextResponse.json(
      { error: { code: 'PLAN_IN_PROGRESS', message: 'The planner is still working — run collection once the plan is ready.' } },
      { status: 409 },
    );
  }

  if (outcome.kind === 'created') {
    // Fire-and-forget: the run lives in event/progress state; recovery settles
    // orphans if this process dies (lib/recovery.ts).
    void execute(taskId, outcome.run.id);
    return NextResponse.json({ run: outcome.run }, { status: 202 });
  }

  return NextResponse.json({ run: outcome.run, reused: true });
}
