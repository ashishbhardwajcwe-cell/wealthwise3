#!/usr/bin/env node
/**
 * APMI investment-approach report → the PMS import CSV.
 *
 * Turns one saved `loadIAReport` payload into scripts/pms-data.csv with every
 * column scripts/import-pms.mjs reads — crucially ALL NINE return windows.
 * The site shipped with 1M, 3M, 6M and 2Y reading "N/A" on every strategy
 * page because those columns were absent from a hand-built CSV; APMI carries
 * them in the same table as the 1Y/3Y/5Y figures that did make it through, so
 * extracting the table wholesale is the durable fix.
 *
 *   npm run fetch:pms -- --file scripts/apmi-report.json --asof 2026-06-30
 *   npm run import:pms -- scripts/pms-data.csv
 *
 * The payload's field names are not contractual, so nothing here is keyed to
 * a literal name — every column is found by matching patterns against the
 * row labels (see scripts/apmi.mjs). Run --inspect FIRST on a new month's
 * payload: it prints the table it found, the labels it saw, what each mapped
 * to and what it couldn't place, and writes nothing. Fix any miss with
 * --map, then re-run for real.
 *
 * Flags:
 *   --file <path>      Read the report JSON from disk (most reliable).
 *   --url <endpoint>   Fetch it instead (or set APMI_REPORT_URL).
 *   --out <path>       CSV destination (default scripts/pms-data.csv).
 *   --asof YYYY-MM-DD  Month-end the figures are as of. Auto-detected when
 *                      the payload carries it; this overrides.
 *   --source "..."     Attribution stored on every row.
 *   --rows-at <path>   Dotted path to the row array, e.g. "$.d.Table1",
 *                      when the largest-array heuristic picks the wrong one.
 *   --map key=Label    Pin a column to an exact payload label. Repeatable.
 *                      Keys: strategyName, manager, category, aumCr,
 *                      inceptionDate, m1, m3, m6, y1, y2, y3, y4, y5,
 *                      sinceInception.
 *   --aum-unit <u>     cr (default) | lakh | rupees — AUM is written in ₹
 *                      crore; --inspect prints samples so you can check the
 *                      magnitude before trusting it.
 *   --inspect          Describe the payload and the mapping; write nothing.
 *   --dry-run          Print the CSV to stdout instead of writing it.
 *
 * No Sanity credentials needed — this writes a CSV. import-pms.mjs does the
 * writing, and its coverage gate refuses a dataset with an empty period.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { num, normalizeIsoDate } from "./import-shared.mjs";
import { CSV_COLUMNS, RETURN_COLUMNS, toCsv } from "./pms-csv.mjs";
import {
  loadApmiReport, findRowArray, nodeAtPath, labelValuePairs,
  extractReturns, extractField, detectAsOf, parseMapFlags, isIndexRow,
} from "./apmi.mjs";

/* ---------- args ---------- */
function parseArgs(argv) {
  const out = { map: [], aumUnit: "cr", out: "scripts/pms-data.csv" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--inspect") out.inspect = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--file") out.file = argv[++i];
    else if (a === "--url") out.url = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--asof") out.asof = argv[++i];
    else if (a === "--source") out.source = argv[++i];
    else if (a === "--rows-at") out.rowsAt = argv[++i];
    else if (a === "--map") out.map.push(argv[++i]);
    else if (a === "--aum-unit") out.aumUnit = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log("See the header of scripts/fetch-pms.mjs for usage.");
  process.exit(0);
}

function die(reason) {
  console.error(`\n${reason}\n`);
  console.error(
    "The only sanctioned source is APMI's own report (apmiindia.org) — do NOT\n" +
    "scrape PMS Bazaar or another aggregator for these figures.\n\n" +
    "Save the loadIAReport payload to a file and pass --file, then run with\n" +
    "--inspect first to check the mapping.",
  );
  process.exit(1);
}

/* ---------- load ---------- */
const loaded = await loadApmiReport({ file: args.file, url: args.url });
if (!loaded.ok) die(loaded.reason);
const report = loaded.report;

const overrides = parseMapFlags(args.map);

let rows;
let rowsPath;
if (args.rowsAt) {
  const node = nodeAtPath(report, args.rowsAt);
  if (!Array.isArray(node)) die(`--rows-at "${args.rowsAt}" is not an array in this payload.`);
  rows = node.filter((v) => v && typeof v === "object" && !Array.isArray(v));
  rowsPath = args.rowsAt;
} else {
  const found = findRowArray(report);
  rows = found.rows;
  rowsPath = found.path;
}
if (!rows.length) die("Couldn't find an array of strategy rows in this payload. Try --rows-at <path>, or --inspect to see its shape.");

/* ---------- AUM units ---------- */
const AUM_DIVISOR = { cr: 1, crore: 1, lakh: 10, lakhs: 10, rupees: 1e7, inr: 1e7 };
const divisor = AUM_DIVISOR[String(args.aumUnit).toLowerCase()];
if (divisor === undefined) die(`--aum-unit "${args.aumUnit}" not recognised. Use cr, lakh or rupees.`);
const toCrore = (v) => {
  const n = num(v);
  return n === undefined ? undefined : Math.round((n / divisor) * 100) / 100;
};

/* ---------- map one row ---------- */
function mapRow(row, asOfDate, source) {
  const returns = extractReturns(row, overrides);
  const out = {
    strategyName: extractField(row, "strategyName", overrides),
    manager: extractField(row, "manager", overrides),
    category: extractField(row, "category", overrides),
    aumCr: toCrore(extractField(row, "aumCr", overrides)),
    inceptionDate: normalizeIsoDate(extractField(row, "inceptionDate", overrides)) ?? undefined,
    asOfDate,
    source,
  };
  for (const [col, , key] of RETURN_COLUMNS) out[col] = returns[key];
  // normalizeIsoDate returns null for present-but-unparseable — don't write
  // "null" into the CSV, leave it blank and let the count below flag it.
  if (out.inceptionDate === null) out.inceptionDate = undefined;
  return out;
}

