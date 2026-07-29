#!/usr/bin/env node
/**
 * PMS data importer — populates the `pmsStrategy` documents in Sanity from a
 * CSV of monthly PMS performance data.
 *
 * Data source (official, free, SEBI-mandated): APMI — Association of
 * Portfolio Managers in India (https://www.apmiindia.org). Every SEBI-
 * registered portfolio manager must publish standardized monthly performance
 * there. Download / copy the figures for the strategies you want to feature
 * into a CSV (template: scripts/pms-template.csv), then run:
 *
 *   node scripts/import-pms.mjs scripts/pms-data.csv
 *
 * Required env vars (read from the environment or a .env.local file):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID   e.g. fhpazm9i
 *   NEXT_PUBLIC_SANITY_DATASET      e.g. production
 *   SANITY_API_TOKEN                token with Editor (write) access
 *
 * CSV columns (header row required, order doesn't matter) — the canonical
 * list is CSV_COLUMNS in ./pms-csv.mjs, and this run prints it on any header
 * error:
 *   strategyName*  manager*  category  aumCr  minInvestmentL  inceptionDate
 *   returns1m  returns3m  returns6m  returns1y  returns2y  returns3y  returns4y  returns5y  sinceInception
 *   feesFixed  feesPerformance  feesHurdle
 *   asOfDate*  (YYYY-MM-DD)   source*   notes
 *   (* = required — every published figure must carry its as-of date and
 *    source, per the SEBI-compliance rules in this project.)
 *
 * Build the CSV with `npm run fetch:pms` (scripts/fetch-pms.mjs) rather than
 * by hand where you can: it extracts all nine return windows from APMI's own
 * report, and a hand-built file is how 1M/3M/6M/2Y came to be blank sitewide.
 * Every run prints per-column coverage and refuses to import a dataset whose
 * return period is empty in every row (override with --allow-gaps).
 *
 * The Sanity document _id is derived from manager + strategy name, so
 * re-running the import next month UPDATES the same records instead of
 * duplicating them. Documents created manually in the Studio are untouched.
 *
 * Rename guard: manager/strategy names drift between refreshes ("Stallion
 * Asset" vs "Stallion Asset Private Limited"), which would mint a duplicate
 * document under a fresh _id. Before writing, each row whose _id doesn't
 * already exist is fuzzy-matched against the existing documents; a unique
 * near-duplicate keeps its existing _id, an ambiguous one aborts the import
 * and asks you to pin the target via the optional `sanityId` CSV column.
 * Hand-curated fields the CSV doesn't provide (category, notes, fees,
 * minInvestmentL) are carried forward from the existing document instead of
 * being wiped by the createOrReplace.
 */

import { readFileSync } from "node:fs";
import { requireSanityEnv, readCsvArg, num, slugify, prune, sanityUpsert, sanityQuery, normalizeIsoDate } from "./import-shared.mjs";
import { CSV_COLUMNS, RETURN_COLUMNS } from "./pms-csv.mjs";
import { resolveImportTarget } from "./pms-matching.mjs";

// Keep in step with the `category` option list in sanity/schemas/pmsStrategy.ts
// — each value becomes a /pms/category/[slug] landing page.
const VALID_CATEGORIES = ["Multicap", "Largecap", "Midcap", "Smallcap", "Thematic", "Quant", "Hybrid", "Debt"];

/*
 * CSV_COLUMNS / RETURN_COLUMNS live in ./pms-csv.mjs — one definition shared
 * with scripts/fetch-pms.mjs, which writes the file this reads.
 *
 * They were moved out of this file because a second, hand-maintained copy is
 * what broke the data: the "expected header" printed here had gone stale,
 * listing only returns1y/3y/5y/sinceInception, so a CSV built from it imported
 * cleanly with returns1m/3m/6m/2y/4y absent and every strategy page shipped
 * showing N/A for those windows.
 */

// ---------- read + validate ----------
const env = requireSanityEnv();
const rows = readCsvArg("pms-template.csv");
const header = rows[0].map((h) => h.trim());
const idx = (name) => header.indexOf(name);
for (const required of ["strategyName", "manager", "asOfDate", "source"]) {
  if (idx(required) === -1) {
    console.error(`CSV is missing the required column "${required}". Expected header:\n${CSV_COLUMNS.join(",")}`);
    process.exit(1);
  }
}

