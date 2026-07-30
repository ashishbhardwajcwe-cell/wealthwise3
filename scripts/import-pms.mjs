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
 * Rows are matched to existing documents by their normalised (manager,
 * strategyName) pair, NOT by a name-derived id, so re-running the import next
 * month UPDATES the same records instead of duplicating them. Documents
 * created manually in the Studio are untouched.
 *
 * Rename guard: manager/strategy names drift between refreshes ("Stallion
 * Asset" vs "Stallion Asset Private Limited"), which would mint a duplicate
 * document. A row that matches no existing pair is fuzzy-matched against the
 * existing documents; a unique near-duplicate keeps its existing _id, an
 * ambiguous one aborts the import and asks you to pin the target via the
 * optional `sanityId` CSV column. Hand-curated fields the CSV doesn't provide
 * (category, notes, fees, minInvestmentL) are carried forward from the
 * existing document instead of being wiped by the createOrReplace.
 *
 *   node scripts/import-pms.mjs scripts/pms-data.csv --dry-run
 *
 * --dry-run resolves every row against Sanity and prints what it WOULD do —
 * would-update / would-create / ambiguous counts, plus any existing document
 * that looks like a victim of the old id scheme — without writing anything.
 * It needs only NEXT_PUBLIC_SANITY_PROJECT_ID (the dataset reads publicly);
 * an Editor token is only required for a real run.
 *
 * Pins: the rows that are genuinely ambiguous (two HDFC "MF Select" variants,
 * Neo's Club Moderate / Moderately Conservative / Moderately Aggressive set)
 * are resolved once in scripts/pms-pins.json and applied automatically here.
 * They used to be recorded in the CSV's own sanityId column — which the
 * monthly APMI fetch regenerates, so the answer was deleted every month and
 * the same rows aborted the import every month. The CSV column still works
 * and still wins, as a one-off override.
 */

import { readFileSync } from "node:fs";
import { requireSanityEnv, readCsvArg, num, prune, sanityUpsert, sanityQuery, normalizeIsoDate } from "./import-shared.mjs";
import { CSV_COLUMNS, RETURN_COLUMNS } from "./pms-csv.mjs";
import { resolveImportTarget, buildExistingIndex, legacyStrategyId, pairKey } from "./pms-matching.mjs";
import { loadPins, pinSuggestion } from "./pms-pins.mjs";

const DRY_RUN = process.argv.includes("--dry-run");

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
const env = requireSanityEnv({ write: !DRY_RUN });
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
    _type: "pmsStrategy",
    // _id is decided by the matcher below, never derived up front — see the
    // "rename guard" section. sanityId set → the target doc is pinned by
    // hand; __legacyId is the id shape earlier imports produced, kept only to
    // recognise the documents they created. The persistent pins file is
    // applied further down, where it can report what matched.
    __pinnedId: get("sanityId") || undefined,
    __pinnedBy: get("sanityId") ? "csv" : undefined,
    __legacyId: legacyStrategyId(manager, strategyName),
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
    // A dry run writes nothing, so it reports the whole picture (matching,
    // collisions, ambiguity) rather than stopping at the first gate.
    if (!DRY_RUN) {
      console.error("Nothing imported. Fix the CSV, or pass --allow-gaps to import anyway.");
      process.exit(1);
    }
    console.warn("(dry run — continuing so the rest of the report is visible; a real run would stop here.)\n");
  }
}

// ---------- match rows to documents + carry-forward ----------
const existing = await sanityQuery(
  env,
  `*[_type == "pmsStrategy" && !(_id in path("drafts.**"))]{ _id, strategyName, manager, category, notes, minInvestmentL, fees }`,
);
const index = buildExistingIndex(existing);
const existingById = index.byId;

const label = (d) => `${d.manager} — ${d.strategyName}`;

/*
 * ---------- persistent pins ----------
 * Applied before matching, so a pinned row never reaches the fuzzy matcher.
 * A CSV sanityId still wins: the file is the standing answer, the column is
 * the one-off override.
 */
