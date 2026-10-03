import type { CollectionRequest, CollectionResult, PlanField, RecordData, SourceAdapter, SourceRef } from '../types';
import { fieldKind, primaryField } from '../plan-fields';

/**
 * The deterministic demo adapter.
 *
 * Records are generated from the plan's own fields, so any requirement — job
 * openings, sales leads, startups, anything — produces a plausible synthetic
 * dataset instead of a hardcoded one. Every value is synthetic: hostnames use
 * `demo.invalid`, a reserved TLD (RFC 2606) that can never resolve, and each
 * source is labelled `synthetic-demo`. These records are prototype scaffolding
 * and must never be presented as live external evidence.
 */

export const DEMO_DOMAIN = 'demo.invalid';
export const DEMO_PROVIDER = 'synthetic-demo';
export const DEMO_MAX_RECORDS = 50;
export const DEMO_MIN_RECORDS = 10;

const CITIES = [
  'Bengaluru', 'Delhi NCR', 'Mumbai', 'Hyderabad', 'Pune',
  'Gurugram', 'Chennai', 'Noida', 'Ahmedabad', 'Kolkata',
];
const ROUNDS = ['Seed', 'Series A', 'Series B', 'Series C'];
const CATEGORIES = ['Software', 'Fintech', 'Healthcare', 'Education', 'Logistics', 'Energy', 'Retail', 'Media'];
const EMPLOYMENT = ['Full-time', 'Remote', 'Hybrid', 'Contract'];
const PERSON_NAMES = [
  'Arjun Mehta', 'Priya Sharma', 'Rohan Verma', 'Ananya Gupta', 'Karan Jain',
  'Neha Kapoor', 'Vikram Singh', 'Sanya Rao', 'Rahul Malhotra', 'Ishita Nair',
];
const DESCRIPTIONS = [
  'High-growth organisation with a strong regional footprint.',
  'Well-funded player expanding its core product line.',
  'Owner-operated business with steady year-over-year revenue.',
  'Early-stage venture backed by a regional accelerator.',
  'Established enterprise customer base across three markets.',
  'Fast-moving team operating a subscription-first model.',
];
const PREFIXES = [
  'Aster', 'Nova', 'Vision', 'Green', 'Health',
  'FinSight', 'Cloud', 'Quant', 'Route', 'Forge',
];
const SUFFIXES = ['Quantum', 'Vector', 'Signal', 'Pulse', 'Orbit'];
const ORG_SUFFIX = ['Labs', 'Group', 'Technologies', 'Systems', 'Works'];
const JOB_SENIORITY = ['Senior', 'Lead', 'Staff', 'Principal', 'Associate'];
const JOB_ROLES = ['React Engineer', 'Data Analyst', 'ML Engineer', 'Product Manager', 'DevOps Engineer'];

/**
 * Deterministic quality defects so the validation and review paths have real input.
 * These are baked into generation rather than injected after the fact, so the dataset
 * contains genuinely imperfect records that `validate()` has to discover.
 */
const DEFECT_MISSING = 4;
const DEFECT_LOW_CONFIDENCE = 17;
const DEFECT_EMPTY_LIST = 29;
const DEFECT_ZERO_MONEY = 41;

function scope(datasetId: string): string {
  return datasetId.replace(/^ds_/, '') || 'default';
}

function sourceRef(dataset: string, index: number, sourceSlot: number, evidence: Record<string, string>): SourceRef {
  const name = SOURCE_NAMES[sourceSlot % SOURCE_NAMES.length];
  const slug = name.toLowerCase().replaceAll(' ', '-');
  return {
    id: `src_${dataset}_${index + 1}`,
    name,
    url: `https://${DEMO_DOMAIN}/${slug}/${index + 1}`,
    title: `${name} — synthetic record ${index + 1}`,
    provider: DEMO_PROVIDER,
    fetchedAt: new Date().toISOString(),
    evidence,
  };
}

const SOURCE_NAMES = [
  'Synthetic Source A', 'Synthetic Source B', 'Synthetic Source C',
  'Synthetic Source D', 'Synthetic Source E',
];

