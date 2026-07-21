#!/usr/bin/env node
/**
 * SEBI AIF directory fetcher — builds scripts/aif-data.csv from SEBI's public
 * "Recognised Intermediaries" list of registered Alternative Investment Funds
 * (the same authoritative, free source the PMS pipeline leans on APMI for).
 *
 * For each fund it extracts, where published: AIF name, SEBI registration
 * number, category (I / II / III), registration date, and sponsor / manager.
 * Output feeds straight into `npm run import:aif -- scripts/aif-data.csv`,
 * which upserts by registration number.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * IMPORTANT — parser is best-effort, confirm on first run.
 * This was written WITHOUT live access to sebi.gov.in (the build sandbox's
 * egress policy blocks the host at the proxy — a 403 on CONNECT, nothing to
 * do with SEBI). So the exact URL / pagination and the column layout below
 * are a sensible guess at SEBI's structure, not verified against the live
 * page. The parser is header-driven (it maps columns by their heading text,
 * not fixed positions), so it should survive column reordering — but if the
 * first live run finds 0 rows, save a page with --dump and either eyeball the
 * column headings or send the HTML over so the mapping can be pinned.
 *
 * The most reliable path is OFFLINE: open the SEBI AIF list in a browser,
 * save each page's HTML, and parse them without any network at all:
 *   node scripts/fetch-sebi-aif.mjs --dir ./sebi-pages --asof 2026-07-21
 *   node scripts/fetch-sebi-aif.mjs --file p1.html --file p2.html
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Live usage (run from a network that can reach sebi.gov.in):
 *   node scripts/fetch-sebi-aif.mjs --asof 2026-07-21
 *   node scripts/fetch-sebi-aif.mjs --url "<sebi AIF list URL>" --dump ./raw
 *
 * Flags:
 *   --url <u>       Override the SEBI AIF list URL (confirm the real one).
 *   --file <p>      Parse a saved HTML page (repeatable). Skips the network.
 *   --dir <d>       Parse every *.html / *.htm in a directory (sorted).
 *   --out <p>       Output CSV path (default scripts/aif-data.csv).
 *   --asof <date>   Snapshot date stored on every row (default: today).
 *   --delay <ms>    Politeness delay between page fetches (default 1500).
 *   --max-pages <n> Safety cap on live pagination (default 200).
 *   --dump <dir>    Save each fetched page's raw HTML there for inspection.
 *
 * Politeness: requests are sequential, spaced by --delay, and sent with a
 * clear, identifying User-Agent. This never scrapes third-party aggregators —
 * SEBI's own list only.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { normalizeIsoDate } from "./import-shared.mjs";

// Best guess — CONFIRM against the live "Alternative Investment Funds" entry
// under sebi.gov.in → Intermediaries → Recognised. Override with --url.
const DEFAULT_URL = "https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=13";
const USER_AGENT = "PlanMyCashflowsBot/1.0 (+https://planmycashflows.com; contact hello@planmycashflows.com)";
const SOURCE = "SEBI registered intermediaries list";

const CSV_COLUMNS = [
  "fundName", "registrationNo", "category", "registrationDate", "sponsor", "manager",
  "vintage", "fundSizeCr", "minCommitmentCr", "tenorYears",
  "netIrr", "moic", "dpi", "tvpi", "feesManagement", "feesCarry", "feesHurdle",
  "asOfDate", "source", "notes",
];

// ---------- args ----------
function parseArgs(argv) {
  const out = { files: [], delay: 1500, maxPages: 200, out: "scripts/aif-data.csv" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") out.url = argv[++i];
    else if (a === "--file") out.files.push(argv[++i]);
    else if (a === "--dir") out.dir = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--asof") out.asof = argv[++i];
    else if (a === "--delay") out.delay = Number(argv[++i]);
    else if (a === "--max-pages") out.maxPages = Number(argv[++i]);
    else if (a === "--dump") out.dump = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));
if (args.help) { console.log("See the header of scripts/fetch-sebi-aif.mjs for usage."); process.exit(0); }

const asOf = args.asof || new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
  console.error(`--asof must be YYYY-MM-DD (got "${asOf}")`);
  process.exit(1);
}

// ---------- tiny HTML helpers (no deps) ----------
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#160": " " };
function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&(\w+);/g, (m, name) => (name in ENTITIES ? ENTITIES[name] : m));
}
const stripTags = (s) => decodeEntities(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

function extractTables(html) {
  return [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((m) => m[0]);
}
function extractRows(tableHtml) {
  return [...tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) => {
    const cells = [...m[0].matchAll(/<(t[hd])[\s\S]*?<\/\1>/gi)].map((c) => stripTags(c[0]));
    return cells;
  }).filter((cells) => cells.length > 0);
}

// ---------- column mapping (header-driven) ----------
const COLUMN_MATCHERS = {
  // order matters: sponsor/manager checked before the generic name match
  registrationNo: (h) => /regist(ration)?\.?\s*(no|number|code)/i.test(h) || /^reg\.?\s*no/i.test(h),
  registrationDate: (h) => /date\s*of\s*regist/i.test(h) || (/regist/i.test(h) && /date/i.test(h)),
  category: (h) => /categor/i.test(h),
  sponsor: (h) => /sponsor/i.test(h),
  manager: (h) => /manager|investment\s*manager/i.test(h),
  fundName: (h) => /name/i.test(h),
};
function mapColumns(headerCells) {
  const map = {};
  headerCells.forEach((h, i) => {
    for (const [field, test] of Object.entries(COLUMN_MATCHERS)) {
      if (map[field] !== undefined) continue;
      // don't let the generic "name" matcher steal the sponsor/manager columns
      if (field === "fundName" && (/sponsor|manager|contact/i.test(h))) continue;
      if (test(h)) { map[field] = i; break; }
    }
  });
  return map;
}

/** Pick the table that looks like the AIF list (has name + registration). */
function pickAifTable(tables) {
  let best = null, bestScore = 0;
  for (const t of tables) {
    const rows = extractRows(t);
    if (rows.length < 2) continue;
    // try the first couple of rows as potential headers
    for (const headerRow of rows.slice(0, 2)) {
      const map = mapColumns(headerRow);
      const score = (map.fundName !== undefined ? 1 : 0) + (map.registrationNo !== undefined ? 2 : 0)
        + (map.category !== undefined ? 1 : 0);
      if (score > bestScore && map.registrationNo !== undefined) {
        bestScore = score;
        best = { rows, map, headerRow };
      }
    }
  }
  return best;
}

