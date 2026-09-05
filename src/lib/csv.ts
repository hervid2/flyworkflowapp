/**
 * Minimal, dependency-free CSV serializer for client-side exports (roadmap
 * 8.10). Mirrors `backend/src/common/utils/csv.util.ts`'s shape (same column
 * contract, same escaping rule) without sharing code across the two
 * independent npm packages this repo already keeps separate.
 */

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

function escapeCsvField(raw: string): string {
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvField(c.header)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvField(String(c.value(row) ?? ''))).join(','),
  );
  return [header, ...lines].join('\r\n') + '\r\n';
}

// Leading UTF-8 BOM: without it, Excel (the most likely consumer of a
// manually downloaded CSV) guesses the wrong encoding and mangles accented
// Spanish characters (project/incident titles, tag names).
const UTF8_BOM = '﻿';

/** Triggers a browser download of `content` (a client-built CSV string) as `filename`. */
export function downloadCsv(filename: string, content: string): void {
  downloadBlob(filename, new Blob([UTF8_BOM + content], { type: 'text/csv;charset=utf-8;' }));
}

/**
 * Triggers a browser download of an already-built `blob` as `filename` — used
 * for the server-generated `GET /incidents/export.csv` response, which
 * already carries its own BOM (`backend/src/common/utils/csv.util.ts`).
 */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