const pinsIdx = process.argv.indexOf("--pins");
const pins = loadPins(pinsIdx !== -1 ? new URL(process.argv[pinsIdx + 1], `file://${process.cwd()}/`) : undefined);
if (pins.errors.length) {
  console.error(`${pins.displayPath} is unusable — nothing imported:`);
  for (const e of pins.errors) console.error(`  • ${e}`);
  process.exit(1);
}

for (const doc of docs) {
  if (doc.__pinnedId) continue; // CSV column wins
  const pin = pins.byKey.get(pairKey(doc.manager, doc.strategyName));
  if (!pin) continue;
  pin.matched++;
  doc.__pinnedId = pin.sanityId;
  doc.__pinnedBy = "pins-file";
}

const pinsMatched = pins.resolved.filter((p) => p.matched > 0);
const rowsPinnedByFile = docs.filter((d) => d.__pinnedBy === "pins-file").length;
const pinsFromCsv = docs.filter((d) => d.__pinnedBy === "csv").length;
const pinsUnmatched = pins.resolved.filter((p) => p.matched === 0);
// A pin pointing at an id that no longer exists would silently CREATE a
// document under that id rather than updating one — worth saying out loud.
const pinsStale = pinsMatched.filter((p) => !existingById.has(p.sanityId));
// One pin key can catch two rows: pairKey normalises away the decorations
// ("Core Fund" and "Core Strategy" are one key), so an over-broad pin would
// aim both rows at a single document. The import aborts on that anyway; say
// which pin caused it.
const pinsOverBroad = pinsMatched.filter((p) => p.matched > 1);

