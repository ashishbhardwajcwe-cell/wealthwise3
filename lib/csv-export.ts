/**
 * Browser-only CSV download. Generates an in-memory blob and clicks a
 * synthesised anchor. No deps, works in every modern browser.
 */
export function downloadCsv<T>(
  filename: string,
  headers: string[],
  rows: T[],
  getCell: (row: T, header: string) => string | number | null | undefined,
): void {
  const escape = (raw: string | number | null | undefined): string => {
    if (raw == null) return "";
    const s = String(raw);
    if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => headers.map((h) => escape(getCell(r, h))).join(",")),
  ];
  const csv = lines.join("\n");
  // Excel-friendly BOM so non-ASCII characters (₹, ₿, é) render correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
