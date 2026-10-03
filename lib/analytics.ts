import type { PlanField, RecordData } from './types';
import { fieldKind, fieldValueText } from './plan-fields';

/**
 * Dataset analytics over plan-driven (dynamic) fields.
 *
 * Pure functions over the normalized records so the values shown in the UI are
 * computed in one tested place rather than inline in a page component.
 */

export type NumericSummary = { key: string; label: string; total: number; median: number };
export type CategorySummary = {
  key: string;
  label: string;
  distinct: number;
  items: Array<{ label: string; count: number; share: number }>;
};

export type DatasetSummary = {
  recordCount: number;
  validCount: number;
  reviewCount: number;
  invalidCount: number;
  sourceGroups: number;
  numerics: NumericSummary[];
  categories: CategorySummary[];
};

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Money/number fields become totals + medians; low-cardinality text fields become tallies. */
export function summarizeDataset(rows: RecordData[], fields: PlanField[]): DatasetSummary {
  const dataFields = fields.filter((f) => f.key !== 'source');

  const numerics: NumericSummary[] = dataFields
    .filter((f) => ['money', 'number'].includes(fieldKind(f)))
    .map((f) => {
      const values = rows
        .map((r) => r.fields[f.key])
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      return {
        key: f.key,
        label: f.label,
        total: values.reduce((sum, v) => sum + v, 0),
        median: median(values),
      };
    });

  const categories: CategorySummary[] = [];
  for (const f of dataFields) {
    if (fieldKind(f) !== 'text') continue;
    const counts = new Map<string, number>();
    for (const row of rows) {
      const label = fieldValueText(row.fields[f.key]).trim();
      if (!label) continue;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    // A field is a useful category when it actually groups the records.
    if (counts.size < 2 || counts.size > Math.max(12, rows.length / 2)) continue;
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count, share: count / rows.length }));
    categories.push({ key: f.key, label: f.label, distinct: counts.size, items: top });
  }

  return {
    recordCount: rows.length,
    validCount: rows.filter((r) => r.status === 'valid').length,
    reviewCount: rows.filter((r) => r.status === 'review').length,
    invalidCount: rows.filter((r) => r.status === 'invalid').length,
    sourceGroups: new Set(rows.flatMap((r) => r.sources.map((s) => s.name))).size,
    numerics,
    categories,
  };
}

/** Human formatting for money/number cell values, scales-aware. */
export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  const abs = Math.abs(amount);
  if (abs >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(amount / 1e3).toFixed(0)}k`;
  return `$${amount}`;
}

export function formatMillions(amount: number): string {
  return `$${(amount / 1e6).toFixed(1)}M`;
}