// The template is what people copy to build a month's CSV, so it drifting
// from CSV_COLUMNS would reintroduce the exact bug this list exists to stop.
try {
  const templateHeader = readFileSync(new URL("./pms-template.csv", import.meta.url), "utf8")
    .split("\n")[0].trim().split(",").map((h) => h.trim());
  if (templateHeader.join(",") !== CSV_COLUMNS.join(",")) {
    console.warn(
      "WARNING: scripts/pms-template.csv no longer matches this importer's column list.\n" +
      `         template: ${templateHeader.join(",")}\n` +
      `         importer: ${CSV_COLUMNS.join(",")}\n` +
      "         Bring them back in step — the template is what next month's CSV is built from.\n",
    );
  }
} catch {
  // Template missing (script copied elsewhere) — not worth failing the import.
}

// A misspelled column ("return1m", "returns_3m", a stray Excel export column)
// used to import as a silent blank. Name them so they can be fixed.
const unknown = header.filter((h) => h && !CSV_COLUMNS.includes(h));
if (unknown.length) {
  console.warn(
    `WARNING: ${unknown.length} unrecognised CSV column(s), ignored: ${unknown.join(", ")}\n` +
    `         Recognised columns: ${CSV_COLUMNS.join(",")}\n` +
    "         A misspelled column imports as blank — check these before continuing.\n",
  );
}

const docs = [];
const errors = [];
rows.slice(1).forEach((r, i) => {
  const get = (name) => (idx(name) >= 0 ? (r[idx(name)] ?? "").trim() : "");
  const line = i + 2;
  const strategyName = get("strategyName");
  const manager = get("manager");
  const asOfDate = get("asOfDate");
  const source = get("source");

  if (!strategyName || !manager) return errors.push(`line ${line}: strategyName and manager are required`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) return errors.push(`line ${line}: asOfDate must be YYYY-MM-DD (got "${asOfDate}")`);
  if (!source) return errors.push(`line ${line}: source is required (e.g. "APMI monthly report, May 2026")`);
  const category = get("category");
  if (category && !VALID_CATEGORIES.includes(category)) {
    return errors.push(`line ${line}: category "${category}" must be one of ${VALID_CATEGORIES.join(", ")} (or empty)`);
  }

  const returns = {
    m1: num(get("returns1m")),
    m3: num(get("returns3m")),
    m6: num(get("returns6m")),
    y1: num(get("returns1y")),
    y2: num(get("returns2y")),
    y3: num(get("returns3y")),
    y4: num(get("returns4y")),
    y5: num(get("returns5y")),
    sinceInception: num(get("sinceInception")),
  };
  const fees = {
    fixed: num(get("feesFixed")),
    performance: num(get("feesPerformance")),
    hurdle: num(get("feesHurdle")),
  };

  // APMI publishes each investment approach's inception date. It's the one
  // date that tells a reader whether a "since inception" figure covers two
  // years or twenty, so a blank one is tolerated but a malformed one is not.
  const inceptionDate = normalizeIsoDate(get("inceptionDate"));
  if (inceptionDate === null) {
    return errors.push(`line ${line}: inceptionDate "${get("inceptionDate")}" is not a date I can read (use YYYY-MM-DD, DD-MMM-YYYY or DD/MM/YYYY)`);
  }

  docs.push({
    _id: get("sanityId") || `pmsStrategy-${slugify(`${manager}-${strategyName}`)}`,
    _type: "pmsStrategy",
    // sanityId column set → the target doc is pinned by hand; skip matching.
    __pinned: !!get("sanityId"),
    strategyName,
    manager,
    ...(category ? { category } : {}),
    ...(num(get("aumCr")) !== undefined ? { aumCr: num(get("aumCr")) } : {}),
    ...(num(get("minInvestmentL")) !== undefined ? { minInvestmentL: num(get("minInvestmentL")) } : {}),
    ...(inceptionDate ? { inceptionDate } : {}),
    ...(prune(returns) ? { returns: prune(returns) } : {}),
    ...(prune(fees) ? { fees: prune(fees) } : {}),
    asOfDate,
    source,
    ...(get("notes") ? { notes: get("notes") } : {}),
  });
});

