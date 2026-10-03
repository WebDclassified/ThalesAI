import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { coercePlan, endpoint, fallbackPlanFrom, parsePlanContent, planJsonSchema, stripReasoning, wantsJsonSchema } from '../lib/ai';

const VALID = {
  objective: 'Find AI startups in India that raised funding in 2026.',
  targetEntity: 'AI startup',
  geography: 'India',
  timeFilter: '2026',
  targetRecords: 50,
  fields: [{ key: 'company_name', label: 'Company name', required: true, type: 'string' }],
  sources: [{ name: 'Synthetic Source A', role: 'verification', priority: 'high' }],
  steps: [{ id: 'discover', label: 'Discover candidates' }],
  validationRules: [{ field: 'website', rule: 'valid_url' }],
};

describe('endpoint', () => {
  it('appends /chat/completions to a base URL', () => {
    assert.equal(endpoint('https://api.test/v1'), 'https://api.test/v1/chat/completions');
  });

  it('does not double-append when the path is already present', () => {
    assert.equal(endpoint('https://api.test/v1/chat/completions'), 'https://api.test/v1/chat/completions');
  });

  it('tolerates trailing slashes', () => {
    assert.equal(endpoint('https://api.test/v1///'), 'https://api.test/v1/chat/completions');
  });
});

describe('parsePlanContent', () => {
  it('parses bare JSON', () => {
    assert.deepEqual(parsePlanContent('{"a":1}'), { a: 1 });
  });

  it('strips markdown fences', () => {
    assert.deepEqual(parsePlanContent('```json\n{"a":1}\n```'), { a: 1 });
  });

  it('strips unlabelled fences', () => {
    assert.deepEqual(parsePlanContent('```\n{"a":1}\n```'), { a: 1 });
  });

  it('returns null for non-JSON', () => {
    assert.equal(parsePlanContent('sorry, I cannot help'), null);
  });
});

describe('coercePlan', () => {
  it('accepts a well-formed plan', () => {
    const plan = coercePlan(JSON.stringify(VALID));
    assert.ok(plan);
    assert.equal(plan!.targetRecords, 50);
  });

  it('recovers a plan embedded in surrounding prose', () => {
    const plan = coercePlan(`Here is the plan:\n${JSON.stringify(VALID)}\nHope that helps.`);
    assert.ok(plan);
    assert.equal(plan!.targetEntity, 'AI startup');
  });

  it('rejects a plan whose target count is out of bounds', () => {
    assert.equal(coercePlan(JSON.stringify({ ...VALID, targetRecords: 5000 })), null);
  });

  it('rejects a plan with a zero target count', () => {
    assert.equal(coercePlan(JSON.stringify({ ...VALID, targetRecords: 0 })), null);
  });

  it('rejects a plan with a malformed field key', () => {
    const bad = { ...VALID, fields: [{ key: 'Company Name!', label: 'x', required: true, type: 'string' }] };
    assert.equal(coercePlan(JSON.stringify(bad)), null);
  });

  it('rejects a plan with an unknown source priority', () => {
    const bad = { ...VALID, sources: [{ name: 'a', role: 'b', priority: 'critical' }] };
    assert.equal(coercePlan(JSON.stringify(bad)), null);
  });

  it('rejects too many sources', () => {
    const bad = {
      ...VALID,
      sources: Array.from({ length: 16 }, (_, i) => ({ name: `s${i}`, role: 'r', priority: 'low' })),
    };
    assert.equal(coercePlan(JSON.stringify(bad)), null);
  });

  it('rejects an empty field list', () => {
    assert.equal(coercePlan(JSON.stringify({ ...VALID, fields: [] })), null);
  });

  it('rejects arbitrary code returned in place of a plan', () => {
    assert.equal(coercePlan('function main(){ return 1; }'), null);
  });

  it('rejects an empty completion', () => {
    assert.equal(coercePlan(''), null);
  });
});

