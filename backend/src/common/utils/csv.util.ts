/**
 * Minimal CSV serializer — no external dependency, matching this project's
 * general preference for hand-rolled utilities over a library for something
 * this small (roadmap.md 8.10's own framing: avoid disproportionate effort).
 * Escapes a field only when it needs it (comma, quote, CR/LF), doubling any
 * embedded quotes per RFC 4180. CRLF line endings for broad spreadsheet
 * compatibility (Excel, Power BI, Looker Studio all expect them).
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

// Leading UTF-8 BOM: Excel — the most likely destination for a downloaded
// CSV — mis-detects the encoding without it and mangles accented Spanish
// characters (incident titles, tag/project names).
const UTF8_BOM = '﻿';

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvField(c.header)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvField(String(c.value(row) ?? ''))).join(','),
  );
  return UTF8_BOM + [header, ...lines].join('\r\n') + '\r\n';
}
