/**
 * Shared reader for APMI's investment-approach report (the `loadIAReport`
 * payload) — used by fetch-benchmark.mjs for the benchmark TRI row and by
 * fetch-pms.mjs for the strategy rows.
 *
 * APMI is the official, SEBI-mandated source: every registered portfolio
 * manager files standardised monthly TWRR performance there. The payload's
 * exact field names are not contractual and have changed shape before, so
 * nothing here is keyed to a literal name. Every field is found by matching
 * a set of patterns against the row's labels, and every extractor can be
 * overridden from the command line when a guess is wrong. `--inspect` on
 * either script prints what was detected so a mismatch is a five-second fix
 * rather than a silent blank column.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { num, normalizeIsoDate } from "./import-shared.mjs";

/* ---------- loading ---------- */

/**
 * Read the report from --file or --url. Returns { ok: true, report } or
 * { ok: false, reason } — callers decide whether a miss is fatal (fetch-pms)
 * or an expected monthly branch (fetch-benchmark's manual notice).
 */
export async function loadApmiReport({ file, url }) {
  if (file) {
    let raw;
    try {
      raw = readFileSync(resolve(file), "utf8");
    } catch (e) {
      return { ok: false, reason: `Couldn't read --file "${file}": ${e.message}` };
    }
    try {
      return { ok: true, report: JSON.parse(raw) };
    } catch {
      return { ok: false, reason: `--file "${file}" is not valid JSON — expected the APMI loadIAReport payload.` };
    }
  }
  const endpoint = url || process.env.APMI_REPORT_URL;
  if (!endpoint) {
    return {
      ok: false,
      reason:
        "No APMI report to read: pass --file <apmi.json> (a saved loadIAReport\n" +
        "payload) or --url <endpoint> / set APMI_REPORT_URL.",
    };
  }
  try {
    const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
    if (!res.ok) return { ok: false, reason: `APMI report fetch failed (HTTP ${res.status}) from ${endpoint}.` };
    return { ok: true, report: await res.json() };
  } catch (e) {
    return { ok: false, reason: `APMI report fetch failed (${e.message}) from ${endpoint}.` };
  }
}

/* ---------- flattening ---------- */

/**
 * Flatten a row into [label, value] pairs — direct fields, one level of
 * nested objects, and array-of-entry shapes like
 * performance:[{period:"1Y", value:12.3}, …].
 */
