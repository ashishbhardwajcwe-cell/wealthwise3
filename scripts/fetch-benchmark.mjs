#!/usr/bin/env node
/**
 * Monthly benchmark refresh — S&P BSE 500 TRI → the Sanity `benchmark`
 * document that powers alpha on the PMS explorer and /pms/[slug] pages.
 *
 *   node scripts/fetch-benchmark.mjs [--as-of YYYY-MM-DD] [--dry-run]
 *   npm run fetch:benchmark
 *
 * Data source: APMI's investment-approach report endpoint (loadIAReport) —
 * the same feed behind apmiindia.org's monthly IA performance page. If the
 * response includes benchmark TRI rows, the S&P BSE 500 TRI row is parsed
 * and upserted. If it does not (endpoint changed, no benchmark rows, or
 * the row can't be parsed with confidence), this prints an UPDATE MANUALLY
 * notice and exits 0 — the site keeps serving the last stored values, and
 * we deliberately do NOT scrape third-party sites for index data.
 *
 * Required env (environment or .env.local):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID
 *   SANITY_API_TOKEN                 (Editor/write token)
 * Optional:
 *   APMI_IA_REPORT_URL               override the endpoint URL
 *
 * The document _id is fixed (benchmark-sp-bse-500-tri), so re-running
 * updates the same document — never duplicates. A document created by hand
 * in the Studio works too: the site queries by name, newest asOfDate first.
 */

import { pathToFileURL } from "node:url";
import { requireSanityEnv, num, prune, sanityUpsert } from "./import-shared.mjs";

const BENCH_NAME = "S&P BSE 500 TRI";
const DOC_ID = "benchmark-sp-bse-500-tri";
const ENDPOINT = process.env.APMI_IA_REPORT_URL || "https://www.apmiindia.org/apmi/loadIAReport.htm";

const BENCH_ROW_RE = /s\s*&\s*p\s*bse\s*500\s*tri|bse\s*500\s*tri/i;

// Period → regexes matched against JSON keys or HTML header cells.
const PERIOD_KEYS = {
  m1: [/^(m1|1m)$/i, /1\s*month/i, /one\s*month/i],
  m3: [/^(m3|3m)$/i, /3\s*month/i, /three\s*month/i],
  m6: [/^(m6|6m)$/i, /6\s*month/i, /six\s*month/i],
  y1: [/^(y1|1y)$/i, /1\s*(year|yr)/i, /one\s*(year|yr)/i],
  y2: [/^(y2|2y)$/i, /2\s*(year|yr)/i, /two\s*(year|yr)/i],
  y3: [/^(y3|3y)$/i, /3\s*(year|yr)/i, /three\s*(year|yr)/i],
  y5: [/^(y5|5y)$/i, /5\s*(year|yr)/i, /five\s*(year|yr)/i],
  sinceInception: [/inception/i, /^si$/i],
};

export function matchPeriod(label) {
  for (const [period, patterns] of Object.entries(PERIOD_KEYS)) {
    if (patterns.some((re) => re.test(label.trim()))) return period;
  }
  return null;
}

function manualNotice(reason) {
  console.log(`
========================================================================
  UPDATE BENCHMARK MANUALLY in Sanity Studio
========================================================================
  ${reason}

  The site keeps using the last stored benchmark values until you do —
  nothing is broken, but this month's alpha figures will drift.

  Steps (2 minutes):
    1. Open the Studio → Investment Data → Benchmarks → "${BENCH_NAME}"
       (create it with exactly that name if it doesn't exist yet).
    2. Enter 1M / 3M / 6M / 1Y / 2Y / 3Y from the index provider's
       official factsheet. Leave 5Y and Since-inception EMPTY unless you
       have a clean like-for-like TRI series — empty periods correctly
       suppress alpha on the site.
    3. Set "Data as of" to the month-end and note the source.

  Do NOT copy figures from third-party aggregator sites.
========================================================================
`);
}

/** Recursively collect plain objects from arbitrarily nested JSON. */
function collectObjects(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => collectObjects(n, out));
  else if (node && typeof node === "object") {
    out.push(node);
    Object.values(node).forEach((v) => collectObjects(v, out));
  }
  return out;
}

