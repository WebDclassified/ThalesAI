import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { LOW_CONFIDENCE_THRESHOLD, validate } from '../lib/validation';
import { makeRecord, startupFields } from './helpers';

describe('validate', () => {
  it('marks a complete, evidenced record valid', () => {
    const record = makeRecord();
    const findings = validate(record, startupFields);
    assert.deepEqual(findings, []);
    assert.equal(record.status, 'valid');
    assert.ok(record.canonicalKey.length > 0);
  });

  it('marks a record with no identifying value invalid', () => {
    const record = makeRecord({ title: '   ', fields: { company_name: '   ' } });
    const findings = validate(record, startupFields);
    assert.equal(record.status, 'invalid');
    assert.equal(findings[0].field, 'company_name');
    assert.ok(record.confidence <= 0.3, 'confidence is capped for unusable records');
  });

  it('flags a missing city for review', () => {
    const record = makeRecord({ fields: { city: '' } });
    const findings = validate(record, startupFields);
    assert.equal(record.status, 'review');
    assert.ok(findings.some((f) => f.field === 'city' && f.severity === 'warning'));
  });

  it('flags an unparseable website for review', () => {
    const record = makeRecord({ fields: { website: 'nope' } });
    const findings = validate(record, startupFields);
    assert.equal(record.status, 'review');
    assert.ok(findings.some((f) => f.field === 'website'));
  });

  it('flags a negative funding amount as an error', () => {
    const record = makeRecord({ fields: { funding_amount: -1 } });
    const findings = validate(record, startupFields);
    assert.equal(record.status, 'review');
    assert.ok(findings.some((f) => f.field === 'funding_amount' && f.severity === 'error'));
  });

  it('flags missing evidence', () => {
    const record = makeRecord({ sources: [] });
    const findings = validate(record, startupFields);
    assert.equal(record.status, 'review');
    assert.ok(findings.some((f) => f.field === 'source'));
  });

  it('flags an empty founder list as a warning', () => {
    const record = makeRecord({ fields: { founders: [] } });
    const findings = validate(record, startupFields);
    assert.equal(record.status, 'review');
    assert.ok(findings.some((f) => f.field === 'founders' && f.severity === 'warning'));
  });

  it('flags low confidence even when every field is present', () => {
    const record = makeRecord({ confidence: LOW_CONFIDENCE_THRESHOLD - 0.1 });
    const findings = validate(record, startupFields);
    assert.equal(record.status, 'review');
    assert.ok(findings.some((f) => f.field === 'confidence'));
  });

  it('never inflates confidence to hide a problem', () => {
    const record = makeRecord({ fields: { city: '' }, confidence: 0.95 });
    validate(record, startupFields);
    assert.equal(record.confidence, 0.72);
  });

  it('orders findings most severe first', () => {
    const record = makeRecord({ title: '', fields: { company_name: '', city: '' } });
    const findings = validate(record, startupFields);
    assert.equal(findings[0].severity, 'error');
  });

  it('derives the canonical key onto the record', () => {
    const record = makeRecord();
    validate(record, startupFields);
    assert.equal(record.canonicalKey, `${record.title.toLowerCase()}|example.test`);
  });

  it('rejects a malformed email-shaped field', () => {
    const jobFields = [
      { key: 'job_title', label: 'Job title', required: true, type: 'text' },
      { key: 'contact_email', label: 'Contact email', required: true, type: 'email' },
      { key: 'source', label: 'Source', required: true, type: 'source' },
    ];
    const record = makeRecord({ title: 'Engineer', fields: { job_title: 'Engineer', contact_email: 'nope' } });
    const findings = validate(record, jobFields);
    assert.ok(findings.some((f) => f.field === 'contact_email'));
  });
});
