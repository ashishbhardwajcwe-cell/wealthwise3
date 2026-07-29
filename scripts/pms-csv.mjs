/**
 * The PMS import CSV contract — ONE definition, shared by the writer
 * (fetch-pms.mjs) and the reader (import-pms.mjs).
 *
 * This module exists because a second, hand-maintained copy of the column
 * list is what broke the data. import-pms.mjs printed an "expected header"
 * that had gone stale — it listed only returns1y/3y/5y/sinceInception and
 * omitted returns1m, returns3m, returns6m, returns2y and returns4y. A CSV
 * built from that message imported cleanly with the short periods blank, and
 * every strategy page shipped showing N/A for 1M, 3M, 6M and 2Y. Nothing
 * errored; the gap was only visible on the live site.
 *
 * So: if you add a column, add it here. scripts/pms-template.csv is checked
 * against this list at import time, and both scripts derive their headers
 * from it rather than repeating it.
 */

/** Every column the importer reads, in template order. */
export const CSV_COLUMNS = [
  "strategyName", "manager", "category", "aumCr", "minInvestmentL", "inceptionDate",
  "returns1m", "returns3m", "returns6m",
  "returns1y", "returns2y", "returns3y", "returns4y", "returns5y", "sinceInception",
  "feesFixed", "feesPerformance", "feesHurdle",
  "asOfDate", "source", "notes", "sanityId",
];

/**
 * Return columns as [csvColumn, displayLabel, sanityKey], in display order.
 * APMI publishes all nine windows in one table — a missing one is a gap in
 * the extraction, not in the source.
 */
export const RETURN_COLUMNS = [
  ["returns1m", "1M", "m1"],
  ["returns3m", "3M", "m3"],
  ["returns6m", "6M", "m6"],
  ["returns1y", "1Y", "y1"],
  ["returns2y", "2Y", "y2"],
  ["returns3y", "3Y", "y3"],
  ["returns4y", "4Y", "y4"],
  ["returns5y", "5Y", "y5"],
  ["sinceInception", "SI", "sinceInception"],
];

/** Quote a CSV field only when it needs it. */
export function csvField(value) {
  if (value === undefined || value === null) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rows of {column: value} → a CSV string with the canonical header. */
export function toCsv(rows, columns = CSV_COLUMNS) {
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(columns.map((c) => csvField(row[c])).join(","));
  return lines.join("\n") + "\n";
}
