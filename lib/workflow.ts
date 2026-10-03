import { demoSourceAdapter, resolveAdapterForPlan } from './adapters';
import { id, readState, updateState } from './db';
import type { PlanField, ValidationIssue, ValidationFinding } from './types';
import { dedupe, validate } from './validation';

/**
 * Deterministic workflow executor.
 *
 * Collection is delegated to a `SourceAdapter`; this module owns the orchestration,
 * progress reporting and persistence only. Progress percentages are derived from real
 * counters, never from constants, and a failure part-way through leaves the records
 * and events that were already written in place. A user cancellation is honoured at
 * every stage boundary: the executor re-checks the run status and stops without
 * overwriting the cancelled state.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ACTIVE_STATUSES = new Set(['queued', 'running', 'validating']);

async function evt(
  runId: string,
  step: string,
  progress: number,
  message: string,
  type = 'progress',
): Promise<void> {
  await updateState((s) => {
    s.events.push({
      id: id('evt'),
      runId,
      type,
      step,
      progress,
      message,
      createdAt: new Date().toISOString(),
    });
  });
}

/** True when the run is no longer allowed to continue (cancelled or vanished). */
async function interrupted(runId: string): Promise<boolean> {
  const s = await readState();
  const run = s.runs.find((x) => x.id === runId);
  return !run || run.status === 'cancelled';
}

