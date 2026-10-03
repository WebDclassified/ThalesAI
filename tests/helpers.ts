import type { PlanField, RecordData } from '../lib/types';

/** Startup-domain plan fields, mirroring what the fallback planner derives from the demo prompt. */
export const startupFields: PlanField[] = [
  { key: 'company_name', label: 'Company name', required: true, type: 'text' },
  { key: 'founders', label: 'Founders', required: true, type: 'list' },
  { key: 'funding_amount', label: 'Funding amount', required: true, type: 'money' },
  { key: 'latest_round', label: 'Latest round', required: true, type: 'text' },
  { key: 'website', label: 'Website', required: true, type: 'url' },
  { key: 'city', label: 'City', required: true, type: 'text' },
  { key: 'source', label: 'Source', required: true, type: 'source' },
];

let counter = 0;

export function makeRecord(overrides: Partial<RecordData> = {}): RecordData {
  counter += 1;
  const n = counter;
  const fields = {
    company_name: overrides.title ?? `Company ${n}`,
    founders: ['Founder One'],
    funding_amount: 5_000_000,
    latest_round: 'Series A',
    website: `https://example.test/company-${n}`,
    city: 'Bengaluru',
    ...overrides.fields,
  };
  return {
    id: overrides.id ?? `rec_test_${n}`,
    datasetId: overrides.datasetId ?? 'ds_test',
    title: overrides.title ?? `Company ${n}`,
    fields,
    canonicalKey: overrides.canonicalKey ?? '',
    confidence: overrides.confidence ?? 0.92,
    status: overrides.status ?? 'valid',
    sources: overrides.sources ?? [
      {
        id: `src_test_${n}`,
        name: 'Synthetic Source A',
        url: `https://demo.invalid/source-a/${n}`,
        title: `synthetic record ${n}`,
        provider: 'synthetic-demo',
        fetchedAt: new Date(0).toISOString(),
        evidence: { company_name: `Company ${n}` },
      },
    ],
    createdAt: overrides.createdAt ?? new Date(0).toISOString(),
    updatedAt: overrides.updatedAt ?? new Date(0).toISOString(),
  };
}
