import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { fallbackPlanFrom } from '../lib/ai';
import { createDemoRecords } from '../lib/adapters/demo-adapter';
import { dedupe, validate } from '../lib/validation';

/**
 * End-to-end pipeline check over a NON-startup domain: the deterministic planner
 * designs a plan from a job-openings requirement, the demo adapter generates
 * records from that plan, and validation/dedupe consume them without any
 * startup-specific knowledge.
 */
const JOB_PROMPT =
  'Find 30 remote React developer job openings in Europe. Include job title, company, ' +
  'salary, location, posted date and link.';

describe('job-openings pipeline (dynamic schema)', () => {
  const plan = fallbackPlanFrom(JOB_PROMPT);

  it('designs a plan for the requirement, not a fixed domain', () => {
    assert.equal(plan.targetRecords, 30);
    assert.equal(plan.targetEntity, 'remote React developer job openings');
    assert.equal(plan.geography, 'Europe');
    const keys = plan.fields.map((f) => f.key);
    assert.ok(keys.includes('job_title'));
    assert.ok(keys.includes('company'));
    assert.ok(keys.includes('salary'));
    assert.ok(keys.includes('location'));
    assert.ok(keys.includes('posted_date'));
    assert.ok(keys.includes('source'), 'evidence field is always present');
    const salary = plan.fields.find((f) => f.key === 'salary');
    assert.equal(salary?.type, 'money');
    const link = plan.fields.find((f) => f.key === 'link');
    assert.ok(link, 'the link field is recognized');
    assert.equal(link?.type, 'url');
  });

  it('collects, validates and deduplicates records in that shape', () => {
    const rows = createDemoRecords('ds_jobs_test', plan.fields, plan.targetRecords, plan.targetEntity);
    assert.ok(rows.length >= 25, 'the adapter honours (a clamped) target');
    for (const row of rows) {
      assert.ok(row.title, 'every record has a display title');
      assert.ok(Object.keys(row.fields).includes('salary'));
    }

    const deduped = dedupe(rows, plan.fields);
    assert.ok(deduped.removed >= 1, 'the planted duplicate is merged');
    assert.ok(deduped.rows.length < rows.length);

    for (const row of deduped.rows) validate(row, plan.fields);
    assert.ok(deduped.rows.every((r) => r.status !== 'invalid'), 'defects degrade to review, not invalid');
    assert.ok(deduped.rows.some((r) => r.status === 'review'), 'planted defects reach the review queue');
    const withSalary = deduped.rows.filter((r) => typeof r.fields.salary === 'number' && (r.fields.salary as number) > 0);
    assert.ok(withSalary.length > 0);
  });
});

describe('startup pipeline (demo prompt, dynamic schema)', () => {
  const plan = fallbackPlanFrom(
    'Find 50 AI startups in India that raised funding in 2026. Include company name, ' +
      'founders, funding amount, latest round, website, city and a source for every record.',
  );

  it('derives the startup field set from the include clause', () => {
    assert.equal(plan.targetRecords, 50);
    assert.equal(plan.geography, 'India');
    const keys = plan.fields.map((f) => f.key);
    for (const key of ['company_name', 'founders', 'funding_amount', 'latest_round', 'website', 'city', 'source']) {
      assert.ok(keys.includes(key), `${key} is in the plan`);
    }
    assert.ok(plan.fields.find((f) => f.key === 'founders')?.type === 'list');
    assert.ok(plan.fields.find((f) => f.key === 'funding_amount')?.type === 'money');
  });

  it('produces validatable records', () => {
    const rows = createDemoRecords('ds_startups_test', plan.fields, 50, plan.targetEntity);
    const deduped = dedupe(rows, plan.fields);
    for (const row of deduped.rows) validate(row, plan.fields);
    assert.ok(deduped.rows.some((r) => r.status === 'valid'));
    assert.ok(deduped.rows.every((r) => r.fields.funding_amount !== undefined));
  });
});
