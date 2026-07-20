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
 * CSV columns (header row required, order doesn't matter):
 *   strategyName*  manager*  category  aumCr  minInvestmentL
 *   returns1m  returns3m  returns6m  returns1y  returns2y  returns3y  returns4y  returns5y  sinceInception
 *   feesFixed  feesPerformance  feesHurdle
 *   asOfDate*  (YYYY-MM-DD)   source*   notes
 *   (* = required — every published figure must carry its as-of date and
 *    source, per the SEBI-compliance rules in this project.)
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

import { requireSanityEnv, readCsvArg, num, slugify, prune, sanityUpsert, sanityQuery } from "./import-shared.mjs";
import { resolveImportTarget } from "./pms-matching.mjs";

const VALID_CATEGORIES = ["Multicap", "Largecap", "Midcap", "Smallcap", "Thematic", "Quant", "Hybrid"];

// ---------- read + validate ----------
const env = requireSanityEnv();
const rows = readCsvArg("pms-template.csv");
const header = rows[0].map((h) => h.trim());
const idx = (name) => header.indexOf(name);
for (const required of ["strategyName", "manager", "asOfDate", "source"]) {
  if (idx(required) === -1) {
    console.error(`CSV is missing the required column "${required}". Expected header:\n` +
      "strategyName,manager,category,aumCr,minInvestmentL,returns1y,returns3y,returns5y,sinceInception,feesFixed,feesPerformance,feesHurdle,asOfDate,source,notes");
    process.exit(1);
  }
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
