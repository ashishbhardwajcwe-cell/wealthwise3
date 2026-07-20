#!/usr/bin/env node
/**
 * Benchmark refresher — keeps the `benchmark` document in Sanity
 * (S&P BSE 500 TRI) current, so the PMS explorer's alpha, consistency dots
 * and "beat benchmark only" filter all measure against a live figure instead
 * of a value hardcoded in the front-end.
 *
 * Runs ALONGSIDE the monthly PMS import (scripts/import-pms.mjs). The only
 * data source is APMI's own investment-approach report — the same official,
 * SEBI-mandated dataset the strategy returns come from. APMI's report
 * endpoint (`loadIAReport`) carries the benchmark TRI rows next to the
 * strategy rows; this script looks for the "S&P BSE 500 TRI" row and, if it's
 * there, upserts it into Sanity.
 *
 * If the response does NOT carry that benchmark row (or no APMI report is
 * provided), the script prints a clear "UPDATE BENCHMARK MANUALLY in Sanity
 * Studio" notice and writes nothing. It deliberately does NOT scrape PMS
 * Bazaar or any other third-party site for the figure.
 *
 * Usage:
 *   # Feed a saved APMI loadIAReport JSON payload (most reliable):
 *   node scripts/fetch-benchmark.mjs --file scripts/apmi-report.json \
 *        --asof 2026-06-30 --source "APMI monthly report, Jun 2026"
 *
 *   # Or fetch the endpoint directly (needs outbound access to APMI):
 *   node scripts/fetch-benchmark.mjs --url "$APMI_REPORT_URL" --asof 2026-06-30
 *
 *   # Preview the parsed document without writing:
 *   node scripts/fetch-benchmark.mjs --file scripts/apmi-report.json --dry-run
 *
 * Flags:
 *   --file <path>     Read the APMI report JSON from disk instead of fetching.
 *   --url <endpoint>  Fetch the report from this URL (or set APMI_REPORT_URL).
 *   --asof YYYY-MM-DD The month-end the figures are as of. Auto-detected from
 *                     the report when possible; this overrides it.
 *   --source "..."    Attribution string stored on the document.
 *   --dry-run         Parse and print, but don't write to Sanity.
 *
 * Sanity write env (only needed when actually writing):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_API_TOKEN (Editor/write token).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { requireSanityEnv, num, sanityUpsert } from "./import-shared.mjs";

const BENCHMARK_ID = "benchmark-sp-bse-500-tri";
const BENCHMARK_NAME = "S&P BSE 500 TRI";

// ---------- args ----------
function parseArgs(argv) {
  const out = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--file") out.file = argv[++i];
    else if (a === "--url") out.url = argv[++i];
    else if (a === "--asof") out.asof = argv[++i];
    else if (a === "--source") out.source = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log("See the header of scripts/fetch-benchmark.mjs for usage.");
  process.exit(0);
}

// ---------- the manual-update escape hatch ----------
/** Print the "do it by hand" notice and exit 0 — this is an expected monthly
 *  branch (APMI didn't carry the benchmark row), not a pipeline failure, so a
 *  chained `&&` command keeps going. */
function manualNotice(reason) {
  const bar = "─".repeat(64);
  console.log(`\n${bar}`);
  console.log("UPDATE BENCHMARK MANUALLY in Sanity Studio");
  console.log(bar);
  console.log(reason);
  console.log(
    "\nDo NOT scrape PMS Bazaar or any other third-party site for this figure.\n" +
    "The only sanctioned source is APMI's own report.\n\n" +
    "Open Sanity Studio → Investment Data → Benchmark (S&P BSE 500 TRI) and set,\n" +
    "straight from the APMI monthly report:\n" +
    `  • Name:       ${BENCHMARK_NAME}\n` +
    "  • 1M · 3M · 6M · 1Y · 2Y · 3Y   (leave 5Y / SI blank unless APMI\n" +
    "                                   carries a clean like-for-like TRI series)\n" +
    "  • Data as of: the month-end, YYYY-MM-DD\n" +
    '  • Source:     e.g. "APMI monthly report, Jun 2026"\n\n' +
    "Until then the site keeps showing the last stored benchmark — it never\n" +
    "crashes and never shows a blank.",
  );
  console.log(`${bar}\n`);
  process.exit(0);
}