function slugOf(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

function isJobDomain(entity: string): boolean {
  return /\bjobs?\b|\bopenings?\b|\bpositions?\b|\broles?\b|\bhiring\b/i.test(entity);
}

function isLeadDomain(entity: string): boolean {
  return /\bleads?\b|\bprospects?\b|\bsales\b/i.test(entity);
}

/** The identifying value of record `i`, shaped like the requirement's entity. */
function entityValue(entity: string, i: number): string {
  if (isJobDomain(entity)) {
    const role = JOB_ROLES[i % JOB_ROLES.length];
    const seniority = JOB_SENIORITY[Math.floor(i / JOB_ROLES.length) % JOB_SENIORITY.length];
    const companyIdx = Math.floor(i / (JOB_ROLES.length * JOB_SENIORITY.length));
    const company = `${PREFIXES[companyIdx % PREFIXES.length]} ${SUFFIXES[Math.floor(companyIdx / PREFIXES.length) % SUFFIXES.length]}`;
    return `${seniority} ${role} at ${company}`;
  }
  const base = `${PREFIXES[i % PREFIXES.length]} ${SUFFIXES[Math.floor(i / PREFIXES.length) % SUFFIXES.length]}`;
  if (/(startups?|companies|ai)\b/i.test(entity)) return `${base} AI`;
  if (isLeadDomain(entity) || /companies?\b/i.test(entity)) {
    return `${base} ${ORG_SUFFIX[Math.floor(i / (PREFIXES.length * SUFFIXES.length)) % ORG_SUFFIX.length]}`;
  }
  return base;
}

function generateValue(field: PlanField, i: number, entity: string, primaryValue: string): string | number | string[] {
  const kind = fieldKind(field);
  const wording = `${field.key} ${field.label}`;
  const n = i + 1;

  switch (kind) {
    case 'money': {
      if (/salary|compensation|pay/i.test(wording)) return 55_000 + (i % 20) * 6_500;
      const base = [4.2, 6.5, 8, 10, 12, 15, 18, 22, 25, 32][i % 10];
      return Math.round(base * 1_000_000 * (1 + Math.floor(i / 10) * 0.05));
    }
    case 'number':
      return 3 + ((i * 7) % 480);
    case 'email':
      return `contact${n}@${slugOf(primaryValue)}.${DEMO_DOMAIN}`;
    case 'url':
      return `https://${slugOf(primaryValue)}.${DEMO_DOMAIN}/item/${n}`;
    case 'date': {
      const day = new Date(Date.UTC(2026, 0, 1) + i * 86_400_000 * 3);
      return day.toISOString().slice(0, 10);
    }
    case 'list': {
      if (/skill|requirement/i.test(wording)) {
        return ['React', 'TypeScript', 'SQL', 'Python', 'AWS'].slice(i % 3, (i % 3) + 2);
      }
      return [PERSON_NAMES[i % PERSON_NAMES.length]];
    }
    default: {
      if (CITY_HINTS_TEST.test(wording)) return CITIES[i % CITIES.length];
      if (PERSON_HINTS_TEST.test(wording)) return PERSON_NAMES[i % PERSON_NAMES.length];
      if (CATEGORY_HINTS_TEST.test(wording)) {
        if (/round|stage/i.test(wording)) return ROUNDS[i % ROUNDS.length];
        if (/employment|contract|schedule/i.test(wording)) return EMPLOYMENT[i % EMPLOYMENT.length];
        return CATEGORIES[i % CATEGORIES.length];
      }
      if (COMPANY_HINTS_TEST.test(wording)) {
        const org = `${PREFIXES[i % PREFIXES.length]} ${SUFFIXES[Math.floor(i / PREFIXES.length) % SUFFIXES.length]}`;
        return `${org} ${ORG_SUFFIX[Math.floor(i / (PREFIXES.length * SUFFIXES.length)) % ORG_SUFFIX.length]}`;
      }
      if (/summar|description|notes?|about/i.test(wording)) return DESCRIPTIONS[i % DESCRIPTIONS.length];
      if (/\b(amount|total)\b/i.test(wording)) return `$${((i % 12) + 2) * 5}k`;
      return `${field.label} ${n}`;
    }
  }
}

const CITY_HINTS_TEST = /\b(city|location|place|region|area|based)\b/i;
const PERSON_HINTS_TEST = /\b(founders?|contact|owner|person|recruiter|organizer|author)\b/i;
const COMPANY_HINTS_TEST = /\b(company|organization|organisation|employer|vendor|client)\b/i;
const CATEGORY_HINTS_TEST = /\b(round|stage|category|type|industry|segment|status|priority|seniority|level|focus|department|employment)\b/i;

export function createDemoRecords(datasetId: string, fields: PlanField[], target = 50, entity = 'records'): RecordData[] {
  const count = Math.max(DEMO_MIN_RECORDS, Math.min(target || 50, DEMO_MAX_RECORDS));
  const dataset = scope(datasetId);
  const now = new Date().toISOString();
  const primary = primaryField(fields) ?? fields[0];
  const dataFields = fields.filter((f) => f.key !== 'source');

  // Which field each baked-in defect lands on, chosen once per plan.
  const missingField = dataFields.find((f) => f !== primary && f.required) ?? primary;
  const listField = dataFields.find((f) => fieldKind(f) === 'list');
  const moneyField = dataFields.find((f) => ['money', 'number'].includes(fieldKind(f)));

  const out: RecordData[] = [];
  for (let i = 0; i < count; i += 1) {
    const title = entityValue(entity, i);
    const fieldsOut: Record<string, string | number | string[]> = {};
    for (const f of dataFields) {
      if (f === missingField && i === DEFECT_MISSING) {
        fieldsOut[f.key] = fieldKind(f) === 'list' ? [] : '';
        continue;
      }
      if (f === listField && i === DEFECT_EMPTY_LIST) {
        fieldsOut[f.key] = [];
        continue;
      }
      if (f === moneyField && i === DEFECT_ZERO_MONEY) {
        fieldsOut[f.key] = 0;
        continue;
      }
      fieldsOut[f.key] = f === primary ? title : generateValue(f, i, entity, title);
    }

    const ref = sourceRef(dataset, i, i, Object.fromEntries(Object.entries(fieldsOut).map(([k, v]) => [k, Array.isArray(v) ? v.join('; ') : String(v)])));

    const record: RecordData = {
      // Scoped by dataset so two runs never produce colliding record identifiers.
      id: `rec_${dataset}_${String(i + 1).padStart(3, '0')}`,
      datasetId,
      title,
      fields: fieldsOut,
      canonicalKey: '',
      confidence: i === DEFECT_LOW_CONFIDENCE ? 0.4 : 0.92,
      status: 'valid',
      sources: [ref],
      createdAt: now,
      updatedAt: now,
    };
    out.push(record);

    // The same entity reported by a second source, with a conflicting amount.
    // Real multi-source collection produces these; the deduper is expected to merge
    // them and retain both evidence trails rather than the generator hiding them.
    if (i % 13 === 6) {
      const altSlot = i + 1 + Math.ceil(SOURCE_NAMES.length / 2);
      const altFields = { ...fieldsOut };
      if (typeof altFields[moneyField?.key ?? ''] === 'number') {
        altFields[moneyField!.key] = Math.round((altFields[moneyField!.key] as number) * 1.1);
      }
      const alt = sourceRef(dataset, i + 500, altSlot, Object.fromEntries(Object.entries(altFields).map(([k, v]) => [k, Array.isArray(v) ? v.join('; ') : String(v)])));
      out.push({
        ...record,
        id: `rec_${dataset}_${String(i + 1).padStart(3, '0')}_alt`,
        fields: altFields,
        sources: [alt],
      });
    }
  }

  return out;
}

export const demoSourceAdapter: SourceAdapter = {
  id: 'synthetic-demo',
  label: 'Synthetic demo sources',
  live: false,
  async collect(request: CollectionRequest): Promise<CollectionResult> {
    const records = createDemoRecords(
      request.datasetId,
      request.plan.fields,
      request.targetRecords,
      request.plan.targetEntity || 'records',
    );
    return {
      records,
      discovered: records.length,
      sourcesUsed: [...new Set(records.flatMap((r) => r.sources.map((s) => s.name)))],
    };
  },
};