const asOfDate = args.asof || detectAsOf(report);
const monthLabel = asOfDate && /^\d{4}-\d{2}-\d{2}$/.test(asOfDate)
  ? new Date(`${asOfDate}T00:00:00Z`).toLocaleString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
  : null;
const source = args.source || `APMI monthly report${monthLabel ? `, ${monthLabel}` : ""}`;
const mapped = rows.map((r) => mapRow(r, asOfDate, source));

/* ---------- inspect ---------- */
if (args.inspect) {
  const labels = new Map();
  for (const row of rows.slice(0, 50)) {
    for (const [label, value] of labelValuePairs(row)) {
      if (!labels.has(label)) labels.set(label, value);
    }
  }
  const claimed = new Set();
  const claim = (col, key) => {
    for (const [label] of labels) {
      const probe = { [label]: labels.get(label) };
      const hit = key ? extractReturns(probe, overrides)[key] !== undefined : extractField(probe, col, overrides) !== undefined;
      if (hit) { claimed.add(label); return label; }
    }
    return null;
  };

  console.log(`APMI report inspection\n${"─".repeat(64)}`);
  console.log(`Rows found at : ${rowsPath}`);
  console.log(`Row count     : ${rows.length}`);
  console.log(`As-of date    : ${asOfDate ?? "NOT DETECTED — pass --asof YYYY-MM-DD"}`);
  console.log(`Source string : ${source}`);
  console.log(`AUM unit      : ${args.aumUnit} (values divided by ${divisor} to reach ₹ crore)`);

  console.log(`\nColumn mapping:`);
  for (const col of ["strategyName", "manager", "category", "aumCr", "inceptionDate"]) {
    const label = claim(col, null);
    console.log(`  ${col.padEnd(15)} ← ${label ?? "NOT FOUND — pin it with --map " + col + "=<Label>"}`);
  }
  for (const [col, display, key] of RETURN_COLUMNS) {
    const label = claim(col, key);
    console.log(`  ${(display + " (" + col + ")").padEnd(15)} ← ${label ?? "NOT FOUND — pin it with --map " + key + "=<Label>"}`);
  }

  const unmapped = [...labels.keys()].filter((l) => !claimed.has(l));
  console.log(`\nUnmapped payload labels (${unmapped.length}) — anything useful here?`);
  for (const l of unmapped.slice(0, 40)) console.log(`  ${l} = ${JSON.stringify(labels.get(l)).slice(0, 60)}`);
  if (unmapped.length > 40) console.log(`  … and ${unmapped.length - 40} more`);

  console.log(`\nFirst row as it would be written:`);
  console.log(JSON.stringify(mapped[0], null, 2));
  console.log("\n--inspect: nothing written.");
  process.exit(0);
}

/* ---------- validate ---------- */
if (!asOfDate || !/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
  die("Couldn't determine a clean month-end as-of date from the payload.\nRe-run with --asof YYYY-MM-DD.");
}

const named = mapped.filter((r) => r.strategyName && r.manager);
const dropped = mapped.length - named.length;
// APMI's index rows share the table with the approaches — keep them out of
// the strategy CSV (fetch-benchmark.mjs is what reads them).
const indexRows = named.filter(isIndexRow);
const usable = named.filter((r) => !isIndexRow(r));
if (!usable.length) {
  die(
    "Found rows, but none carried both a strategy name and a manager.\n" +
    "Run again with --inspect to see the labels, then pin them:\n" +
    '  --map strategyName=<Label> --map manager=<Label>',
  );
}

/* ---------- report + write ---------- */
console.log(`Parsed ${usable.length} strategies from the APMI report (as on ${asOfDate}).`);
if (dropped) console.log(`  ${dropped} row(s) skipped — no strategy name and/or manager. Use --inspect to check.`);
if (indexRows.length) {
  console.log(`  ${indexRows.length} benchmark/index row(s) left out of the strategy CSV:`);
  for (const r of indexRows.slice(0, 5)) console.log(`      ${r.strategyName} (${r.manager})`);
  if (indexRows.length > 5) console.log(`      … and ${indexRows.length - 5} more`);
  console.log("      These are what `npm run fetch:benchmark` reads.");
}
console.log(`  rows at: ${rowsPath}`);

console.log("\nExtraction coverage:");
for (const [col, display] of RETURN_COLUMNS) {
  const n = usable.filter((r) => r[col] !== undefined).length;
  const pct = Math.round((n / usable.length) * 100);
  const flag = n === 0 ? "  ← EMPTY: pin it with --map, or the site shows N/A for this window" : "";
  console.log(`  ${display.padEnd(4)} ${String(n).padStart(5)}/${usable.length}  ${String(pct).padStart(3)}%${flag}`);
}
for (const col of ["category", "aumCr", "inceptionDate"]) {
  const n = usable.filter((r) => r[col] !== undefined && r[col] !== "").length;
  console.log(`  ${col.padEnd(4)} ${String(n).padStart(5)}/${usable.length}  ${String(Math.round((n / usable.length) * 100)).padStart(3)}%`);
}

const csv = toCsv(usable, CSV_COLUMNS);
if (args.dryRun) {
  console.log(`\n--dry-run: not written. CSV that WOULD be written to ${args.out}:\n`);
  console.log(csv);
  process.exit(0);
}

const outPath = resolve(args.out);
writeFileSync(outPath, csv, "utf8");
console.log(`\nWrote ${usable.length} rows to ${outPath}`);
console.log("Next: npm run import:pms -- " + args.out);
