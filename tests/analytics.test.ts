import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { formatMoney, summarizeDataset } from '../lib/analytics';
import { makeRecord, startupFields } from './helpers';

const FIELDS = startupFields;

describe('summarizeDataset', () => {
  it('counts statuses and source groups', () => {
    const rows = [
      makeRecord({ title: 'Alpha', fields: { company_name: 'Alpha', latest_round: 'Seed', city: 'Bengaluru' } }),
      makeRecord({ title: 'Beta', fields: { company_name: 'Beta', latest_round: 'Seed', city: 'Bengaluru' } }),
      makeRecord({ title: 'Gamma', fields: { company_name: 'Gamma', latest_round: 'Series A', city: 'Mumbai' } }),
      makeRecord({ title: 'Delta', fields: { company_name: 'Delta', latest_round: 'Series B', city: 'Mumbai' }, status: 'review' }),
      makeRecord({ title: 'Epsilon', fields: { company_name: 'Epsilon', latest_round: 'Seed', city: '' }, status: 'invalid' }),
    ];
    const s = summarizeDataset(rows, FIELDS);
    assert.equal(s.recordCount, 5);
    assert.equal(s.validCount, 3);
    assert.equal(s.reviewCount, 1);
    assert.equal(s.invalidCount, 1);
    assert.equal(s.sourceGroups, 1);
  });

  it('builds category tallies from low-cardinality text fields', () => {
    const rows = [
      makeRecord({ fields: { latest_round: 'Seed' } }),
      makeRecord({ fields: { latest_round: 'Seed' } }),
      makeRecord({ fields: { latest_round: 'Series A' } }),
    ];
    const s = summarizeDataset(rows, FIELDS);
    const rounds = s.categories.find((c) => c.key === 'latest_round');
    assert.ok(rounds);
    assert.deepEqual(
      rounds.items.map((i) => i.label),
      ['Seed', 'Series A'],
    );
    assert.ok(Math.abs(rounds.items[0].share - 2 / 3) < 1e-9);
  });

  it('skips high-cardinality fields as categories', () => {
    const rows = Array.from({ length: 20 }, (_, i) => makeRecord({ fields: { company_name: `Company ${i}` } }));
    const s = summarizeDataset(rows, FIELDS);
    assert.ok(!s.categories.some((c) => c.key === 'company_name'));
  });

  it('summarizes numeric fields with totals and medians', () => {
    const rows = [
      makeRecord({ fields: { funding_amount: 1_000_000 } }),
      makeRecord({ fields: { funding_amount: 2_000_000 } }),
      makeRecord({ fields: { funding_amount: 3_000_000 } }),
      makeRecord({ fields: { funding_amount: 10_000_000 } }),
    ];
    const s = summarizeDataset(rows, FIELDS);
    assert.equal(s.numerics.length, 1);
    const funding = s.numerics[0];
    assert.equal(funding.key, 'funding_amount');
    assert.equal(funding.total, 16_000_000);
    assert.equal(funding.median, 2_500_000);
  });

  it('ignores non-finite numeric values', () => {
    const rows = [
      makeRecord({ fields: { funding_amount: Number.NaN } }),
      makeRecord({ fields: { funding_amount: 2_000_000 } }),
    ];
    const s = summarizeDataset(rows, FIELDS);
    assert.equal(s.numerics[0].total, 2_000_000);
    // Non-finite values are excluded from the sample rather than zero-filled.
    assert.equal(s.numerics[0].median, 2_000_000);
  });

  it('returns empty aggregations for an empty dataset', () => {
    const s = summarizeDataset([], FIELDS);
    assert.equal(s.recordCount, 0);
    assert.equal(s.numerics[0].total, 0);
    assert.deepEqual(s.categories, []);
  });
});

describe('formatMoney', () => {
  it('scales the unit to the magnitude', () => {
    assert.equal(formatMoney(4_200_000), '$4.2M');
    assert.equal(formatMoney(85_000), '$85k');
    assert.equal(formatMoney(0), '$0');
    assert.equal(formatMoney(2_500_000_000), '$2.5B');
  });
});
