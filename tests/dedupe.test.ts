import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { AUTO_MERGE_MIN_CONFIDENCE, HOST_ENTITY_KEY_LIMIT, dedupe } from '../lib/validation';
import { makeRecord, startupFields } from './helpers';

const FIELDS = startupFields;

describe('dedupe', () => {
  it('merges exact canonical keys and counts the removal', () => {
    const a = makeRecord({ title: 'Acme', fields: { company_name: 'Acme', website: 'https://acme.com' } });
    const b = makeRecord({ title: 'acme', fields: { company_name: 'acme', website: 'https://www.acme.com' } });
    a.canonicalKey = b.canonicalKey = 'acme|acme.com';

    const result = dedupe([a, b], FIELDS);
    assert.equal(result.rows.length, 1);
    assert.equal(result.removed, 1);
  });

  it('retains every source reference when merging', () => {
    const a = makeRecord({ id: 'rec_a', title: 'Acme', fields: { company_name: 'Acme', website: 'https://acme.com' }, confidence: 0.9 });
    const b = makeRecord({ id: 'rec_b', title: 'Acme', fields: { company_name: 'Acme', website: 'https://acme.com' }, confidence: 0.9 });
    a.canonicalKey = b.canonicalKey = 'acme|acme.com';

    const result = dedupe([a, b], FIELDS);
    assert.equal(result.rows[0].sources.length, 2, 'both evidence trails are kept');
  });

  it('unions list values on merge and keeps the kept row for scalars', () => {
    const a = makeRecord({ id: 'rec_a', title: 'Acme', fields: { company_name: 'Acme', website: 'https://acme.com', founders: ['Ann'] } });
    const b = makeRecord({ id: 'rec_b', title: 'Acme', fields: { company_name: 'Acme', website: 'https://acme.com', founders: ['Bo'], city: 'Mumbai' } });
    a.canonicalKey = b.canonicalKey = 'acme|acme.com';

    const result = dedupe([a, b], FIELDS);
    assert.deepEqual([...(result.rows[0].fields.founders as string[])].sort(), ['Ann', 'Bo']);
    assert.equal(result.rows[0].fields.city, 'Bengaluru', 'scalars keep the kept row');
  });

  it('refuses to merge a low-confidence exact key and reports it instead', () => {
    const a = makeRecord({ id: 'rec_a', title: 'Acme', fields: { company_name: 'Acme', website: 'https://acme.com' }, confidence: 0.9 });
    const b = makeRecord({ id: 'rec_b', title: 'Acme', fields: { company_name: 'Acme', website: 'https://acme.com' }, confidence: 0.3 });
    a.canonicalKey = b.canonicalKey = 'acme|acme.com';

    const result = dedupe([a, b], FIELDS);
    assert.equal(result.removed, 0, 'no silent merge below the confidence floor');
    assert.equal(result.rows.length, 2, 'both records are preserved');
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].incomingId, 'rec_b');
  });

  it('treats either side being below the floor as a non-merge', () => {
    const a = makeRecord({ id: 'rec_a', title: 'Acme', fields: { company_name: 'Acme', website: 'https://acme.com' }, confidence: 0.1 });
    const b = makeRecord({ id: 'rec_b', title: 'Acme', fields: { company_name: 'Acme', website: 'https://acme.com' }, confidence: 0.99 });
    a.canonicalKey = b.canonicalKey = 'acme|acme.com';

    const result = dedupe([a, b], FIELDS);
    assert.equal(result.removed, 0);
    assert.equal(result.candidates.length, 1);
  });

  it('merges at exactly the confidence floor', () => {
    const a = makeRecord({ id: 'rec_a', title: 'Acme', fields: { company_name: 'Acme', website: 'https://acme.com' }, confidence: AUTO_MERGE_MIN_CONFIDENCE });
    const b = makeRecord({ id: 'rec_b', title: 'Acme', fields: { company_name: 'Acme', website: 'https://acme.com' }, confidence: AUTO_MERGE_MIN_CONFIDENCE });
    a.canonicalKey = b.canonicalKey = 'acme|acme.com';

    const result = dedupe([a, b], FIELDS);
    assert.equal(result.removed, 1);
  });

  it('reports same-hostname/different-key pairs as candidates without merging', () => {
    const a = makeRecord({ id: 'rec_a', title: 'Acme Labs', fields: { company_name: 'Acme Labs', website: 'https://acme.com' } });
    const b = makeRecord({ id: 'rec_b', title: 'Acme Labs India', fields: { company_name: 'Acme Labs India', website: 'https://acme.com' } });

    const result = dedupe([a, b], FIELDS);
    assert.equal(result.rows.length, 2, 'rule 2 is a candidate, not an automatic merge');
    assert.ok(result.candidates.some((c) => /hostname/i.test(c.reason)));
  });

  it('reports fuzzy name matches in the same city without merging', () => {
    const a = makeRecord({ id: 'rec_a', title: 'Asterone', fields: { company_name: 'Asterone', website: 'https://asterone.com', city: 'Pune', founders: ['Ann Rao'] } });
    const b = makeRecord({ id: 'rec_b', title: 'Asterones', fields: { company_name: 'Asterones', website: 'https://asterones.io', city: 'Pune', founders: ['Ann Rao'] } });

    const result = dedupe([a, b], FIELDS);
    assert.equal(result.rows.length, 2);
    assert.ok(result.candidates.some((c) => /Similar name/i.test(c.reason)));
  });

  it('does not flag a similar name in the same city when no founder is shared', () => {
    const a = makeRecord({ id: 'rec_a', title: 'Asterone', fields: { company_name: 'Asterone', website: 'https://asterone.com', city: 'Pune', founders: ['Ann Rao'] } });
    const b = makeRecord({ id: 'rec_b', title: 'Asterones', fields: { company_name: 'Asterones', website: 'https://asterones.io', city: 'Pune', founders: ['Bo Kapoor'] } });

    const result = dedupe([a, b], FIELDS);
    assert.equal(result.candidates.length, 0, 'name similarity alone is too noisy to flag');
  });

  it('does not flag the same name in different cities', () => {
    const a = makeRecord({ id: 'rec_a', title: 'Asterone', fields: { company_name: 'Asterone', website: 'https://asterone.com', city: 'Pune', founders: ['Ann Rao'] } });
    const b = makeRecord({ id: 'rec_b', title: 'Asterone', fields: { company_name: 'Asterone', website: 'https://asterones.io', city: 'Delhi NCR', founders: ['Ann Rao'] } });

    const result = dedupe([a, b], FIELDS);
    assert.equal(result.candidates.length, 0);
  });

  it('ignores a hostname shared by many distinct entities', () => {
    // A directory/news/registry host identifies the publisher, not the company.
    const rows = Array.from({ length: HOST_ENTITY_KEY_LIMIT + 2 }, (_, i) =>
      makeRecord({
        id: `rec_${i}`,
        title: `Company Number ${i}`,
        fields: { company_name: `Company Number ${i}`, website: 'https://directory.test/listing', city: 'Pune', founders: [`Founder ${i}`] },
      }),
    );
    const result = dedupe(rows, FIELDS);
    assert.equal(result.removed, 0);
    assert.equal(result.candidates.length, 0, 'a shared host is not an identity signal');
  });

  it('does not merge on a shared founder alone', () => {
    const a = makeRecord({ id: 'rec_a', title: 'Acme', fields: { company_name: 'Acme', website: 'https://acme.com', founders: ['Ann'], city: 'Pune' } });
    const b = makeRecord({ id: 'rec_b', title: 'Globex', fields: { company_name: 'Globex', website: 'https://globex.com', founders: ['Ann'], city: 'Delhi NCR' } });

    const result = dedupe([a, b], FIELDS);
    assert.equal(result.rows.length, 2);
    assert.equal(result.removed, 0);
  });

  it('leaves genuinely distinct records alone', () => {
    const rows = [
      makeRecord({ title: 'Acme', fields: { company_name: 'Acme', website: 'https://acme.com' } }),
      makeRecord({ title: 'Globex', fields: { company_name: 'Globex', website: 'https://globex.com' } }),
      makeRecord({ title: 'Initech', fields: { company_name: 'Initech', website: 'https://initech.com' } }),
    ];
    const result = dedupe(rows, FIELDS);
    assert.equal(result.rows.length, 3);
    assert.equal(result.removed, 0);
    assert.equal(result.candidates.length, 0);
  });

  it('is a no-op on an empty list', () => {
    const result = dedupe([], FIELDS);
    assert.deepEqual(result, { rows: [], removed: 0, candidates: [] });
  });
});