if (errors.length) {
  console.error(`Validation failed — nothing imported:\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
if (!docs.length) {
  console.error("No valid data rows found — nothing to import.");
  process.exit(1);
}

// ---------- coverage report ----------
/**
 * How many rows actually carry each field. A blank column is valid CSV and
 * imports without complaint, so the only way a whole missing period shows up
 * is on the live site months later — which is how 1M, 3M, 6M and 2Y came to
 * read N/A on every strategy page. Print the counts every run, and shout when
 * a period is empty across the board.
 */
function coverage(label, present) {
  const pct = Math.round((present / docs.length) * 100);
  const bar = "█".repeat(Math.round(pct / 5)).padEnd(20, "·");
  return `  ${label.padEnd(14)} ${bar} ${String(present).padStart(5)}/${docs.length}  ${String(pct).padStart(3)}%`;
}

const empty = [];
console.log(`\nColumn coverage across ${docs.length} rows:`);
for (const [col, periodLabel, sanityKey] of RETURN_COLUMNS) {
  const n = docs.filter((d) => d.returns?.[sanityKey] !== undefined).length;
  console.log(coverage(`${periodLabel} return`, n));
  if (n === 0) empty.push({ col, periodLabel });
}
for (const [label, test] of [
  ["category", (d) => !!d.category],
  ["AUM", (d) => d.aumCr !== undefined],
  ["inception", (d) => !!d.inceptionDate],
]) {
  console.log(coverage(label, docs.filter(test).length));
}

if (empty.length) {
  const bar = "─".repeat(64);
  console.warn(`\n${bar}`);
  console.warn(`WARNING: ${empty.length} return period(s) are empty in EVERY row`);
  console.warn(bar);
  console.warn(`Empty: ${empty.map((e) => e.periodLabel).join(", ")}`);
  console.warn(
    `\nThose periods will render "N/A" on every strategy page, in the explorer's\n` +
    "tile grid and in the compare table — the site has no other source for them.\n" +
    `Check the CSV actually has the ${empty.map((e) => e.col).join(", ")} ` +
    `column${empty.length > 1 ? "s" : ""}, and that ${empty.length > 1 ? "they are" : "it is"} filled.\n` +
    "APMI publishes all nine windows in the same table.\n" +
    "\nRe-run with --allow-gaps if the periods really are unpublished this month.",
  );
  console.warn(`${bar}\n`);
  if (!process.argv.includes("--allow-gaps")) {
    console.error("Nothing imported. Fix the CSV, or pass --allow-gaps to import anyway.");
    process.exit(1);
  }
}

// ---------- rename guard + carry-forward ----------
const existing = await sanityQuery(
  env,
  `*[_type == "pmsStrategy" && !(_id in path("drafts.**"))]{ _id, strategyName, manager, category, notes, minInvestmentL, fees }`,
);
const existingById = new Map(existing.map((d) => [d._id, d]));

const label = (d) => `${d.manager} — ${d.strategyName}`;
const renamed = [];
const created = [];
const ambiguous = [];
const claimed = new Map(); // target _id → row label, to catch two rows resolving to one doc

for (const doc of docs) {
  let target;
  if (doc.__pinned) {
    target = { id: doc._id, matchType: existingById.has(doc._id) ? "exact" : "new" };
  } else {
    target = resolveImportTarget(doc, existingById, existing);
  }
  if (target.matchType === "ambiguous") {
    ambiguous.push({ doc, candidates: target.candidates });
    continue;
  }
  if (claimed.has(target.id)) {
    ambiguous.push({ doc, note: `resolves to the same document as row "${claimed.get(target.id)}" (${target.id})` });
    continue;
  }
  claimed.set(target.id, label(doc));
  if (target.matchType === "renamed") renamed.push({ row: label(doc), keeps: label(target.matched), id: target.id });
  if (target.matchType === "new") created.push(label(doc));
  doc._id = target.id;

  // createOrReplace would wipe fields the CSV doesn't carry — keep the
  // hand-curated ones from the existing document.
  const prev = existingById.get(doc._id);
  if (prev) {
    if (!doc.category && prev.category) doc.category = prev.category;
    if (!doc.notes && prev.notes) doc.notes = prev.notes;
    if (doc.minInvestmentL === undefined && prev.minInvestmentL !== undefined) doc.minInvestmentL = prev.minInvestmentL;
    if (!doc.fees && prev.fees) doc.fees = prev.fees;
  }
  delete doc.__pinned;
}

if (ambiguous.length) {
  console.error("Ambiguous rows — nothing imported. Pin each row's target with the `sanityId` CSV column and re-run:");
  for (const a of ambiguous) {
    console.error(`  • ${label(a.doc)}`);
    if (a.note) console.error(`      ${a.note}`);
    for (const c of a.candidates ?? []) console.error(`      candidate: ${label(c)} [${c._id}]`);
  }
  process.exit(1);
}

await sanityUpsert(env, docs);

console.log(`Imported ${docs.length} PMS strategies into Sanity (${env.projectId}/${env.dataset}):`);
console.log(`  ${docs.length - renamed.length - created.length} updated · ${renamed.length} matched despite a rename · ${created.length} new`);
for (const d of docs) console.log(`  • ${d.manager} — ${d.strategyName} (as of ${d.asOfDate})`);
if (renamed.length) {
  console.log("\nRename matches (CSV name → existing document kept):");
  for (const r of renamed) console.log(`  • ${r.row} → ${r.keeps}  [${r.id}]`);
}
console.log("\nThe /investment-products/pms page will show them after the next revalidation/deploy.");