export function labelValuePairs(row) {
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

/* ---------- period returns ---------- */

/** Label patterns for each return window, keyed by the Sanity field name. */
export const PERIOD_SPECS = [
  { key: "m1", res: [/^r?1\s*m(o(nth)?)?$/i, /1[-_ ]?month/i] },
  { key: "m3", res: [/^r?3\s*m(o(nth)?)?$/i, /3[-_ ]?month/i] },
  { key: "m6", res: [/^r?6\s*m(o(nth)?)?$/i, /6[-_ ]?month/i] },
  { key: "y1", res: [/^r?1\s*y(ea)?r?$/i, /1[-_ ]?year/i, /^12\s*m(o(nth)?)?$/i, /12[-_ ]?month/i] },
  { key: "y2", res: [/^r?2\s*y(ea)?r?$/i, /2[-_ ]?year/i] },
  { key: "y3", res: [/^r?3\s*y(ea)?r?$/i, /3[-_ ]?year/i] },
  { key: "y4", res: [/^r?4\s*y(ea)?r?$/i, /4[-_ ]?year/i] },
  { key: "y5", res: [/^r?5\s*y(ea)?r?$/i, /5[-_ ]?year/i] },
  { key: "sinceInception", res: [/since[-_ ]?inception/i, /^si$/i, /inception[-_ ]?return/i] },
];

/**
 * Pull the period returns out of a row. `overrides` maps a Sanity key to an
 * exact payload label, for when the patterns miss (--map y2=RET_2YR).
 */
export function extractReturns(row, overrides = {}) {
  const pairs = labelValuePairs(row);
  const returns = {};
  for (const { key, res } of PERIOD_SPECS) {
    const exact = overrides[key];
    for (const [label, value] of pairs) {
      const l = String(label).trim();
      const hit = exact ? l === exact : res.some((re) => re.test(l));
      if (!hit) continue;
      const n = num(value);
      if (n !== undefined) { returns[key] = n; break; }
    }
  }
  return returns;
}

/* ---------- descriptive fields ---------- */

/**
 * Label patterns for the non-return columns. Ordered most- to least-specific:
 * `inceptionDate` is matched before any generic date, and `strategyName`
 * before `manager`, because APMI rows carry several name-ish fields.
 */
export const FIELD_SPECS = [
  { key: "strategyName", res: [/investment[-_ ]?approach[-_ ]?name/i, /^ia[-_ ]?name$/i, /strategy[-_ ]?name/i, /approach[-_ ]?name/i, /scheme[-_ ]?name/i, /^investment[-_ ]?approach$/i] },
  { key: "manager", res: [/portfolio[-_ ]?manager[-_ ]?name/i, /^pm[-_ ]?name$/i, /portfolio[-_ ]?manager/i, /manager[-_ ]?name/i, /^manager$/i, /company[-_ ]?name/i, /^amc$/i] },
  { key: "category", res: [/investment[-_ ]?approach[-_ ]?type/i, /strategy[-_ ]?type/i, /^category$/i, /asset[-_ ]?class/i] },
  { key: "aumCr", res: [/aum/i, /assets[-_ ]?under[-_ ]?management/i] },
  { key: "inceptionDate", res: [/inception[-_ ]?date/i, /date[-_ ]?of[-_ ]?inception/i, /launch[-_ ]?date/i, /commencement/i] },
];

/** First matching [label, value] for a field spec, or undefined. */
export function extractField(row, key, overrides = {}) {
  const spec = FIELD_SPECS.find((f) => f.key === key);
  const exact = overrides[key];
  for (const [label, value] of labelValuePairs(row)) {
    const l = String(label).trim();
    const hit = exact ? l === exact : spec?.res.some((re) => re.test(l));
    if (hit && String(value).trim() !== "") return value;
  }
  return undefined;
}

/* ---------- locating the rows ---------- */

/**
 * The report is one big table, so the strategy rows are the largest array of
 * plain objects anywhere in the payload. Returns { rows, path } so --inspect
 * can show WHERE they were found and the caller can override with --rows-at.
 */
export function findRowArray(node, path = "$", best = { rows: [], path: null }, seen = new Set()) {
  if (!node || typeof node !== "object" || seen.has(node)) return best;
  seen.add(node);
  if (Array.isArray(node)) {
    const objects = node.filter((v) => v && typeof v === "object" && !Array.isArray(v));
    if (objects.length > best.rows.length) best = { rows: objects, path };
    node.forEach((v, i) => { best = findRowArray(v, `${path}[${i}]`, best, seen); });
    return best;
  }
  for (const [k, v] of Object.entries(node)) best = findRowArray(v, `${path}.${k}`, best, seen);
  return best;
}

/** Follow a dotted path ("$.d.Table1") to a node; undefined when absent. */
export function nodeAtPath(report, path) {
  let node = report;
  for (const part of path.replace(/^\$\.?/, "").split(".")) {
    if (!part) continue;
    const m = part.match(/^(.*?)\[(\d+)\]$/);
    const key = m ? m[1] : part;
    if (key) node = node?.[key];
    if (m) node = node?.[Number(m[2])];
    if (node === undefined) return undefined;
  }
  return node;
}

/* ---------- benchmark rows ---------- */

/**
 * True when a row is a benchmark/index line rather than a manager's strategy.
 *
 * APMI publishes the index rows in the same table as the approaches — that's
 * how fetch-benchmark.mjs finds the S&P BSE 500 TRI figures. The strategy
 * extraction has to leave them out, or the site gains a fake "S&P BSE 500 TRI"
 * strategy with its own page, sitemap entry and AMC hub.
 *
 * Deliberately narrow, and the caller reports what it skipped rather than
 * dropping rows silently: a real approach called "Nifty Advantage" or
 * "Index Plus" must NOT match. Only an explicit benchmark/index manager, or a
 * name carrying the total-return-index marker, counts.
 */
export function isIndexRow({ strategyName = "", manager = "" }) {
  if (/^(benchmark|benchmarks|index|indices)$/i.test(String(manager).trim())) return true;
  if (/\btri\b|total\s*return\s*index/i.test(String(strategyName))) return true;
  return false;
}

/* ---------- as-of date ---------- */

/** Best-effort month-end from the payload — a date-ish value under a
 *  date-ish key, normalised to YYYY-MM-DD. */
export function detectAsOf(node, depth = 0, seen = new Set()) {
  if (!node || typeof node !== "object" || depth > 4 || seen.has(node)) return null;
  seen.add(node);
  const entries = Array.isArray(node) ? node.map((v, i) => [String(i), v]) : Object.entries(node);
  for (const [k, v] of entries) {
    if (typeof v === "string" && /as[-_ ]?on|as[-_ ]?of|report.*date|date|period|month/i.test(k)) {
      const iso = normalizeIsoDate(v);
      if (iso) return iso;
    }
  }
  for (const [, v] of entries) {
    const hit = detectAsOf(v, depth + 1, seen);
    if (hit) return hit;
  }
  return null;
}

/* ---------- CLI helper ---------- */

/** Parse repeated `--map key=Label` flags into { key: "Label" }. */
export function parseMapFlags(values = []) {
  const out = {};
  for (const v of values) {
    const i = String(v).indexOf("=");
    if (i > 0) out[String(v).slice(0, i).trim()] = String(v).slice(i + 1).trim();
  }
  return out;
}
