import { NextResponse } from 'next/server';

function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsvRow(values: (string | number)[]): string {
  return values.map((value) => escapeCsvField(String(value))).join(',');
}

export function buildCsvResponse(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
): NextResponse {
  const csv = [toCsvRow(headers), ...rows.map(toCsvRow)].join('\r\n');
  const BOM = String.fromCharCode(0xfeff);

  return new NextResponse(`${BOM}${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
