import type { AppState, ValidationIssue } from './types';

/**
 * Human review resolution.
 *
 * A pure state mutation so it is unit-testable; the API route wraps it in
 * `updateState`. Rules:
 *   - resolving the last open issue on a record means the reviewer accepted it,
 *     so the record becomes `valid` (confidence is never touched — the number
 *     stays an honest machine estimate);
 *   - reopening an issue puts the record back into `review`;
 *   - when a task's dataset has no open issues left, the task leaves the
 *     `review` state and completes.
 */

export type ResolutionResult =
  | { ok: true; issue: ValidationIssue }
  | { ok: false; error: 'not_found' };

export function applyResolution(
  state: AppState,
  issueId: string,
  resolved: boolean,
): ResolutionResult {
  const issue = state.issues.find((i) => i.id === issueId);
  if (!issue) return { ok: false, error: 'not_found' };

  const now = new Date().toISOString();
  issue.status = resolved ? 'resolved' : 'open';
  issue.resolvedAt = resolved ? now : undefined;
  if (resolved) issue.resolution = issue.resolution || 'Accepted by reviewer';

  const record = state.records.find((r) => r.id === issue.recordId);
  if (record) {
    const openLeft = state.issues.some((i) => i.recordId === record.id && i.status === 'open');
    if (resolved && !openLeft && record.status !== 'invalid') {
      record.status = 'valid';
      record.updatedAt = now;
    } else if (!resolved && record.status === 'valid') {
      record.status = 'review';
      record.updatedAt = now;
    }

    const task = state.tasks.find((t) => t.datasetId === record.datasetId);
    if (task && task.status === 'review') {
      const recordIds = new Set(
        state.records.filter((r) => r.datasetId === record.datasetId).map((r) => r.id),
      );
      const anyOpen = state.issues.some(
        (i) => recordIds.has(i.recordId) && i.status === 'open',
      );
      if (!anyOpen) {
        task.status = 'completed';
        task.updatedAt = now;
      }
    }
  }

  return { ok: true, issue };
}
