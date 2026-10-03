import { summarizeDataset, formatMoney } from './analytics';
import type { RecordData, Report } from './types';

/**
 * Deterministic report generation.
 *
 * A report is built purely from recorded dataset facts, so it still works when no AI
 * provider is configured. Nothing here claims to have consulted an external source.
 */
export function buildReport(
  datasetId: string,
  datasetName: string,
  rows: RecordData[],
  fields: import('./types').PlanField[],
): Omit<Report, 'id' | 'createdAt'> {
  const s = summarizeDataset(rows, fields);
  const needsReview = s.reviewCount + s.invalidCount;

  const moneyLine = s.numerics
    .filter((n) => n.total > 0)
    .slice(0, 2)
    .map((n) => `${n.label} totals ${formatMoney(n.total)} (median ${formatMoney(n.median)})`)
    .join('; ');

  const categoryLine = s.categories
    .slice(0, 2)
    .map((c) => {
      const top = c.items
        .slice(0, 3)
        .map((i) => `${i.label} (${i.count})`)
        .join(', ');
      return `${c.label}: ${top || 'none recorded'}${c.distinct > c.items.length ? `, ${c.distinct} distinct values` : ''}`;
    })
    .join(' — ');

  return {
    datasetId,
    title: `${datasetName} — Research Report`,
    executiveSummary:
      `This dataset contains ${s.recordCount} records, of which ${s.validCount} passed validation ` +
      `and ${needsReview} require review. Records draw on ${s.sourceGroups} source groups, and every ` +
      `record retains its source references and validation status.`,
    findings: [
      {
        title: 'Dataset quality',
        body:
          `${s.validCount} of ${s.recordCount} records are valid. ${s.reviewCount} are flagged for ` +
          `review because a required field is missing or evidence is incomplete, and ` +
          `${s.invalidCount} are structurally unusable.`,
      },
      {
        title: 'Coverage',
        body:
          [moneyLine, categoryLine].filter(Boolean).join(' — ') ||
          'No aggregatable numeric or categorical fields were defined in the plan.',
      },
    ],
  };
}
