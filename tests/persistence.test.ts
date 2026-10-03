import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * Persistence and crash-recovery tests run against a throwaway DATA_DIR.
 * The db module resolves DATA_DIR at import time, so the dynamic import happens
 * after the environment is set. The node:test runner isolates test files in
 * separate processes, so this does not leak into other suites.
 */
let db: typeof import('../lib/db');
let recovery: typeof import('../lib/recovery');
let dataDir: string;

before(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'thalesai-test-'));
  process.env.DATA_DIR = dataDir;
  db = await import('../lib/db');
  recovery = await import('../lib/recovery');
});

const reconcile = () => recovery.reconcileRuns();

async function seedOrphanRun(withRecords: boolean): Promise<{ runId: string; datasetId: string }> {
  const datasetId = db.id('ds');
  const taskId = db.id('task');
  const runId = db.id('run');
  await db.updateState((s) => {
    s.tasks.push({
      id: taskId,
      name: 'Orphan',
      prompt: 'A prompt long enough.',
      status: 'running',
      targetRecords: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      datasetId,
      latestRunId: runId,
    });
    s.runs.push({
      id: runId,
      taskId,
      status: 'running',
      startedAt: new Date().toISOString(),
      overallProgress: 40,
      recordsDiscovered: 5,
      recordsExtracted: 5,
      recordsValidated: 0,
      duplicatesRemoved: 0,
    });
    s.datasets.push({
      id: datasetId,
      taskId,
      name: 'Orphan dataset',
      status: 'processing',
      recordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (withRecords) {
      s.records.push({
        id: db.id('rec'),
        datasetId,
        title: 'X',
        fields: { company_name: 'X' },
        canonicalKey: 'x|x',
        confidence: 0.9,
        status: 'valid',
        sources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  });
  return { runId, datasetId };
}

describe('recovery', () => {
  it('marks stranded runs failed and keeps datasets that already hold records', async () => {
    const { runId, datasetId } = await seedOrphanRun(true);
    await reconcile();

    const s = await db.readState();
    const run = s.runs.find((r) => r.id === runId);
    assert.equal(run?.status, 'failed');
    assert.ok(run?.finishedAt);

    const event = s.events.find((e) => e.runId === runId && e.type === 'run.interrupted');
    assert.ok(event, 'an interrupted event explains the failure');

    const task = s.tasks.find((t) => t.id === run.taskId);
    assert.equal(task?.status, 'failed');

    const dataset = s.datasets.find((d) => d.id === datasetId);
    // Records were persisted before the crash, so the data stays usable.
    assert.equal(dataset?.status, 'ready');
  });

  it('fails empty datasets left processing by an interrupted run', async () => {
    const { runId, datasetId } = await seedOrphanRun(false);
    await reconcile();

    const s = await db.readState();
    const run = s.runs.find((r) => r.id === runId);
    assert.equal(run?.status, 'failed');
    assert.equal(s.datasets.find((d) => d.id === datasetId)?.status, 'failed');
  });

  it('is idempotent', async () => {
    await seedOrphanRun(false);
    await reconcile();
    const first = (await db.readState()).events.filter((e) => e.type === 'run.interrupted').length;
    await reconcile();
    const second = (await db.readState()).events.filter((e) => e.type === 'run.interrupted').length;
    assert.equal(first, second);
  });
});

describe('state store', () => {
  it('falls back to the backup when the primary file is corrupt', async () => {
    await seedOrphanRun(true);
    const before = await db.readState();
    assert.ok(before.runs.length > 0, 'backup was written on update');

    await fs.writeFile(path.join(dataDir, 'state.json'), '{corrupt', 'utf8');
    const after = await db.readState();
    assert.equal(after.runs.length, before.runs.length);
    assert.equal(after.tasks.length, before.tasks.length);
  });

  it('resetState clears every collection', async () => {
    await seedOrphanRun(true);
    await db.resetState();
    const s = await db.readState();
    for (const key of ['tasks', 'runs', 'events', 'datasets', 'records', 'issues', 'reports'] as const) {
      assert.equal(s[key].length, 0, `${key} should be empty`);
    }
  });
});