if (pins.resolved.length || pins.unresolved.length || pinsFromCsv) {
  console.log(`\nPins: ${pinsMatched.length} of ${pins.resolved.length} in ${pins.displayPath} matched — ${rowsPinnedByFile} row(s) pinned` +
    `${pinsFromCsv ? ` · ${pinsFromCsv} pinned inline by the CSV's sanityId column` : ""}`);
}

const pinProblems = pinsUnmatched.length + pins.unresolved.length + pinsStale.length + pinsOverBroad.length;
if (pinProblems) {
  const bar = "─".repeat(64);
  console.warn(`\n${bar}`);
  console.warn(`PINS NEED ATTENTION — ${pinProblems} entr${pinProblems === 1 ? "y" : "ies"} in ${pins.displayPath}`);
  console.warn(bar);
  for (const p of pinsUnmatched) {
    console.warn(`  ⚠ UNMATCHED  ${p.manager} — ${p.strategyName}`);
    console.warn("      No CSV row normalises to this pin. The manager has almost certainly renamed the");
    console.warn("      strategy, which means this month's row is unpinned and may abort as ambiguous.");
    console.warn(`      Fix: re-run with --dry-run, find the new name, update pins[${p.index}].`);
  }
  for (const p of pins.unresolved) {
    console.warn(`  ⚠ UNRESOLVED ${p.manager} — ${p.strategyName}`);
    console.warn(`      Declared as ambiguous but sanityId is empty, so nothing is pinned.${p.note ? `\n      note: ${p.note}` : ""}`);
    console.warn(`      Fix: run --dry-run, copy the paste-ready block it prints into pins[${p.index}].`);
  }
  for (const p of pinsStale) {
    console.warn(`  ⚠ STALE      ${p.manager} — ${p.strategyName}`);
    console.warn(`      sanityId ${p.sanityId} matches no document in ${env.projectId}/${env.dataset}.`);
    console.warn("      Importing would CREATE a document under that id rather than update one.");
  }
  for (const p of pinsOverBroad) {
    console.warn(`  ⚠ TOO BROAD  ${p.manager} — ${p.strategyName}`);
    console.warn(`      Matches ${p.matched} CSV rows, which would all be written to ${p.sanityId}.`);
    console.warn("      Give each row its own pin — the names differ only by a word the matcher strips.");
  }
  console.warn(`${bar}\n`);
}

/*
 * Collision victims from the OLD id scheme.
 *
 * Ids used to be `pmsStrategy-<slugify(manager + "-" + strategyName)>`, and
 * slugify caps at 96 characters. A long manager name ate the whole budget, so
 * every strategy that manager runs derived ONE id — the last row imported won
 * the document and the rest of that manager's numbers were overwritten by it.
 * Any existing document sitting under such an id is holding one strategy's
 * data under an id several strategies claim.
 *
 * Reported, never repaired: merging is scripts/merge-pms-duplicates.mjs's job
 * and needs a human deciding which document keeps what.
 */
const byLegacyId = new Map();
for (const doc of docs) {
  if (!byLegacyId.has(doc.__legacyId)) byLegacyId.set(doc.__legacyId, new Map());
  byLegacyId.get(doc.__legacyId).set(pairKey(doc.manager, doc.strategyName), doc);
}
const collisionGroups = [...byLegacyId.entries()]
  .filter(([, pairs]) => pairs.size > 1)
  .map(([legacyId, pairs]) => ({ legacyId, rows: [...pairs.values()], victim: existingById.get(legacyId) }))
  .sort((a, b) => b.rows.length - a.rows.length);
const victims = collisionGroups.filter((g) => g.victim);

if (collisionGroups.length) {
  const bar = "─".repeat(64);
  console.log(`\n${bar}`);
  console.log(`Legacy id collisions: ${collisionGroups.length} id(s) claimed by 2+ distinct strategies`);
  console.log(bar);
  if (victims.length) {
    console.log(
      `${victims.length} of them already exist as documents in Sanity — each is holding\n` +
      "one strategy's data under an id its manager's other strategies also derive.\n" +
      "They are listed, not touched. Review them and clean up afterwards with\n" +
      "scripts/merge-pms-duplicates.mjs (--suggest / --merge= / --delete=).\n",
    );
  }
  for (const g of victims) {
    console.log(`  ⚠ EXISTING DOC  [${g.legacyId}]`);
    console.log(`      currently holds: ${label(g.victim)}`);
    console.log(`      ${g.rows.length} CSV strategies derive this same id:`);
    for (const r of g.rows) console.log(`        · ${label(r)}`);
    console.log("");
  }
  const unseen = collisionGroups.length - victims.length;
  if (unseen) {
    console.log(`  ${unseen} further collision group(s) have no document under the legacy id — they`);
    console.log("  would have collided on the next import; each row now gets its own id.\n");
  }
  console.log(`${bar}\n`);
}

const renamed = [];
const created = [];
const updated = [];
const ambiguous = [];
const repointed = []; // rows the old id-keyed matcher would have sent elsewhere
const claimed = new Map(); // target _id → row label, to catch two rows resolving to one doc

for (const doc of docs) {
  const target = doc.__pinnedId
    ? { id: doc.__pinnedId, matchType: existingById.has(doc.__pinnedId) ? "exact" : "new" }
    : resolveImportTarget(doc, index);

  if (target.matchType === "ambiguous") {
    ambiguous.push({ doc, candidates: target.candidates, note: target.reason });
    continue;
  }
  if (claimed.has(target.id)) {
    ambiguous.push({
      doc,
      note: `resolves to the same document as row "${claimed.get(target.id)}" (${target.id})`,
      // The contested document IS the candidate — one of these two rows owns
      // it and the other needs a different target.
      candidates: existingById.has(target.id) ? [existingById.get(target.id)] : [],
    });
    continue;
  }
  claimed.set(target.id, label(doc));
  if (target.matchType === "renamed") renamed.push({ row: label(doc), keeps: label(target.matched), id: target.id });
  if (target.matchType === "new") created.push({ row: label(doc), id: target.id });
  if (target.matchType === "exact") updated.push({ row: label(doc), id: target.id });

  // The old matcher keyed on the derived id, so a row whose legacy id exists
  // but is NOT this row's document was silently writing over someone else's
  // numbers. Surface every one of those before anything is written.
  if (!doc.__pinnedId && existingById.has(doc.__legacyId) && target.id !== doc.__legacyId) {
    repointed.push({
      row: label(doc),
      from: doc.__legacyId,
      fromHolds: label(existingById.get(doc.__legacyId)),
      to: target.id,
      matchType: target.matchType,
    });
  }
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
  delete doc.__pinnedId;
  delete doc.__pinnedBy;
  delete doc.__legacyId;
}

const reportAmbiguous = (log) => {
  log(`Ambiguous rows (${ambiguous.length}) — record each row's target in ${pins.displayPath} and re-run:`);
  for (const a of ambiguous) {
    log(`  • ${label(a.doc)}`);
    if (a.note) log(`      ${a.note}`);
    for (const c of a.candidates ?? []) log(`      candidate: ${label(c)} [${c._id}]`);
  }
  // Paste-ready, because hand-typing a document id into JSON is how a pin ends
  // up pointing at the wrong strategy. Pick the right candidate per block.
  log(`\nPaste into the "pins" array of ${pins.displayPath} (check the id against the candidates above):`);
  for (const a of ambiguous) {
    for (const line of pinSuggestion(a.doc, a.candidates ?? []).split("\n")) log(`  ${line}`);
  }
  log("");
};

if (repointed.length) {
  console.log(`Re-pointed away from a collided id: ${repointed.length} row(s)`);
  console.log("(the old importer would have written each of these over the document named below)");
  // Keeps reporting every month until the collided documents are cleaned up
  // with scripts/merge-pms-duplicates.mjs — which is the point.
  if (!DRY_RUN) {
    console.log("Run with --dry-run to see them listed.\n");
  } else {
    console.log("");
    for (const r of repointed) {
      console.log(`  • ${r.row}`);
      console.log(`      old target [${r.from}] — holds ${r.fromHolds}`);
      console.log(`      new target [${r.to}] (${r.matchType})`);
    }
    console.log("");
  }
}

if (DRY_RUN) {
  console.log(`DRY RUN — nothing written. ${docs.length} CSV rows against ${existing.length} existing documents in ${env.projectId}/${env.dataset}:`);
  console.log(`  would update  ${String(updated.length).padStart(5)}  (matched an existing document by name)`);
  console.log(`  renamed match ${String(renamed.length).padStart(5)}  (matched despite a drifted name — keeps its existing id)`);
  console.log(`  would create  ${String(created.length).padStart(5)}  (no existing document — new collision-free id)`);
  console.log(`  ambiguous     ${String(ambiguous.length).padStart(5)}  (would abort the import)`);
  console.log(`  re-pointed    ${String(repointed.length).padStart(5)}  (old id scheme would have hit the wrong document)`);
  console.log(`  collision victims in Sanity ${victims.length}  (existing documents shared by 2+ strategies)`);
  if (renamed.length) {
    console.log("\nRename matches (CSV name → existing document kept):");
    for (const r of renamed) console.log(`  • ${r.row} → ${r.keeps}  [${r.id}]`);
  }
  if (created.length) {
    console.log(`\nWould create ${created.length} document(s):`);
    for (const c of created) console.log(`  • ${c.row}  [${c.id}]`);
  }
  if (ambiguous.length) {
    console.log("");
    reportAmbiguous(console.log);
  }
  console.log("\nRe-run without --dry-run to write.");
  process.exit(ambiguous.length ? 1 : 0);
}

if (ambiguous.length) {
  console.error("Ambiguous rows — nothing imported.");
  reportAmbiguous(console.error);
  process.exit(1);
}

await sanityUpsert(env, docs);

console.log(`Imported ${docs.length} PMS strategies into Sanity (${env.projectId}/${env.dataset}):`);
console.log(`  ${updated.length} updated · ${renamed.length} matched despite a rename · ${created.length} new`);
for (const d of docs) console.log(`  • ${d.manager} — ${d.strategyName} (as of ${d.asOfDate})`);
if (renamed.length) {
  console.log("\nRename matches (CSV name → existing document kept):");
  for (const r of renamed) console.log(`  • ${r.row} → ${r.keeps}  [${r.id}]`);
}
console.log("\nThe /investment-products/pms page will show them after the next revalidation/deploy.");