describe('strict JSON schema', () => {
  it('requires every property, including the optional concepts', () => {
    const schema = planJsonSchema() as { required: string[] };
    for (const key of ['objective', 'targetEntity', 'geography', 'timeFilter', 'targetRecords']) {
      assert.ok(schema.required.includes(key), `${key} must be required`);
    }
  });

  it('specifies items for every array so strict-mode providers accept it', () => {
    const schema = planJsonSchema() as {
      properties: Record<string, { type: string; items?: object }>;
    };
    for (const key of ['fields', 'sources', 'steps', 'validationRules']) {
      assert.ok(schema.properties[key].items, `${key} must define items`);
    }
  });

  it('closes over every nested object (additionalProperties: false everywhere)', () => {
    const walk = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const obj = node as Record<string, unknown>;
      if (obj.type === 'object') {
        assert.equal(obj.additionalProperties, false);
        assert.ok(Array.isArray(obj.required));
      }
      Object.values(obj).forEach(walk);
      if (Array.isArray(obj)) obj.forEach(walk);
    };
    walk(planJsonSchema());
  });
});

describe('stripReasoning', () => {
  it('removes a closed <think> block before the JSON', () => {
    const raw = '<think>the user wants plans</think>{"objective":"x"}';
    assert.deepEqual(parsePlanContent(raw), { objective: 'x' });
  });

  it('removes an unterminated <think> block entirely', () => {
    const raw = '<think>still reasoning about the requirement';
    assert.equal(stripReasoning(raw), '');
  });

  it('passes plain completions through untouched', () => {
    assert.equal(stripReasoning('{"a":1}'), '{"a":1}');
  });
});

describe('coercePlan normalisation', () => {
  it('turns empty optional strings into null', () => {
    const plan = coercePlan(
      JSON.stringify({ ...VALID, geography: '', timeFilter: '' }),
    );
    assert.ok(plan);
    assert.equal(plan!.geography, null);
    assert.equal(plan!.timeFilter, null);
  });

  it('salvages the second JSON object when the first is unparseable', () => {
    const noisy = `Sure! ${'{ broken json'}\n${JSON.stringify(VALID)}`;
    const plan = coercePlan(noisy);
    assert.ok(plan);
    assert.equal(plan!.targetRecords, 50);
  });
});

describe('wantsJsonSchema', () => {
  it('defaults to true when unset', () => {
    const previous = process.env.AI_JSON_SCHEMA;
    delete process.env.AI_JSON_SCHEMA;
    assert.equal(wantsJsonSchema(), true);
    if (previous !== undefined) process.env.AI_JSON_SCHEMA = previous;
  });

  it('honours an explicit false', () => {
    const previous = process.env.AI_JSON_SCHEMA;
    process.env.AI_JSON_SCHEMA = 'false';
    assert.equal(wantsJsonSchema(), false);
    if (previous === undefined) delete process.env.AI_JSON_SCHEMA;
    else process.env.AI_JSON_SCHEMA = previous;
  });
});

describe('fallbackPlanFrom', () => {
  it('returns a valid, bounded plan', () => {
    const plan = fallbackPlanFrom('Find AI startups in India that raised funding in 2026.');
    assert.equal(plan.targetRecords, 25, 'no stated count falls back to the default');
    assert.equal(plan.geography, 'India');
    assert.equal(plan.timeFilter, 'Filtered to 2026');
    assert.ok(plan.fields.length > 0);
  });

  it('reads a leading count from the prompt', () => {
    const plan = fallbackPlanFrom('Collect 120 companies from Europe.');
    assert.equal(plan.targetRecords, 120);
  });

  it('clamps an absurd count to the 500 ceiling', () => {
    const plan = fallbackPlanFrom('Find 99999 records.');
    assert.equal(plan.targetRecords, 500);
  });

  it('returns an independent plan on every call', () => {
    const first = fallbackPlanFrom('Find 7 companies.');
    const second = fallbackPlanFrom('Find 9 leads.');
    assert.notEqual(first.objective, second.objective);
    assert.equal(first.targetRecords, 7);
    assert.equal(second.targetRecords, 9);
  });

  it('keeps every derived field key slug-safe', () => {
    const plan = fallbackPlanFrom('Collect 5 teams in Spain. Include team name, home city and a website.');
    for (const field of plan.fields) {
      assert.match(field.key, /^[a-z][a-z0-9_]*$/);
    }
  });

  it('handles an empty prompt without throwing', () => {
    const plan = fallbackPlanFrom('');
    assert.equal(typeof plan.objective, 'string');
    assert.ok(plan.targetRecords >= 1);
  });
});