// ---------- load the APMI report ----------
async function loadReport() {
  if (args.file) {
    let raw;
    try {
      raw = readFileSync(resolve(args.file), "utf8");
    } catch (e) {
      manualNotice(`Couldn't read --file "${args.file}": ${e.message}`);
    }
    try {
      return JSON.parse(raw);
    } catch {
      manualNotice(`--file "${args.file}" is not valid JSON — expected the APMI loadIAReport payload.`);
    }
  }
  const url = args.url || process.env.APMI_REPORT_URL;
  if (!url) {
    manualNotice(
      "No APMI report to read: pass --file <apmi.json> (a saved loadIAReport\n" +
      "payload) or --url <endpoint> / set APMI_REPORT_URL.",
    );
  }
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) manualNotice(`APMI report fetch failed (HTTP ${res.status}) from ${url}.`);
    return await res.json();
  } catch (e) {
    manualNotice(`APMI report fetch failed (${e.message}) from ${url}.`);
  }
}

// ---------- parsing ----------
/** True when a string names the S&P BSE 500 total-return index, tolerant of
 *  spacing/punctuation ("S&P BSE 500 - TRI", "BSE 500 Total Return", …). */
function isBse500Tri(str) {
  const s = String(str).toLowerCase();
  return /bse\s*500/.test(s) && (/\btri\b/.test(s) || /t\.?r\.?i\.?/.test(s) || /total\s*return/.test(s));
}

/** Recursively find the first object anywhere in the payload that carries a
 *  BSE-500-TRI name in one of its string fields. */
function findBenchmarkRow(node, seen = new Set()) {
  if (!node || typeof node !== "object" || seen.has(node)) return null;
  seen.add(node);
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findBenchmarkRow(item, seen);
      if (hit) return hit;
    }
    return null;
  }
  for (const v of Object.values(node)) {
    if (typeof v === "string" && isBse500Tri(v)) return node;
  }
  for (const v of Object.values(node)) {
    const hit = findBenchmarkRow(v, seen);
    if (hit) return hit;
  }
  return null;
}

const PERIOD_SPECS = [
  { key: "m1", res: [/^r?1\s*m(o(nth)?)?$/i, /1[-_ ]?month/i] },
  { key: "m3", res: [/^r?3\s*m(o(nth)?)?$/i, /3[-_ ]?month/i] },
  { key: "m6", res: [/^r?6\s*m(o(nth)?)?$/i, /6[-_ ]?month/i] },
  { key: "y1", res: [/^r?1\s*y(ea)?r?$/i, /1[-_ ]?year/i, /^12\s*m(o(nth)?)?$/i, /12[-_ ]?month/i] },
  { key: "y2", res: [/^r?2\s*y(ea)?r?$/i, /2[-_ ]?year/i] },
  { key: "y3", res: [/^r?3\s*y(ea)?r?$/i, /3[-_ ]?year/i] },
  { key: "y5", res: [/^r?5\s*y(ea)?r?$/i, /5[-_ ]?year/i] },
  { key: "sinceInception", res: [/since[-_ ]?inception/i, /^si$/i, /inception/i] },
];

/** Flatten a benchmark row into [label, value] pairs — direct fields, one
 *  level of nested objects, and array-of-entry shapes like
 *  performance:[{period:"1Y", value:12.3}, …]. */
function labelValuePairs(row) {
  const pairs = [];
  const pushObj = (obj) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) continue;
      if (typeof v === "object" && !Array.isArray(v)) pushObj(v);
      else if (typeof v !== "object") pairs.push([k, v]);
    }
  };
  pushObj(row);
  for (const v of Object.values(row)) {
    if (!Array.isArray(v)) continue;
    for (const item of v) {
      if (!item || typeof item !== "object") continue;
      const label = item.period ?? item.label ?? item.tenure ?? item.tenor ?? item.horizon ?? item.name;
      const val = item.value ?? item.return ?? item.returns ?? item.performance ?? item.cagr ?? item.twrr;
      if (label != null && val != null) pairs.push([String(label), val]);
    }
  }
  return pairs;
}

