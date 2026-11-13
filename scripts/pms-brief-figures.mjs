#!/usr/bin/env node
/**
 * Figures for the Monthly PMS Brief (newsletters/issues/YYYY-MM-pms-brief.html),
 * computed from the month's APMI CSV and the benchmark document in Sanity —
 * so no number in an issue is read off a spreadsheet by eye.
 *
 *   node scripts/pms-brief-figures.mjs scripts/pms-data.csv
 *   node scripts/pms-brief-figures.mjs scripts/archive/pms-2026-09-30.csv \
 *        --bench '{"1Y":4.7,"3Y":12.1,"5Y":10.9}'        # replay an old month
 *
 * Writes nothing. Prints every headline figure the issue uses.
 *
 * Benchmark: read exactly the way the site reads it for card alpha — the
 * newest published `benchmark` document (same GROQ as `benchmarkQuery` in
 * sanity/queries.ts; the dataset is publicly readable, no token). If its
 * asOfDate is not the CSV's asOfDate the script STOPS: alpha against last
 * month's index is wrong on every row. `--bench` replaces it (for replaying
 * an archived month only).
 *
 * Rules, matching the site and the September 2026 issue:
 *  - alpha = strategy return − benchmark return, same window
 *    (alphaFor in components/pms/strategy-shared.tsx);
 *  - a window reported as exactly 0.00 has no figure;
 *  - a row with any annualised return (1Y/2Y/3Y/5Y/SI) outside −95%..+300%
 *    is dropped (hasImplausibleReturn in lib/pms.ts);
 *  - rows missing asOfDate or source are rejected.
 * Honour roll / reality check additionally exclude debt, liquid, arbitrage,
 * multi-asset / hybrid / conservative approaches, institutional mandates
 * (isInstitutionalMandate in lib/pms.ts) and anything under ₹100 Cr AUM,
 * then rank on 3-year ALPHA, one strategy per manager.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCsv, requireSanityEnv, sanityQuery } from "./import-shared.mjs";
import { exactKey } from "./pms-pins.mjs";

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--bench");
if (!csvPath) {
  console.error("Usage: node scripts/pms-brief-figures.mjs <pms-csv> [--bench '{\"1Y\":…}']");
  process.exit(1);
}
const benchArg = args.includes("--bench") ? JSON.parse(args[args.indexOf("--bench") + 1]) : null;

/* ---------- read the CSV by header label, never by position ---------- */
const PERIODS = ["1M", "3M", "6M", "1Y", "2Y", "3Y", "4Y", "5Y", "SI"];
const COLUMN_PATTERNS = {
  strategyName: /^strategy\s*name$/i,
  manager: /^manager$/i,
  aumCr: /^aum/i,
  asOfDate: /^as\s*of\s*date$/i,
  source: /^source$/i,
  "1M": /^returns?\s*1\s*m$/i,
  "3M": /^returns?\s*3\s*m$/i,
  "6M": /^returns?\s*6\s*m$/i,
  "1Y": /^returns?\s*1\s*y$/i,
  "2Y": /^returns?\s*2\s*y$/i,
  "3Y": /^returns?\s*3\s*y$/i,
  "4Y": /^returns?\s*4\s*y$/i,
  "5Y": /^returns?\s*5\s*y$/i,
  SI: /^since\s*inception$/i,
};
const rows = parseCsv(readFileSync(resolve(csvPath), "utf8"));
const header = rows[0].map((h) => h.trim());
const col = {};
for (const [k, re] of Object.entries(COLUMN_PATTERNS)) {
  col[k] = header.findIndex((h) => re.test(h));
  if (col[k] === -1) {
    console.error(`CSV has no column matching ${re} (for ${k}). Header: ${header.join(", ")}`);
    process.exit(1);
  }
}
const numOrNull = (v) => {
  const s = String(v ?? "").trim().replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n === 0) return null; // exactly 0.00 = no figure
  return n;
};

let rejected = 0;
const all = [];
for (const r of rows.slice(1)) {
  if (!r.some((c) => c.trim())) continue;
  const get = (k) => (r[col[k]] ?? "").trim();
  if (!get("strategyName") || !get("manager")) continue;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(get("asOfDate")) || !get("source")) {
    rejected++;
    continue;
  }
  const returns = Object.fromEntries(PERIODS.map((p) => [p, numOrNull(get(p))]));
  all.push({
    strategyName: get("strategyName"),
    manager: get("manager"),
    aumCr: numOrNull(get("aumCr")),
    asOfDate: get("asOfDate"),
    source: get("source"),
    returns,
  });
}
// An archived CSV can carry rows a manager last reported months ago. Only the
// newest month is this issue's data; older rows are counted and left out.
const AS_OF = all.map((s) => s.asOfDate).sort().at(-1);
const current = all.filter((s) => s.asOfDate === AS_OF);
const stale = all.length - current.length;
const sources = [...new Set(current.map((s) => s.source))];

const ANNUALISED = ["1Y", "2Y", "3Y", "5Y", "SI"];
const implausible = (s) => ANNUALISED.some((p) => s.returns[p] !== null && (s.returns[p] < -95 || s.returns[p] > 300));
const universe = current.filter((s) => !implausible(s));

