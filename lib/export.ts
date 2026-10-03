import type { Dataset, PlanField, RecordData } from './types';

/**
 * Export encoding.
 *
 * Kept out of the route handler so the encoding rules can be unit tested directly.
 * SECURITY.md rules applied here: controlled filenames and safe encodings.
 * Columns come from the plan's fields, so any domain exports cleanly.
 */

export type ExportFormat = 'csv' | 'json';

/**
 * Spreadsheet programs treat a leading =, +, - or @ as a formula. Prefixing with an
 * apostrophe keeps exported text inert when a user opens the file directly.
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = Array.isArray(value) ? value.join('; ') : String(value);
  // Collapse newlines so a single record always occupies a single CSV line.
  text = text.replace(/\s*[\r\n]+\s*/g, ' ');
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

/** CSV columns: the plan's data fields in plan order, then quality metadata. */
export function exportColumns(fields: PlanField[]): string[] {
  return [...fields.filter((f) => f.key !== 'source').map((f) => f.key), 'status', 'confidence'];
}

export function toCsv(rows: RecordData[], columns: string[]): string {
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(
      columns
        .map((column) =>
          column === 'status'
            ? cell(row.status)
            : column === 'confidence'
              ? cell(row.confidence)
              : cell(row.fields[column]),
        )
        .join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}

export function toJson(dataset: Dataset, rows: RecordData[]): string {
  return `${JSON.stringify({ dataset, records: rows }, null, 2)}\n`;
}

/** Filenames are derived only from our own dataset id, sanitized defensively. */
export function exportFilename(datasetId: string, format: ExportFormat): string {
  const safe = datasetId.replace(/[^A-Za-z0-9_-]/g, '') || 'dataset';
  return `thalesai-${safe}.${format}`;
}

export type ExportGuard =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string };

/**
 * Export must refuse or explain when the dataset is not ready. A dataset still
 * being written is reported as a conflict so the caller can retry; an empty
 * dataset is a clear 422 rather than a silently empty file.
 */
export function exportGuard(dataset: Dataset | undefined, rows: RecordData[]): ExportGuard {
  if (!dataset) {
    return { ok: false, status: 404, code: 'NOT_FOUND', message: 'Dataset not found.' };
  }
  if (dataset.status !== 'ready') {
    return {
      ok: false,
      status: 409,
      code: 'DATASET_NOT_READY',
      message: 'This dataset is still being collected. Export becomes available once the run finishes.',
    };
  }
  if (!rows.length) {
    return {
      ok: false,
      status: 422,
      code: 'NO_RECORDS',
      message: 'This dataset contains no records, so there is nothing to export.',
    };
  }
  return { ok: true };
}

export function renderExport(
  dataset: Dataset,
  rows: RecordData[],
  format: ExportFormat,
  fields: PlanField[],
): { body: string; contentType: string; filename: string } {
  return format === 'json'
    ? {
        body: toJson(dataset, rows),
        contentType: 'application/json; charset=utf-8',
        filename: exportFilename(dataset.id, 'json'),
      }
    : {
        body: toCsv(rows, exportColumns(fields)),
        contentType: 'text/csv; charset=utf-8',
        filename: exportFilename(dataset.id, 'csv'),
      };
}
