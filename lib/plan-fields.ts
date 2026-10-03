import type { PlanField, RecordData, ResearchPlan } from './types';

/**
 * Plan-field helpers.
 *
 * The record schema is dynamic — it comes from the research plan — so everything
 * downstream (collection, validation, deduplication, analytics, export, UI)
 * interprets fields through this module instead of hardcoded property names.
 */

export type FieldKind = 'text' | 'list' | 'money' | 'number' | 'url' | 'date' | 'email';

/** Canonical types the planner is told to use. */
export const FIELD_TYPES: FieldKind[] = ['text', 'list', 'money', 'number', 'url', 'date', 'email'];

const MONEY_HINTS =
  /\b(money|funding|fund|raised|salary|compensation|amount|budget|revenue|price|cost|valuation|worth|pay)\b/i;
const NUMBER_HINTS = /\b(number|count|headcount|employees|years|quantity|score|rating|size|reach|openings?)\b/i;
const URL_HINTS = /\b(url|website|link|domain|site)\b/i;
const DATE_HINTS = /\b(date|posted|deadline|founded|due|updated|published|closing)\b/i;
const EMAIL_HINTS = /\b(e-?mail)\b/i;
const LIST_HINTS = /\b(founders?|skills?|tags?|requirements?|benefits?|contacts?|investors?|categories?)\b/i;
const PERSON_HINTS = /\b(founders?|contact|owner|person|recruiter|author)\b/i;
const CITY_HINTS = /\b(city|location|place|region|area)\b/i;
const CATEGORY_HINTS = /\b(round|stage|category|type|industry|segment|status|priority|seniority|level|focus|department)\b/i;

/** Maps any planner-provided type string onto a canonical FieldKind. */
export function normalizeFieldType(type: string): FieldKind {
  const t = (type || '').toLowerCase().trim();
  if (t === 'money' || t === 'number' || t === 'url' || t === 'date' || t === 'email' || t === 'list' || t === 'text') {
    return t;
  }
  if (t === 'string' || t === 'str') return 'text';
  if (t.includes('int') || t.includes('float') || t.includes('decimal')) return 'number';
  if (t.includes('array') || t.includes('[')) return 'list';
  return 'text';
}

/** Best-effort kind of a field, using its declared type and then its key/label wording. */
export function fieldKind(field: Pick<PlanField, 'key' | 'label' | 'type'>): FieldKind {
  const declared = normalizeFieldType(field.type);
  if (declared !== 'text') return declared;

  const wording = `${field.key} ${field.label}`;
  if (EMAIL_HINTS.test(wording)) return 'email';
  if (URL_HINTS.test(wording)) return 'url';
  if (DATE_HINTS.test(wording)) return 'date';
  if (MONEY_HINTS.test(wording)) return 'money';
  if (LIST_HINTS.test(wording)) return 'list';
  if (NUMBER_HINTS.test(wording)) return 'number';
  return 'text';
}

/** The field a record is identified and displayed by. */
export function primaryField(fields: PlanField[]): PlanField | undefined {
  const usable = fields.filter((f) => fieldKind(f) === 'text' && f.key !== 'source');
  return (
    usable.find((f) => /\b(name|title|company|organization|organisation|job|lead|entity)\b/i.test(`${f.key} ${f.label}`)) ??
    usable[0] ??
    fields.find((f) => f.key !== 'source')
  );
}

/** A location-ish field, used as the canonical-key fallback when there is no URL. */
export function locationField(fields: PlanField[]): PlanField | undefined {
  return fields.find((f) => f.key !== 'source' && CITY_HINTS.test(`${f.key} ${f.label}`));
}

export function fieldByKey(fields: PlanField[], key: string): PlanField | undefined {
  return fields.find((f) => f.key === key);
}

/** The plan's data fields: every field except the source/evidence column. */
export function dataFields(fields: PlanField[]): PlanField[] {
  return fields.filter((f) => f.key !== 'source' && fieldKind(f) !== undefined);
}

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim().length === 0;
  if (typeof value === 'number') return !Number.isFinite(value);
  return false;
}

export function fieldValueText(value: string | number | string[] | undefined): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

export function hostnameOf(record: RecordData): string | null {
  const url = record.fields['website'] ?? findUrlValue(record);
  if (typeof url !== 'string' || !url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function findUrlValue(record: RecordData): string | undefined {
  for (const [key, value] of Object.entries(record.fields)) {
    if (typeof value === 'string' && /^(https?:\/\/)/.test(value)) return value;
    if (/\b(website|url)\b/i.test(key) && typeof value === 'string') return value;
  }
  return undefined;
}

/**
 * `normalized(primary value) | normalized hostname`
 * falling back to `| normalized location` and then to the second field's value.
 */
export function canonicalKeyFor(record: RecordData, fields: PlanField[]): string {
  const primary = primaryField(fields);
  const primaryValue = primary ? fieldValueText(record.fields[primary.key]) : record.title;
  const normalized = (v: string) => v.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  const host = hostnameOf(record);
  const fallbackField = locationField(fields) ?? fields.find((f) => f.key !== 'source' && f !== primary);
  const fallback = fallbackField ? fieldValueText(record.fields[fallbackField.key]) : '';
  return `${normalized(primaryValue || record.title)}|${host || normalized(fallback)}`;
}

/** Sort/stable order of a plan's data fields for tables and exports. */
export function displayFields(plan: ResearchPlan | undefined | null, rows: RecordData[]): PlanField[] {
  if (plan?.fields?.length) return dataFields(plan.fields);
  const keys: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row.fields)) {
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys.map((key) => ({ key, label: key.replaceAll('_', ' '), required: false, type: 'text' }));
}
