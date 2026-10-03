import type {
  DedupeCandidate,
  DedupeResult,
  PlanField,
  RecordData,
  ValidationFinding,
} from './types';
import {
  canonicalKeyFor,
  fieldKind,
  fieldValueText,
  isEmptyValue,
  primaryField,
} from './plan-fields';

/**
 * DATA_QUALITY.md requires that low-confidence matches are never merged silently.
 * Any pair below this confidence is routed to human review instead of folded together.
 */
export const AUTO_MERGE_MIN_CONFIDENCE = 0.6;

/** Below this, an otherwise well-formed record is still surfaced for review. */
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

/**
 * Dice coefficient over character bigrams, used for "same entity, different spelling".
 */
export const FUZZY_NAME_THRESHOLD = 0.82;

/**
 * A hostname shared by more than this many distinct canonical keys is a general-purpose
 * host (a directory, a news portal, a registry) rather than an entity-specific domain,
 * so matching on it carries no identity signal.
 */
export const HOST_ENTITY_KEY_LIMIT = 5;

export function normalize(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Lowercased hostname with `www.` removed, or null when the URL cannot be parsed. */
export function hostname(website: string): string | null {
  try {
    return new URL(website).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * `normalized(primary value) | normalized hostname`, falling back to
 * `| normalized location` and then the second field's value.
 */
export function canonicalKey(value: string, website: string, fallback = ''): string {
  const host = hostname(website);
  return `${normalize(value)}|${host || normalize(fallback)}`;
}

function severityRank(finding: ValidationFinding): number {
  return finding.outcome === 'invalid' ? 2 : finding.outcome === 'review' ? 1 : 0;
}

/**
 * Validates one record in place (canonical key, status and confidence are derived)
 * against the plan's field definitions and returns every finding, most severe first.
 *
 * Valid   — all required fields present and at least one evidence source.
 * Review  — a required field is missing, a typed value is malformed, or confidence is low.
 * Invalid — the record is structurally unusable (no identifying value).
 */
export function validate(record: RecordData, fields: PlanField[]): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const dataFields = fields.filter((f) => f.key !== 'source');
  const primary = primaryField(fields);

  if (!primary || !normalize(fieldValueText(record.fields[primary?.key]))) {
    findings.push({
      field: primary?.key,
      message: primary
        ? `${primary.label} is missing; the record cannot be identified.`
        : 'The plan defines no identifying field; the record cannot be identified.',
      severity: 'error',
      outcome: 'invalid',
    });
  }

  for (const field of dataFields) {
    if (field === primary) continue;
    const value = record.fields[field.key];
    if (isEmptyValue(value)) {
      findings.push({
        field: field.key,
        message: `${field.label} is missing.`,
        severity: 'warning',
        outcome: 'review',
      });
      continue;
    }
    const kind = fieldKind(field);
    if (kind === 'url') {
      if (!hostname(fieldValueText(value))) {
        findings.push({
          field: field.key,
          message: `${field.label} is not a parseable URL.`,
          severity: 'error',
          outcome: 'review',
        });
      }
    } else if ((kind === 'money' || kind === 'number') && typeof value === 'number') {
      if (!Number.isFinite(value) || value < 0) {
        findings.push({
          field: field.key,
          message: `${field.label} is not a valid non-negative number.`,
          severity: 'error',
          outcome: 'review',
        });
      } else if (value === 0) {
        findings.push({
          field: field.key,
          message: `${field.label} is zero; confirm the value was disclosed.`,
          severity: 'warning',
          outcome: 'review',
        });
      }
    } else if (kind === 'email' && typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      findings.push({
        field: field.key,
        message: `${field.label} is not a valid email address.`,
        severity: 'warning',
        outcome: 'review',
      });
    }
  }

  if (!record.sources?.length) {
    findings.push({
      field: 'source',
      message: 'Source evidence is missing.',
      severity: 'error',
      outcome: 'review',
    });
  }

  if (record.confidence < LOW_CONFIDENCE_THRESHOLD) {
    findings.push({
      field: 'confidence',
      message: `Confidence is low (${Math.round(record.confidence * 100)}%).`,
      severity: 'warning',
      outcome: 'review',
    });
  }

  findings.sort((a, b) => severityRank(b) - severityRank(a));

  const worst = findings.length ? severityRank(findings[0]) : 0;
  record.canonicalKey = canonicalKeyFor(record, fields);
  record.status = worst === 2 ? 'invalid' : worst === 1 ? 'review' : 'valid';
  // Confidence is capped for imperfect records; it is never inflated to hide a problem.
  if (worst === 2) record.confidence = Math.min(record.confidence, 0.3);
  else if (worst === 1) record.confidence = Math.min(record.confidence, 0.72);

  return findings;
}

function mergeEvidence(kept: RecordData, incoming: RecordData): void {
  // Never drop supporting source references during a merge.
  const seen = new Set(kept.sources.map((s) => s.id));
  for (const source of incoming.sources) {
    if (!seen.has(source.id)) {
      kept.sources.push(source);
      seen.add(source.id);
    }
  }
  kept.confidence = Math.max(kept.confidence, incoming.confidence);
  // List values are unioned (founders, skills, ...); scalars keep the kept row's value.
  for (const [key, value] of Object.entries(incoming.fields)) {
    if (Array.isArray(value) && Array.isArray(kept.fields[key])) {
      kept.fields[key] = [...new Set([...(kept.fields[key] as string[]), ...value])];
    } else if (isEmptyValue(kept.fields[key]) && !isEmptyValue(value)) {
      kept.fields[key] = value;
    }
  }
  if (!kept.canonicalKey) kept.canonicalKey = incoming.canonicalKey;
  if (incoming.updatedAt > kept.updatedAt) kept.updatedAt = incoming.updatedAt;
}

function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s: string) => {
    const out = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i += 1) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };
  const left = bigrams(a);
  const right = bigrams(b);
  let shared = 0;
  let total = 0;
  for (const count of left.values()) total += count;
  for (const [gram, count] of right) {
    total += count;
    shared += Math.min(count, left.get(gram) ?? 0);
  }
  return total === 0 ? 0 : (2 * shared) / total;
}