/* ---------- benchmark ---------- */
const env = requireSanityEnv({ write: false });
let bench;
if (benchArg) {
  bench = { name: "S&P BSE 500 TRI", asOfDate: AS_OF, source: "--bench override", returns: Object.fromEntries(PERIODS.map((p) => [p, benchArg[p] ?? null])) };
} else {
  // Same query as benchmarkQuery in sanity/queries.ts.
  const b = await sanityQuery(env, `*[_type == "benchmark" && !(_id in path("drafts.**"))] | order(asOfDate desc)[0]{
    name, "returns1m": returns.m1, "returns3m": returns.m3, "returns6m": returns.m6,
    "returns1y": returns.y1, "returns2y": returns.y2, "returns3y": returns.y3,
    "returns4y": returns.y4, "returns5y": returns.y5, "sinceInception": returns.sinceInception,
    asOfDate, source }`);
  if (!b) {
    console.error("No benchmark document in Sanity — STOP. Get the S&P BSE 500 TRI figures for " + AS_OF + ".");
    process.exit(1);
  }
  const f = { "1M": b.returns1m, "3M": b.returns3m, "6M": b.returns6m, "1Y": b.returns1y, "2Y": b.returns2y, "3Y": b.returns3y, "4Y": b.returns4y, "5Y": b.returns5y, SI: b.sinceInception };
  bench = { name: b.name, asOfDate: b.asOfDate, source: b.source, returns: Object.fromEntries(PERIODS.map((p) => [p, typeof f[p] === "number" ? f[p] : null])) };
}
if (bench.asOfDate !== AS_OF) {
  console.error(`Benchmark is as on ${bench.asOfDate}, the CSV as on ${AS_OF} — STOP. Every alpha would be against the wrong month.`);
  process.exit(1);
}
for (const p of ["1Y", "3Y", "5Y"]) {
  if (bench.returns[p] === null) {
    console.error(`Benchmark has no ${p} figure — STOP. It is needed for the scorecard.`);
    process.exit(1);
  }
}

const alpha = (s, p) => (s.returns[p] === null || bench.returns[p] === null ? null : s.returns[p] - bench.returns[p]);
const beatsAll = (s, ps) => ps.every((p) => { const a = alpha(s, p); return a !== null && a > 0; });