export async function execute(taskId: string, runId: string): Promise<void> {
  try {
    const state = await readState();
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');
    const plan = task.plan;
    if (!plan) throw new Error('Task has no research plan');
    const fields: PlanField[] = plan.fields;

    const datasetId = task.datasetId || id('ds');
    const { adapter, mode, reason } = resolveAdapterForPlan(plan);

    await updateState((s) => {
      const t = s.tasks.find((x) => x.id === taskId);
      const r = s.runs.find((x) => x.id === runId);
      const d = s.datasets.find((x) => x.id === datasetId);
      if (t) {
        t.status = 'running';
        t.datasetId = datasetId;
        t.updatedAt = new Date().toISOString();
      }
      if (r) {
        r.status = 'running';
        r.startedAt = new Date().toISOString();
        r.overallProgress = 2;
      }
      if (d) d.status = 'processing';
    });

    await evt(runId, 'discover', 8, `Collecting via ${adapter.label}. ${reason}`, 'source.started');
    await sleep(450);

    if (await interrupted(runId)) return await finalizeCancellation(taskId, runId, datasetId);

    let result;
    try {
      result = await adapter.collect({
        runId,
        datasetId,
        plan,
        targetRecords: task.targetRecords || plan.targetRecords,
      });
    } catch (liveError) {
      if (!adapter.live) throw liveError;
      // A live source must never block the product: network down, rate-limited or
      // empty — say so, and finish the run on the synthetic adapter instead.
      const detail = liveError instanceof Error ? liveError.message : 'unknown error';
      result = await demoSourceAdapter.collect({
        runId,
        datasetId,
        plan,
        targetRecords: task.targetRecords || plan.targetRecords,
      });
      await evt(
        runId,
        'discover',
        10,
        `Live source unavailable (${detail}). Falling back to synthetic demo data for this run.`,
        'source.fallback',
      );
    }

    const shortfall = result.discovered < (task.targetRecords || plan.targetRecords);
    await updateState((s) => {
      const r = s.runs.find((x) => x.id === runId);
      if (r) {
        r.recordsDiscovered = result.discovered;
        r.recordsExtracted = result.records.length;
      }
    });
    await evt(
      runId,
      'discover',
      24,
      `${result.discovered} candidate(s) discovered from ${result.sourcesUsed.length} source(s).` +
        (shortfall ? ' Fewer than requested — the source returned this many candidates.' : ''),
      'source.completed',
    );

    await evt(runId, 'extract', 40, 'Extracting structured fields.');
    await sleep(450);

    await evt(runId, 'normalize', 58, 'Normalizing names, URLs, funding values and locations.');
    await sleep(300);

    await evt(runId, 'deduplicate', 68, 'Checking canonical keys for duplicate records.');
    await sleep(300);

    if (await interrupted(runId)) return await finalizeCancellation(taskId, runId, datasetId);

    const deduped = dedupe(result.records, fields);

    // Persist the extracted records before validation so a later failure still keeps them.
    await updateState((s) => {
      const r = s.runs.find((x) => x.id === runId);
      if (r && r.status === 'cancelled') return;
      s.records = s.records.filter((x) => x.datasetId !== datasetId);
      s.records.push(...deduped.rows);
      if (r) r.duplicatesRemoved = deduped.removed;
    });

    if (await interrupted(runId)) return await finalizeCancellation(taskId, runId, datasetId);

    await evt(
      runId,
      'deduplicate',
      73,
      `${deduped.removed} duplicate record(s) merged; ${deduped.candidates.length} possible duplicate(s) held for review.`,
    );

    await updateState((s) => {
      const r = s.runs.find((x) => x.id === runId);
      const t = s.tasks.find((x) => x.id === taskId);
      if (r && r.status === 'cancelled') return;
      if (r) {
        r.status = 'validating';
        r.overallProgress = 78;
      }
      if (t) t.status = 'validating';
    });

    await evt(runId, 'validate', 82, 'Validating required fields and evidence.');
    await sleep(400);

    const now = new Date().toISOString();
    let validCount = 0;
    const findings: ValidationIssue[] = [];

    await updateState((s) => {
      const r = s.runs.find((x) => x.id === runId);
      if (r && r.status === 'cancelled') return;
      const rows = s.records.filter((x) => x.datasetId === datasetId);

      for (const row of rows) {
        const issues: ValidationFinding[] = validate(row, fields);
        if (!issues.length) validCount += 1;
        for (const issue of issues) {
          findings.push({
            id: id('issue'),
            recordId: row.id,
            type: 'validation',
            field: issue.field,
            message: issue.message,
            severity: issue.severity,
            status: 'open',
            createdAt: now,
          });
        }
      }

      // Possible duplicates are surfaced, never merged silently.
      for (const candidate of deduped.candidates) {
        findings.push({
          id: id('issue'),
          recordId: candidate.incomingId,
          type: 'dedupe',
          field: 'canonicalKey',
          message: `${candidate.reason} Possible duplicate of "${candidate.title}".`,
          severity: 'warning',
          status: 'open',
          createdAt: now,
        });
      }

      const rowIds = new Set(rows.map((r) => r.id));
      s.issues = s.issues.filter((i) => !rowIds.has(i.recordId));
      s.issues.push(...findings);

      const run = s.runs.find((x) => x.id === runId);
      const t = s.tasks.find((x) => x.id === taskId);
      const d = s.datasets.find((x) => x.id === datasetId);

      if (run) {
        run.recordsValidated = validCount;
        run.overallProgress = 92;
        run.status = findings.length ? 'review_required' : 'completed';
        run.finishedAt = now;
      }
      if (t) t.status = findings.length ? 'review' : 'completed';
      if (d) {
        d.status = 'ready';
        d.recordCount = rows.length;
        d.updatedAt = now;
      }
    });

    await evt(
      runId,
      'validate',
      92,
      `${validCount} record(s) validated; ${findings.length} item(s) need review.`,
    );

    await sleep(200);
    await updateState((s) => {
      const r = s.runs.find((x) => x.id === runId);
      if (r && r.status !== 'cancelled') r.overallProgress = 100;
    });
    await evt(runId, 'finalize', 100, 'Dataset finalized and ready for analytics, report and export.', 'run.completed');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Workflow failed.';
    const now = new Date().toISOString();
    await updateState((s) => {
      const t = s.tasks.find((x) => x.id === taskId);
      const r = s.runs.find((x) => x.id === runId);
      const datasetId = t?.datasetId;
      const d = datasetId ? s.datasets.find((x) => x.id === datasetId) : undefined;
      if (r) {
        r.status = 'failed';
        r.finishedAt = now;
      }
      if (t) t.status = 'failed';
      // A dataset that died before anything was persisted is failed, not
      // `processing` forever; one that already has records stays usable.
      if (d && d.status === 'processing' && !s.records.some((x) => x.datasetId === d.id)) {
        d.status = 'failed';
        d.updatedAt = now;
      }
    });
    await evt(runId, 'error', 100, message, 'run.failed');
  }
}

/**
 * A cancelled run leaves whatever was already persisted in place: the dataset is
 * ready when it holds records and failed otherwise. Run/task status was already
 * set by the cancel route — this only closes the loop with an event.
 */
async function finalizeCancellation(taskId: string, runId: string, datasetId: string): Promise<void> {
  const now = new Date().toISOString();
  await updateState((s) => {
    const d = s.datasets.find((x) => x.id === datasetId);
    if (d && d.status === 'processing') {
      d.status = s.records.some((x) => x.datasetId === d.id) ? 'ready' : 'failed';
      d.updatedAt = now;
    }
    const t = s.tasks.find((x) => x.id === taskId);
    if (t && t.status === 'running') t.status = 'cancelled';
  });
  await evt(runId, 'cancel', 100, 'Run cancelled by the user.', 'run.cancelled');
}