/** Pull the eight period returns out of a benchmark row. */
function extractReturns(row) {
  const pairs = labelValuePairs(row);
  const returns = {};
  for (const { key, res } of PERIOD_SPECS) {
    for (const [label, value] of pairs) {
      if (res.some((re) => re.test(String(label).trim()))) {
        const n = num(value);
        if (n !== undefined) { returns[key] = n; break; }
      }
    }
  }
  return returns;
}

/** Best-effort as-of date from the payload — a YYYY-MM-DD or DD-MMM-YYYY
 *  string under a date-ish key. */
function detectAsOf(node, depth = 0, seen = new Set()) {
  if (!node || typeof node !== "object" || depth > 4 || seen.has(node)) return null;
  seen.add(node);
  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const toIso = (s) => {
    const v = String(s).trim();
    let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = v.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[a-z]*[-/ ](\d{4})$/);
    if (m && MONTHS[m[2].toLowerCase()]) {
      return `${m[3]}-${String(MONTHS[m[2].toLowerCase()]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    }
    return null;
  };
  const entries = Array.isArray(node) ? node.map((v, i) => [String(i), v]) : Object.entries(node);
  for (const [k, v] of entries) {
    if (typeof v === "string" && /as[-_ ]?on|as[-_ ]?of|report.*date|date|period|month/i.test(k)) {
      const iso = toIso(v);
      if (iso) return iso;
    }
  }
  for (const [, v] of entries) {
    const hit = detectAsOf(v, depth + 1, seen);
    if (hit) return hit;
  }
  return null;
}

// ---------- run ----------
const report = await loadReport();
const row = findBenchmarkRow(report);
if (!row) {
  manualNotice("The APMI report was read, but it carried no S&P BSE 500 TRI benchmark row.");
}

const returns = extractReturns(row);
if (Object.keys(returns).length === 0) {
  manualNotice("Found an S&P BSE 500 TRI row, but couldn't read any period returns from it.");
}

const asOfDate = args.asof || detectAsOf(report);
if (!asOfDate || !/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
  manualNotice(
    "Parsed the benchmark returns, but couldn't determine a clean month-end\n" +
    "as-of date. Re-run with --asof YYYY-MM-DD (and --source \"…\"), or set it\n" +
    "by hand in Studio.",
  );
}

const monthLabel = new Date(`${asOfDate}T00:00:00Z`).toLocaleString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const source = args.source || `APMI investment-approach report (loadIAReport), ${monthLabel}`;

const doc = {
  _id: BENCHMARK_ID,
  _type: "benchmark",
  name: BENCHMARK_NAME,
  returns,
  asOfDate,
  source,
};

const order = ["m1", "m3", "m6", "y1", "y2", "y3", "y5", "sinceInception"];
const labels = { m1: "1M", m3: "3M", m6: "6M", y1: "1Y", y2: "2Y", y3: "3Y", y5: "5Y", sinceInception: "SI" };
console.log(`Parsed ${BENCHMARK_NAME} from the APMI report (as of ${asOfDate}):`);
console.log("  " + order.map((k) => `${labels[k]}=${k in returns ? returns[k] : "—"}`).join("  "));
console.log(`  source: ${source}`);

if (args.dryRun) {
  console.log("\n--dry-run: nothing written. Document that WOULD be written:");
  console.log(JSON.stringify(doc, null, 2));
  process.exit(0);
}

const env = requireSanityEnv();
await sanityUpsert(env, [doc]);
console.log(`\nUpserted the benchmark into Sanity (${env.projectId}/${env.dataset}).`);
console.log("The PMS explorer and strategy pages pick it up on their next revalidation (≤5 min) or the next deploy.");
