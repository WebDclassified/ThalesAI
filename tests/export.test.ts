import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { exportColumns, exportFilename, exportGuard, renderExport, toCsv, toJson } from '../lib/export';
import { makeRecord, startupFields } from './helpers';
import type { Dataset } from '../lib/types';

const DATASET: Dataset = {
  id: 'ds_test',
  taskId: 'task_test',
  name: 'Test dataset',
  status: 'ready',
  recordCount: 0,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

const COLUMNS = exportColumns(startupFields);

describe('toCsv', () => {
  it('emits a header and one line per record', () => {
    const csv = toCsv([makeRecord(), makeRecord()], COLUMNS);
    const lines = csv.trim().split('\n');
    assert.equal(lines.length, 3);
    assert.equal(lines[0], COLUMNS.join(','));
    assert.ok(lines[0].startsWith('company_name'));
    assert.ok(lines[0].endsWith('status,confidence'));
  });

  it('ends with a trailing newline', () => {
    assert.ok(toCsv([], COLUMNS).endsWith('\n'));
  });

  it('quotes and escapes embedded double quotes', () => {
    const csv = toCsv([makeRecord({ title: 'Say "Hi" Ltd', fields: { company_name: 'Say "Hi" Ltd' } })], COLUMNS);
    assert.ok(csv.includes('"Say ""Hi"" Ltd"'));
  });

  it('escapes array fields too, not just scalars', () => {
    const csv = toCsv([makeRecord({ fields: { founders: ['Ann, PhD', 'Bo "The Builder"'] } })], COLUMNS);
    const row = csv.trim().split('\n')[1];
    assert.ok(row.includes('"Ann, PhD; Bo ""The Builder"""'));
  });

  it('neutralises spreadsheet formula injection', () => {
    const csv = toCsv([makeRecord({ title: '=cmd|calc!A1', fields: { company_name: '=cmd|calc!A1' } })], COLUMNS);
    assert.ok(csv.includes(`"'=cmd|calc!A1"`));
  });

  it('neutralises leading + and @ as well', () => {
    assert.ok(toCsv([makeRecord({ title: '+1 555 0100', fields: { company_name: '+1 555 0100' } })], COLUMNS).includes(`"'+1 555 0100"`));
    assert.ok(toCsv([makeRecord({ title: '@handle', fields: { company_name: '@handle' } })], COLUMNS).includes(`"'@handle"`));
  });

  it('renders missing values as empty quoted cells', () => {
    const csv = toCsv([makeRecord({ fields: { city: '', latest_round: '' } })], COLUMNS);
    const row = csv.trim().split('\n')[1];
    assert.ok(row.includes('""'));
  });

  it('keeps one record on one line', () => {
    const csv = toCsv([makeRecord({ title: 'Multi\nLine Co', fields: { company_name: 'Multi\nLine Co' } })], COLUMNS);
    assert.equal(csv.trim().split('\n').length, 2);
  });
});

describe('toJson', () => {
  it('includes the dataset and its records', () => {
    const parsed = JSON.parse(toJson(DATASET, [makeRecord()]));
    assert.equal(parsed.dataset.id, 'ds_test');
    assert.equal(parsed.records.length, 1);
  });
});

describe('exportFilename', () => {
  it('builds a controlled filename from the dataset id', () => {
    assert.equal(exportFilename('ds_test', 'csv'), 'thalesai-ds_test.csv');
  });

  it('strips characters that are unsafe in a filename', () => {
    const name = exportFilename('ds_../../etc/passwd', 'json');
    assert.equal(name, 'thalesai-ds_etcpasswd.json');
    assert.ok(!name.includes('/'));
    assert.ok(!name.includes('\\'));
    assert.ok(!name.includes('..'));
  });

  it('falls back to a default when nothing survives sanitising', () => {
    assert.equal(exportFilename('///', 'csv'), 'thalesai-dataset.csv');
  });
});

describe('exportGuard', () => {
  it('refuses a dataset that is not ready', () => {
    const guard = exportGuard({ ...DATASET, status: 'processing' }, [makeRecord()]);
    assert.equal(guard.ok, false);
    if (!guard.ok) {
      assert.equal(guard.status, 409);
      assert.equal(guard.code, 'DATASET_NOT_READY');
    }
  });

  it('refuses a missing dataset', () => {
    const guard = exportGuard(undefined, []);
    assert.equal(guard.ok, false);
    if (!guard.ok) assert.equal(guard.status, 404);
  });

  it('refuses a ready but empty dataset', () => {
    const guard = exportGuard(DATASET, []);
    assert.equal(guard.ok, false);
    if (!guard.ok) assert.equal(guard.status, 422);
  });

  it('allows a ready dataset with records', () => {
    assert.equal(exportGuard(DATASET, [makeRecord()]).ok, true);
  });
});

describe('renderExport', () => {
  it('renders CSV with the right content type and filename', () => {
    const file = renderExport(DATASET, [makeRecord()], 'csv', startupFields);
    assert.equal(file.contentType, 'text/csv; charset=utf-8');
    assert.equal(file.filename, 'thalesai-ds_test.csv');
    assert.ok(file.body.includes('company_name'));
  });

  it('renders JSON with the right content type and filename', () => {
    const file = renderExport(DATASET, [makeRecord()], 'json', startupFields);
    assert.equal(file.contentType, 'application/json; charset=utf-8');
    assert.equal(file.filename, 'thalesai-ds_test.json');
    assert.doesNotThrow(() => JSON.parse(file.body));
  });
});
