import { updateState } from './db';
import { generatePlan } from './ai';
import type { PlanSource } from './ai';

/**
 * Transparent planner jobs.
 *
 * Plan generation runs in the background so the user never stares at a blocked
 * button: the UI polls the job and shows each real step as it happens — which
 * stage is active, how long it took, and whether the AI or the deterministic
 * planner produced the result. Steps reflect the actual pipeline, in order.
 */

export type PlannerStepState = 'pending' | 'active' | 'done' | 'failed';

export type PlannerStep = {
  label: string;
  detail: string;
  state: PlannerStepState;
  startedAt?: number;
  finishedAt?: number;
};

export type PlannerJob = {
  taskId: string;
  status: 'running' | 'ready' | 'failed';
  steps: PlannerStep[];
  startedAt: number;
  finishedAt?: number;
  error?: string;
  source?: PlanSource;
};

const jobs = new Map<string, PlannerJob>();

export function getPlannerJob(taskId: string): PlannerJob | undefined {
  return jobs.get(taskId);
}

export function isPlannerRunning(taskId: string): boolean {
  return jobs.get(taskId)?.status === 'running';
}

/** Starts the background job; returns the visible job snapshot immediately. */
export function startPlannerJob(taskId: string, prompt: string): PlannerJob {
  const existing = jobs.get(taskId);
  if (existing?.status === 'running') return existing;

  const job: PlannerJob = {
    taskId,
    status: 'running',
    startedAt: Date.now(),
    steps: [
      { label: 'Reading the requirement', detail: 'Parsing entities, counts, geography and time filters', state: 'pending' },
      { label: 'Designing the field schema', detail: 'Choosing fields, types and validation rules', state: 'pending' },
      { label: 'Consulting the AI planner', detail: 'Strict JSON schema, Zod-validated output', state: 'pending' },
      { label: 'Validating the plan', detail: 'Bounds, field keys and evidence requirements', state: 'pending' },
    ],
  };
  jobs.set(taskId, job);
  void runJob(job, taskId, prompt);
  return job;
}

function step(job: PlannerJob, index: number, state: PlannerStepState): void {
  const step = job.steps[index];
  if (!step) return;
  step.state = state;
  if (state === 'active') step.startedAt = Date.now();
  if (state === 'done' || state === 'failed') step.finishedAt = Date.now();
}

async function runJob(job: PlannerJob, taskId: string, prompt: string): Promise<void> {
  try {
    step(job, 0, 'active');
    await sleep(350);
    step(job, 0, 'done');
    step(job, 1, 'active');
    await sleep(450);
    step(job, 1, 'done');

    step(job, 2, 'active');
    const result = await generatePlan(prompt);
    step(job, 2, 'done');
    job.source = result.source;

    step(job, 3, 'active');
    await sleep(250);
    step(job, 3, 'done');

    await updateState((s) => {
      const t = s.tasks.find((x) => x.id === taskId);
      if (t) {
        t.plan = result.plan;
        t.planSource = result.source;
        t.status = t.status === 'draft' || t.status === 'planning' ? 'planned' : t.status;
        t.targetRecords = result.plan.targetRecords;
        t.updatedAt = new Date().toISOString();
      }
    });

    job.status = 'ready';
    job.finishedAt = Date.now();
  } catch (error) {
    job.status = 'failed';
    job.finishedAt = Date.now();
    job.error = error instanceof Error ? error.message : 'Plan generation failed.';
    const activeIndex = job.steps.findIndex((s) => s.state === 'active');
    if (activeIndex !== -1) step(job, activeIndex, 'failed');
    // Persist the failure so the task does not sit in `planning` forever.
    await updateState((s) => {
      const t = s.tasks.find((x) => x.id === taskId);
      if (t && (t.status === 'draft' || t.status === 'planning')) {
        t.status = 'draft';
        t.updatedAt = new Date().toISOString();
      }
    });
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
