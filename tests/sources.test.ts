import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { canonicalMapKey, projectFields } from '../lib/adapters/sources';
import { isDemoMode, registeredAdapters, resolveAdapterForPlan } from '../lib/adapters';
import type { CollectionRequest, PlanField, ResearchPlan } from '../lib/types';

const plan = (overrides: Partial<ResearchPlan> = {}): ResearchPlan => ({
  objective: overrides.objective ?? '',
  targetEntity: overrides.targetEntity ?? '',
  geography: overrides.geography ?? null,
  timeFilter: null,
  targetRecords: overrides.targetRecords ?? 25,
  fields: overrides.fields ?? [
    { key: 'job_title', label: 'Job title', required: true, type: 'text' },
    { key: 'company', label: 'Company', required: true, type: 'text' },
    { key: 'salary', label: 'Salary', required: true, type: 'money' },
    { key: 'location', label: 'Location', required: true, type: 'text' },
    { key: 'posted_date', label: 'Posted date', required: true, type: 'date' },
    { key: 'link', label: 'Link', required: true, type: 'url' },
    { key: 'source', label: 'Source', required: true, type: 'source' },
  ],
  sources: [],
  steps: [],
  validationRules: [],
});

describe('canonicalMapKey', () => {
  it('maps plan vocabulary onto adapter value pools', () => {
    assert.equal(canonicalMapKey('job_title'), 'title');
    assert.equal(canonicalMapKey('company_name'), 'company');
    assert.equal(canonicalMapKey('monthly_sponsorship_amount'), 'money');
    assert.equal(canonicalMapKey('posted_date'), 'date');
    assert.equal(canonicalMapKey('website'), 'url');
    assert.equal(canonicalMapKey('maintainer'), 'person');
    assert.equal(canonicalMapKey('stargazers_count'), 'number');
    assert.equal(canonicalMapKey('city'), 'location');
    assert.equal(canonicalMapKey('employment_type'), 'category');
  });
});

describe('projectFields', () => {
  it('projects canonical values onto the plan shape with kind coercion', () => {
    const fields: PlanField[] = [
      { key: 'job_title', label: 'Job title', required: true, type: 'text' },
      { key: 'salary', label: 'Salary', required: true, type: 'money' },
      { key: 'posted_date', label: 'Posted date', required: true, type: 'date' },
      { key: 'link', label: 'Link', required: true, type: 'url' },
      { key: 'source', label: 'Source', required: true, type: 'source' },
    ];
    const out = projectFields(
      {
        title: 'Senior React Engineer',
        money: '$62,500',
        date: '2026-01-04T10:00:00.000Z',
        url: 'example.test/job/1',
      },
      fields,
    );
    assert.equal(out.job_title, 'Senior React Engineer');
    assert.equal(out.salary, 62500, 'money strings become numbers');
    assert.equal(out.posted_date, '2026-01-04', 'dates are normalized to YYYY-MM-DD');
    assert.equal(out.link, 'https://example.test/job/1', 'bare hosts become URLs');
    assert.equal('source' in out, false, 'the evidence field is not projected as data');
  });

  it('keeps missing values empty rather than fabricating them', () => {
    const out = projectFields({ title: 'X' }, [
      { key: 'job_title', label: 'Job title', required: true, type: 'text' },
      { key: 'salary', label: 'Salary', required: true, type: 'money' },
    ]);
    assert.equal(out.job_title, 'X');
    assert.equal(out.salary, '');
  });

  it('coerces unix epoch dates (RemoteOK shape)', () => {
    const out = projectFields({ date: 1767225600 }, [
      { key: 'posted_date', label: 'Posted date', required: true, type: 'date' },
    ]);
    assert.equal(out.posted_date, '2026-01-01');
  });
});

describe('resolveAdapterForPlan', () => {
  const original = process.env.DEMO_MODE;

  function withDemoMode(value: string | undefined, run: () => void): void {
    if (value === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = value;
    try {
      run();
    } finally {
      if (original === undefined) delete process.env.DEMO_MODE;
      else process.env.DEMO_MODE = original;
    }
  }

  it('routes job requirements to the live job boards', () => {
    withDemoMode('false', () => {
      const resolved = resolveAdapterForPlan(
        plan({ targetEntity: 'backend developer job openings', objective: 'Find 25 backend developer job openings in Europe.' }),
      );
      assert.equal(resolved.adapter.id, 'live-jobs');
      assert.equal(resolved.mode, 'live');
    });
  });

  it('routes sponsor requirements to GitHub', () => {
    withDemoMode('false', () => {
      const resolved = resolveAdapterForPlan(
        plan({ targetEntity: 'GitHub sponsor opportunities', objective: 'Find 15 sponsor opportunities.' }),
      );
      assert.equal(resolved.adapter.id, 'live-github-sponsors');
    });
  });

  it('routes market-data requirements to CoinGecko', () => {
    withDemoMode('false', () => {
      const resolved = resolveAdapterForPlan(
        plan({ targetEntity: 'cryptocurrency market data', objective: 'Collect the top crypto coins by market cap.' }),
      );
      assert.equal(resolved.adapter.id, 'live-market');
    });
  });

  it('falls back to the synthetic adapter for unmatched requirements', () => {
    withDemoMode('false', () => {
      const resolved = resolveAdapterForPlan(
        plan({ targetEntity: 'recipes', objective: 'Find pasta recipes.' }),
      );
      assert.equal(resolved.adapter.id, 'synthetic-demo');
      assert.equal(resolved.mode, 'demo');
    });
  });

  it('DEMO_MODE=true forces synthetic collection for every requirement', () => {
    withDemoMode('true', () => {
      const resolved = resolveAdapterForPlan(plan({ targetEntity: 'job openings' }));
      assert.equal(resolved.adapter.id, 'synthetic-demo');
      assert.equal(resolved.mode, 'demo');
    });
  });

  it('registers four adapters including the synthetic fallback', () => {
    const ids = registeredAdapters().map((a) => a.id);
    assert.ok(ids.includes('live-jobs'));
    assert.ok(ids.includes('live-github-sponsors'));
    assert.ok(ids.includes('live-market'));
    assert.ok(ids.includes('synthetic-demo'));
  });

  it('live adapters declare themselves live; demo does not', () => {
    for (const adapter of registeredAdapters()) {
      assert.equal(adapter.live, adapter.id !== 'synthetic-demo');
    }
  });

  it('DEMO_MODE defaults to live sources when unset', () => {
    withDemoMode(undefined, () => {
      assert.equal(isDemoMode(), false);
    });
  });
});

describe('live adapter request contract', () => {
  it('accepts any CollectionRequest shape (plan-driven, dataset-scoped)', () => {
    const request: CollectionRequest = {
      runId: 'run_x',
      datasetId: 'ds_demo',
      plan: plan(),
      targetRecords: 25,
    };
    assert.equal(request.plan.fields.length > 0, true);
  });
});