/** JSON body → returns object, or null if no confident benchmark row. */
export function parseJson(body) {
  for (const obj of collectObjects(body)) {
    const isBenchRow = Object.values(obj).some((v) => typeof v === "string" && BENCH_ROW_RE.test(v));
    if (!isBenchRow) continue;
    const returns = {};
    for (const [key, value] of Object.entries(obj)) {
      const period = matchPeriod(key);
      const n = num(value);
      if (period && n !== undefined && returns[period] === undefined) returns[period] = n;
    }
    if (returns.y1 !== undefined && returns.y3 !== undefined) return returns;
  }
  return null;
}

/** HTML body → returns object via header-cell/row-cell mapping, or null. */
export function parseHtml(html) {
  const stripTags = (s) => s.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  for (const table of html.match(/<table[\s\S]*?<\/table>/gi) ?? []) {
    if (!BENCH_ROW_RE.test(stripTags(table))) continue;
    const rows = (table.match(/<tr[\s\S]*?<\/tr>/gi) ?? []).map((tr) =>
      (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) ?? []).map(stripTags),
    );
    const headerRow = rows.find((cells) => cells.some((c) => matchPeriod(c)));
    const benchRow = rows.find((cells) => cells.some((c) => BENCH_ROW_RE.test(c)));
    if (!headerRow || !benchRow || headerRow.length !== benchRow.length) continue;
    const returns = {};
    headerRow.forEach((label, i) => {
      const period = matchPeriod(label);
      const n = num(benchRow[i]);
      if (period && n !== undefined && returns[period] === undefined) returns[period] = n;
    });
    if (returns.y1 !== undefined && returns.y3 !== undefined) return returns;
  }
  return null;
}

/** Try GET then POST — the endpoint has changed verbs before. */
async function fetchReport() {
  for (const init of [{ method: "GET" }, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "" }]) {
    try {
      const res = await fetch(ENDPOINT, { ...init, headers: { Accept: "application/json, text/html;q=0.9", ...init.headers }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.trim()) return text;
    } catch {
      // fall through to the next verb / the manual notice
    }
  }
  return null;
}

function previousMonthEnd() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), 0); // day 0 = last day of previous month
  return d.toISOString().slice(0, 10);
}

// ---------- main ----------
async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const asOfIdx = argv.indexOf("--as-of");
  const asOfDate = asOfIdx >= 0 ? argv[asOfIdx + 1] : previousMonthEnd();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate ?? "")) {
    console.error(`--as-of must be YYYY-MM-DD (got "${asOfDate}")`);
    process.exit(1);
  }

  const env = requireSanityEnv();

  console.log(`Fetching ${BENCH_NAME} from ${ENDPOINT} …`);
  const body = await fetchReport();
  if (!body) {
    manualNotice(`APMI's loadIAReport endpoint could not be reached (${ENDPOINT}).`);
    process.exit(0);
  }

  let returns = null;
  try {
    returns = parseJson(JSON.parse(body));
  } catch {
    returns = parseHtml(body);
  }

  if (!returns) {
    manualNotice("The loadIAReport response does not include a parseable " +
      `${BENCH_NAME} benchmark row (needs at least 1Y and 3Y figures).`);
    process.exit(0);
  }

  const doc = {
    _id: DOC_ID,
    _type: "benchmark",
    name: BENCH_NAME,
    returns: prune(returns),
    asOfDate,
    source: `APMI IA report (loadIAReport), as of ${asOfDate}`,
  };

  console.log(`Parsed ${BENCH_NAME}:`);
  for (const [k, v] of Object.entries(returns)) console.log(`  ${k.padEnd(14)} ${v}%`);
  console.log(`  asOfDate       ${asOfDate}${asOfIdx >= 0 ? "" : " (default: previous month-end — override with --as-of)"}`);

  if (dryRun) {
    console.log("\n--dry-run: nothing written to Sanity.");
    process.exit(0);
  }

  await sanityUpsert(env, [doc]);
  console.log(`\nUpserted "${BENCH_NAME}" (${DOC_ID}) into Sanity (${env.projectId}/${env.dataset}).`);
  console.log("The explorer and strategy pages pick it up on their next revalidation.");
}

// Run only when invoked directly (node scripts/fetch-benchmark.mjs) — the
// parsers above stay importable for tests without side effects.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
