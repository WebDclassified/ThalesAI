import { id, updateState } from './db';

/**
 * Crash recovery.
 *
 * Runs execute in-process, so a server restart mid-run leaves runs stranded in
 * `queued`/`running`/`validating` forever. `reconcileOnBoot` runs once per
 * process (first layout render or first events poll) and settles every orphan:
 *   - stranded runs  -> `failed`, with a `run.interrupted` event explaining why
 *   - datasets       -> `ready` if records were already persisted, else `failed`
 *   - tasks          -> the honest terminal state of their latest run
 */

let boot: Promise<void> | null = null;

/** Reconciles immediately; safe to call repeatedly (idempotent). */
export function reconcileRuns(): Promise<void> {
  return reconcile();
}

/** Runs once per process; later calls return the first pass's promise. */
export function reconcileOnBoot(): Promise<void> {
  boot ??= reconcile();
  return boot;
}

async function reconcile(): Promise<void> {
  const active = new Set(['queued', 'running', 'validating']);

  await updateState((s) => {
    const now = new Date().toISOString();
    const orphanRuns = s.runs.filter((r) => active.has(r.status));
    if (!orphanRuns.length) return;

    for (const run of orphanRuns) {
      run.status = 'failed';
      run.finishedAt = now;
      s.events.push({
        id: id('evt'),
        runId: run.id,
        type: 'run.interrupted',
        step: 'recovery',
        progress: run.overallProgress,
        message: 'Run interrupted by a server restart and marked failed. Start a new run to retry.',
        createdAt: now,
      });
    }

    const orphanByTask = new Map(orphanRuns.map((r) => [r.taskId, r]));

    for (const dataset of s.datasets) {
      if (dataset.status !== 'processing') continue;
      const task = s.tasks.find((t) => t.datasetId === dataset.id);
      const orphan = task ? orphanByTask.get(task.id) : undefined;
      if (!orphan) continue;
      const hasRecords = s.records.some((r) => r.datasetId === dataset.id);
      dataset.status = hasRecords ? 'ready' : 'failed';
      dataset.updatedAt = now;
    }

    for (const task of s.tasks) {
      const orphan = orphanByTask.get(task.id);
      if (!orphan) continue;
      if (task.status !== 'running' && task.status !== 'validating') continue;
      task.status = 'failed';
      task.updatedAt = now;
    }
  });
}
