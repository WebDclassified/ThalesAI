import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { applyResolution } from '../lib/review';
import type { AppState, Task, ValidationIssue } from '../lib/types';
import { makeRecord } from './helpers';

function issue(id: string, recordId: string, status: 'open' | 'resolved' = 'open'): ValidationIssue {
  return {
    id,
    recordId,
    type: 'validation',
    field: 'city',
    message: 'City is missing.',
    severity: 'warning',
    status,
    createdAt: new Date(0).toISOString(),
  };
}

function task(id: string, datasetId: string, status: Task['status']): Task {
  return {
    id,
    name: 'Task',
    prompt: 'A prompt long enough.',
    status,
    targetRecords: 10,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    datasetId,
  };
}

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    tasks: [],
    runs: [],
    events: [],
    datasets: [],
    records: [],
    issues: [],
    reports: [],
    ...overrides,
  };
}

describe('applyResolution', () => {
  it('resolves an issue and marks the record valid when nothing is left open', () => {
    const record = makeRecord({ status: 'review' });
    const s = state({
      records: [record],
      issues: [issue('i1', record.id)],
      tasks: [task('t1', record.datasetId, 'review')],
    });

    const result = applyResolution(s, 'i1', true);
    assert.ok(result.ok);
    assert.equal(s.issues[0].status, 'resolved');
    assert.ok(s.issues[0].resolvedAt);
    assert.equal(record.status, 'valid');
    // Resolving is a human decision, not new evidence: confidence is untouched.
    assert.equal(record.confidence, 0.92);
    // The task leaves the review state once its dataset has no open issues.
    assert.equal(s.tasks[0].status, 'completed');
  });

  it('keeps the record in review while other issues remain open', () => {
    const record = makeRecord({ status: 'review' });
    const s = state({
      records: [record],
      issues: [issue('i1', record.id), issue('i2', record.id)],
      tasks: [task('t1', record.datasetId, 'review')],
    });

    const result = applyResolution(s, 'i1', true);
    assert.ok(result.ok);
    assert.equal(record.status, 'review');
    assert.equal(s.tasks[0].status, 'review');
  });

  it('never promotes an invalid record to valid', () => {
    const record = makeRecord({ status: 'invalid', confidence: 0.1 });
    const s = state({
      records: [record],
      issues: [issue('i1', record.id)],
    });

    const result = applyResolution(s, 'i1', true);
    assert.ok(result.ok);
    assert.equal(record.status, 'invalid');
  });

  it('reopening puts a valid record back into review', () => {
    const record = makeRecord({ status: 'valid' });
    const s = state({
      records: [record],
      issues: [issue('i1', record.id, 'resolved')],
      tasks: [task('t1', record.datasetId, 'completed')],
    });

    const result = applyResolution(s, 'i1', false);
    assert.ok(result.ok);
    assert.equal(s.issues[0].status, 'open');
    assert.equal(record.status, 'review');
  });

  it('returns not_found for an unknown issue', () => {
    const result = applyResolution(state(), 'missing', true);
    assert.deepEqual(result, { ok: false, error: 'not_found' });
  });
});