/**
 * Deduplication per DATA_QUALITY.md:
 *   1. exact canonical key (+ sufficient confidence) -> merge, retaining all evidence
 *   2. exact normalized hostname                     -> candidate only
 *   3. fuzzy name + same location                    -> candidate only, human review
 *   4. a shared person value alone is never enough
 * Anything that is not an exact key is reported as a candidate rather than merged,
 * so nothing is collapsed without a human seeing it.
 */
export function dedupe(rows: RecordData[], fields: PlanField[]): DedupeResult {
  const byKey = new Map<string, RecordData>();
  const kept: RecordData[] = [];
  const candidates: DedupeCandidate[] = [];
  let removed = 0;

  for (const row of rows) {
    const key = row.canonicalKey || canonicalKeyFor(row, fields);
    // Persist the derived key so the candidate rules below compare real keys rather
    // than the empty placeholder an unvalidated record carries.
    row.canonicalKey = key;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, row);
      kept.push(row);
      continue;
    }

    const confident =
      existing.confidence >= AUTO_MERGE_MIN_CONFIDENCE &&
      row.confidence >= AUTO_MERGE_MIN_CONFIDENCE;

    if (confident) {
      mergeEvidence(existing, row);
      removed += 1;
    } else {
      // Keep both, but flag the pair: a silent merge is explicitly forbidden.
      kept.push(row);
      candidates.push({
        keptId: existing.id,
        incomingId: row.id,
        title: row.title,
        reason: 'Same canonical key but below the auto-merge confidence floor.',
        similarity: 1,
      });
    }
  }

  // Rule 2: identical hostname across differing keys is a candidate, never a merge.
  const byHost = new Map<string, RecordData[]>();
  for (const row of kept) {
    const host = hostname(String(row.fields['website'] ?? ''));
    if (!host) continue;
    const bucket = byHost.get(host) ?? [];
    bucket.push(row);
    byHost.set(host, bucket);
  }
  for (const [host, bucket] of byHost) {
    if (bucket.length < 2) continue;
    // A host shared by many distinct entities identifies the publisher, not the company.
    const distinctKeys = new Set(bucket.map((r) => r.canonicalKey));
    if (distinctKeys.size > HOST_ENTITY_KEY_LIMIT) continue;
    for (let i = 1; i < bucket.length; i += 1) {
      // A pair already reported by the exact-key rule must not be reported twice.
      if (bucket[0].canonicalKey === bucket[i].canonicalKey) continue;
      candidates.push({
        keptId: bucket[0].id,
        incomingId: bucket[i].id,
        title: bucket[i].title,
        reason: `Identical hostname "${host}" with a different canonical key.`,
        similarity: 1,
      });
    }
  }

  // Rule 3: similar name in the same location is a candidate, never a merge.
  // Name similarity alone is noisy (short names collide easily), so a shared person
  // value is also required. A shared person alone is still never sufficient (rule 4).
  const locationKeys = fields.filter((f) => /\b(city|location|place|region)\b/i.test(`${f.key} ${f.label}`));
  const personKeys = fields.filter((f) => /\b(founders?|contact|owner|person|recruiter)\b/i.test(`${f.key} ${f.label}`));
  const locationOf = (row: RecordData): string => {
    for (const f of locationKeys) {
      const text = fieldValueText(row.fields[f.key]);
      if (text) return normalize(text);
    }
    return '';
  };

  const byLocation = new Map<string, RecordData[]>();
  for (const row of kept) {
    const location = locationOf(row);
    if (!location) continue;
    const bucket = byLocation.get(location) ?? [];
    bucket.push(row);
    byLocation.set(location, bucket);
  }
  for (const bucket of byLocation.values()) {
    for (let i = 0; i < bucket.length; i += 1) {
      for (let j = i + 1; j < bucket.length; j += 1) {
        const a = bucket[i];
        const b = bucket[j];
        if (a.canonicalKey === b.canonicalKey) continue;
        const hostA = hostname(String(a.fields['website'] ?? ''));
        const hostB = hostname(String(b.fields['website'] ?? ''));
        if (hostA && hostA === hostB) continue;

        const score = diceCoefficient(normalize(a.title), normalize(b.title));
        if (score < FUZZY_NAME_THRESHOLD) continue;

        const sharedPerson = personKeys.some((f) => {
          const av = a.fields[f.key];
          const bv = b.fields[f.key];
          if (!Array.isArray(av) || !Array.isArray(bv)) return false;
          return av.some((x) => bv.some((y) => normalize(String(x)) === normalize(String(y))));
        });
        if (!sharedPerson) continue;

        candidates.push({
          keptId: a.id,
          incomingId: b.id,
          title: b.title,
          reason: `Similar name and a shared person value in the same location (score ${score.toFixed(2)}).`,
          similarity: score,
        });
      }
    }
  }

  return { rows: kept, removed, candidates };
}