/* ---------- scorecard ---------- */
const withFig = (p) => universe.filter((s) => s.returns[p] !== null);
const median = (xs) => {
  const v = [...xs].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const m1 = withFig("1M");
const y1 = withFig("1Y");
const y3 = withFig("3Y");
const full135 = universe.filter((s) => ["1Y", "3Y", "5Y"].every((p) => s.returns[p] !== null));
const beat1 = y1.filter((s) => alpha(s, "1Y") > 0).length;
const beat3 = y3.filter((s) => alpha(s, "3Y") > 0).length;
const all135 = full135.filter((s) => beatsAll(s, ["1Y", "3Y", "5Y"]));

/* ---------- honour roll ---------- */
const EXCLUDE = /\b(debt|liquid|arbitrage|fixed income|income|money market|bond|bonds|credit|yield|treasury|g ?sec|gilt|multi ?asset|hybrid|balanced|conservative|dynamic asset allocation|asset allocation|all weather|absolute return)\b/i;
const institutional = (s) => {
  const name = ` ${s.strategyName.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;
  return [
    "provident fund", "provident funds", "pf", "pfs", "epfo", "epf", "special mandate", "special mandates",
    "customised", "customized", "custom portfolio", "customised portfolio", "customized portfolio",
    "discretionary customised", "non discretionary", "advisory", "co investment", "coinvestment", "esop", "treasury",
  ].some((t) => name.includes(` ${t} `));
};
const equityEligible = (s) => !EXCLUDE.test(s.strategyName) && !institutional(s) && s.aumCr !== null && s.aumCr >= 100;
const onePerManager = (list) => {
  const seen = new Set();
  return list.filter((s) => (seen.has(s.manager.toLowerCase()) ? false : seen.add(s.manager.toLowerCase())));
};
const by3yAlpha = (a, b) => alpha(b, "3Y") - alpha(a, "3Y");
const honourPool = all135.filter(equityEligible).sort(by3yAlpha);
const honour = onePerManager(honourPool);

/* ---------- category leaders (curated Sanity categories only) ---------- */
// Categories are never inferred from APMI data. The CSV's `category` column is
// a name-keyword guess made by the fetch script, so it is NOT used here — only
// the hand-curated category on the Sanity document.
let categoryLeaders = null;
if (!benchArg) {
  const docs = await sanityQuery(env, `*[_type=="pmsStrategy" && !(_id in path("drafts.**")) && defined(category)]{manager, strategyName, category}`);
  const catOf = new Map(docs.map((d) => [exactKey(d.manager, d.strategyName), d.category]));
  const groups = {};
  for (const s of universe) {
    const c = catOf.get(exactKey(s.manager, s.strategyName));
    if (!c) continue;
    (groups[c] ??= { categorised: 0, eligible: [] }).categorised++;
    if (equityEligible(s) && alpha(s, "3Y") !== null) groups[c].eligible.push(s);
  }
  categoryLeaders = Object.entries(groups).map(([category, g]) => ({
    category,
    categorised: g.categorised,
    eligibleWith3Y: g.eligible.length,
    leader: g.eligible.sort(by3yAlpha)[0] ?? null,
  }));
}

/* ---------- reality check ---------- */
// Two eligible strategies with near-identical NEGATIVE 1-year returns and a
// full 5-year record, whose 3-year alpha points in opposite directions.
const rcPool = universe.filter((s) => equityEligible(s) && ["1Y", "3Y", "5Y"].every((p) => s.returns[p] !== null) && s.returns["1Y"] < 0);
const pairs = [];
for (const a of rcPool) {
  if (alpha(a, "3Y") < 5) continue;
  for (const b of rcPool) {
    if (alpha(b, "3Y") > -5 || a.manager === b.manager) continue;
    const gap1y = Math.abs(a.returns["1Y"] - b.returns["1Y"]);
    if (gap1y > 0.3) continue;
    pairs.push({ strong: a, weak: b, gap1y, spread: alpha(a, "3Y") - alpha(b, "3Y") });
  }
}
pairs.sort((x, y) => y.spread - x.spread);

/* ---------- print ---------- */
const pct = (n, d) => `${Math.round((n / d) * 100)}%`;
const f1 = (v) => (v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}`);
const fmtN = (n) => n.toLocaleString("en-IN");
const line = (s) => `${s.strategyName} — ${s.manager}`;
const rets = (s) => `1Y ${f1(s.returns["1Y"])}  3Y ${f1(s.returns["3Y"])}  5Y ${f1(s.returns["5Y"])}  AUM ₹${s.aumCr === null ? "—" : fmtN(Math.round(s.aumCr))} Cr`;

console.log(`PMS brief figures — data as on ${AS_OF}`);
console.log(`Source: ${sources.join(" | ")}`);
console.log(`Benchmark: ${bench.name} as on ${bench.asOfDate} (${bench.source})`);
console.log(`  ${PERIODS.map((p) => `${p} ${bench.returns[p] ?? "—"}`).join("  ")}`);
console.log(`\nRows: ${all.length} read · ${rejected} rejected (no asOfDate/source) · ${stale} stale (older as-of date) · ${current.length - universe.length} implausible dropped · universe ${universe.length}`);

console.log(`\nDesk: ${m1.filter((s) => s.returns["1M"] < 0).length} of ${m1.length} with a 1M figure closed the month lower (1M index ${bench.returns["1M"]})`);
console.log("\nScorecard (alpha > 0):");
console.log(`  1Y        ${beat1} of ${y1.length} beat  (${pct(beat1, y1.length)}) · index ${bench.returns["1Y"]}%`);
console.log(`  3Y        ${beat3} of ${y3.length} beat  (${pct(beat3, y3.length)}) · ${y3.length - beat3} trailed (${pct(y3.length - beat3, y3.length)}) · index ${bench.returns["3Y"]}% a year`);
console.log(`  1+3+5Y    ${all135.length} of ${full135.length} with a 5-year record beat in all three (${pct(all135.length, full135.length)})`);
console.log(`  3Y median ${median(y3.map((s) => s.returns["3Y"])).toFixed(2)}% · gap to index ${(median(y3.map((s) => s.returns["3Y"])) - bench.returns["3Y"]).toFixed(2)} pp`);

console.log(`\nHonour roll — beat the index over 1, 3 and 5Y; equity; ≥₹100 Cr; one per manager; by 3Y alpha (${honourPool.length} eligible rows):`);
honour.slice(0, 8).forEach((s, i) => console.log(`  ${i + 1}. ${line(s)}\n       3Y alpha ${f1(alpha(s, "3Y"))}  ·  ${rets(s)}`));

if (categoryLeaders) {
  console.log("\nCategory leaders by 3Y alpha (curated Sanity categories; equity-eligible, ≥₹100 Cr, with a 3Y figure):");
  for (const c of categoryLeaders) {
    console.log(`  ${c.category.padEnd(9)} ${c.categorised} categorised · ${c.eligibleWith3Y} eligible → ${c.leader ? `${line(c.leader)}  3Y alpha ${f1(alpha(c.leader, "3Y"))}` : "none"}`);
  }
}

console.log("\nReality check — near-identical negative 1Y, opposite 3Y alpha (top candidates):");
for (const p of pairs.slice(0, 5)) {
  console.log(`  1Y gap ${p.gap1y.toFixed(2)} · alpha spread ${p.spread.toFixed(1)}`);
  console.log(`    strong: ${line(p.strong)}  ${rets(p.strong)}  3Y alpha ${f1(alpha(p.strong, "3Y"))}`);
  console.log(`    weak:   ${line(p.weak)}  ${rets(p.weak)}  3Y alpha ${f1(alpha(p.weak, "3Y"))}`);
}
if (!pairs.length) console.log("  none found");