function normalizeCategory(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const m = s.match(/\b(III|II|I)\b/i) || s.match(/([123])/);
  if (!m) return "";
  return ({ 1: "I", 2: "II", 3: "III", I: "I", II: "II", III: "III" })[m[1].toUpperCase()] ?? "";
}

/** Parse one page's HTML into fund records. */
function parsePage(html) {
  const picked = pickAifTable(extractTables(html));
  if (!picked) return [];
  const { rows, map, headerRow } = picked;
  const records = [];
  for (const cells of rows) {
    if (cells === headerRow) continue;
    const at = (f) => (map[f] !== undefined ? (cells[map[f]] ?? "").trim() : "");
    const fundName = at("fundName");
    const registrationNo = at("registrationNo");
    // skip the header itself and any sub-header / total rows
    if (!fundName || !registrationNo) continue;
    if (/registration/i.test(registrationNo) && /number|no/i.test(registrationNo)) continue;
    records.push({
      fundName,
      registrationNo,
      category: normalizeCategory(at("category")),
      registrationDate: normalizeIsoDate(at("registrationDate")) || "",
      sponsor: at("sponsor"),
      manager: at("manager"),
    });
  }
  return records;
}

// ---------- pagination (live) ----------
/** Find a "next page" URL for GET-style pagination, if the page exposes one. */
function findNextUrl(html, currentUrl) {
  // links whose visible text is Next / › / » and point back at the list action
  const linkRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(linkRe)) {
    const href = decodeEntities(m[1]);
    const text = stripTags(m[2]).toLowerCase();
    if (/^(next|next\s*page|›|»|&gt;)$/.test(text) || /\bnext\b/.test(text)) {
      try { return new URL(href, currentUrl).toString(); } catch { /* ignore */ }
    }
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, redirect: "follow" });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}\n${body.slice(0, 400)}`);
  }
  return body;
}

// ---------- CSV ----------
function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(records) {
  const lines = [CSV_COLUMNS.join(",")];
  for (const r of records) {
    const row = { ...r, asOfDate: asOf, source: SOURCE };
    lines.push(CSV_COLUMNS.map((c) => csvCell(row[c])).join(","));
  }
  return lines.join("\n") + "\n";
}

// ---------- run ----------
function dedupe(records) {
  const seen = new Map();
  for (const r of records) if (!seen.has(r.registrationNo)) seen.set(r.registrationNo, r);
  return [...seen.values()];
}

async function fromNetwork() {
  const start = args.url || DEFAULT_URL;
  console.log(`Fetching SEBI AIF list (polite: sequential, ${args.delay}ms apart)\n  start: ${start}`);
  const all = [];
  let url = start;
  let page = 0;
  const visited = new Set();
  while (url && page < args.maxPages && !visited.has(url)) {
    visited.add(url);
    page++;
    let html;
    try {
      html = await fetchPage(url);
    } catch (e) {
      console.error(`\nFetch failed on page ${page}: ${e.message}`);
      if (page === 1) {
        console.error(
          "\nCouldn't read SEBI at all. If this is a network/policy block, run this\n" +
          "from a machine that can reach sebi.gov.in, or save the pages in a browser\n" +
          "and parse them offline with --dir / --file. Confirm the URL with --url.",
        );
        process.exit(1);
      }
      break;
    }
    if (args.dump) {
      const p = join(args.dump, `sebi-aif-page-${String(page).padStart(3, "0")}.html`);
      writeFileSync(p, html);
    }
    const recs = parsePage(html);
    console.log(`  page ${page}: ${recs.length} funds`);
    all.push(...recs);
    const next = findNextUrl(html, url);
    if (!next || next === url) break;
    url = next;
    await sleep(args.delay);
  }
  if (all.length === 0) {
    console.error(
      "\nParsed 0 funds. The page structure likely differs from the built-in guess.\n" +
      "Re-run with --dump ./raw to save the HTML, then confirm the table's column\n" +
      "headings (or share the file) so the column mapping can be pinned.",
    );
    process.exit(1);
  }
  return all;
}

function fromFiles() {
  const paths = [...args.files];
  if (args.dir) {
    for (const f of readdirSync(args.dir).sort()) {
      if (/\.html?$/i.test(f)) paths.push(join(args.dir, f));
    }
  }
  const all = [];
  for (const p of paths) {
    if (!existsSync(p)) { console.error(`No such file: ${p}`); process.exit(1); }
    const recs = parsePage(readFileSync(resolve(p), "utf8"));
    console.log(`  ${p}: ${recs.length} funds`);
    all.push(...recs);
  }
  if (all.length === 0) {
    console.error("\nParsed 0 funds from the saved page(s). Confirm they're the AIF list pages,\n" +
      "and that the table has Name + Registration Number columns.");
    process.exit(1);
  }
  return all;
}

const offline = args.files.length > 0 || args.dir;
const records = dedupe(offline ? fromFiles() : await fromNetwork());

const missingCat = records.filter((r) => !r.category).length;
const missingDate = records.filter((r) => !r.registrationDate).length;
writeFileSync(resolve(args.out), toCsv(records));

console.log(`\nWrote ${records.length} funds → ${args.out} (as of ${asOf}).`);
if (missingCat) console.log(`  ${missingCat} without a category (SEBI didn't publish one, or the column wasn't matched).`);
if (missingDate) console.log(`  ${missingDate} without a registration date.`);
console.log("\nNext: eyeball the CSV, then import it:");
console.log(`  npm run import:aif -- ${args.out}`);
