#!/usr/bin/env node
/**
 * PMS category enrichment — proposes a `category` for the pmsStrategy
 * documents that don't carry one.
 *
 *   npm run enrich:categories                 # dry run: writes nothing
 *   npm run enrich:categories -- --apply      # patches Sanity
 *
 * WHY THIS EXISTS
 * ---------------
 * APMI publishes no category per strategy, so only ~28% of the ~1,760 rows
 * carry one. That single gap is why the compare table's Category row was a
 * column of dashes, why the explorer's chip row is nearly empty, and why the
 * /pms/category/[slug] landing pages are thin. Hiding the row (which the
 * compare table now does) is correct UI; it is not the fix.
 *
 * WHAT IT WILL NOT DO
 * -------------------
 * It does not guess. A category is proposed only when the strategy's own name
 * literally contains a category token — "Small Cap", "Flexi", "Multi Asset",
 * "Debt", "Quant". Everything else stays uncategorised, because a WRONG
 * category on a public comparison page is worse than a blank one: a reader
 * comparing three "Largecap" strategies where one is actually a smallcap
 * portfolio is being misled by us, not by a gap in the data.
 *
 * It never overwrites. --apply patches only documents whose `category` is
 * currently absent, with the document's own `_rev` as ifRevisionID — so a
 * value someone typed in the Studio between the read and the write aborts the
 * mutation rather than being clobbered.
 *
 * Nothing here reads or infers anything from APMI's own fields. The keyword
 * table works on the strategy NAME (the manager's own words for their
 * product), which is the only category signal the feed contains.
 *
 * THE THREE INPUTS, IN PRECEDENCE ORDER
 * -------------------------------------
 *  1. scripts/pms-category-overrides.json — hand decisions, always win. This
 *     is where the residue gets mapped, and it is COMMITTED so the answers
 *     survive next month's APMI fetch.
 *  2. The ordered keyword table below.
 *  3. Nothing — the strategy stays uncategorised and shows up in the dry run
 *     for hand-mapping into (1).
 *
 * Required env (read from the environment or .env.local):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID   — enough for a dry run; the dataset reads publicly
 *   SANITY_API_TOKEN                — Editor token, only needed for --apply
 *
 * Output: the CSV goes to stdout and the summary to stderr, so
 *   npm run enrich:categories > categories.csv
 * leaves a clean worksheet on disk with the summary still on screen.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { requireSanityEnv, sanityQuery, sanityMutate } from "./import-shared.mjs";
import { pairKey } from "./pms-matching.mjs";

/* ---------------------------------------------------------------------------
   The taxonomy
---------------------------------------------------------------------------- */

/**
 * Every value this script is allowed to propose. Slugified by pmsCategorySlug
 * (lib/pms.ts) into a /pms/category/[slug] landing page.
 */
export const CANONICAL_CATEGORIES = [
  "Largecap", "Midcap", "Smallcap", "Multicap", "Flexicap",
  "Thematic", "Sectoral", "Debt", "Hybrid", "Multi-Asset",
  "Quant", "ESG", "Value", "Growth",
];

/**
 * What the `category` field actually ACCEPTS today — the option list in
 * sanity/schemas/pmsStrategy.ts, mirrored by VALID_CATEGORIES in
 * scripts/import-pms.mjs.
 *
 * Six canonical values are not in it (Flexicap, Sectoral, Multi-Asset, ESG,
 * Value, Growth). This script proposes them, reports them, and REFUSES TO
 * WRITE them unless --allow-new-categories is passed — because a value
 * outside the option list reads as an invalid selection in the Studio, and
 * the next editor to open that document can clear it with one click.
 *
 * To unlock one properly, add it in three places and re-run:
 *   sanity/schemas/pmsStrategy.ts   options.list
 *   scripts/import-pms.mjs          VALID_CATEGORIES
 *   lib/pms.ts                      PMS_CATEGORIES (or the page gets a generic intro)
 */
export const SCHEMA_CATEGORIES = [
  "Multicap", "Largecap", "Midcap", "Smallcap", "Thematic", "Quant", "Hybrid", "Debt",
];

/** Proposed but deliberately not resolved to a value — see MID_AND_SMALL. */
export const AMBIGUOUS = "(ambiguous — hand-map)";

/**
 * Normalise a strategy name for token matching.
 *
 * Deliberately NOT pms-matching.mjs's `norm`: that one collapses "&" to "and"
 * without spaces, so "Mid&Small Cap" becomes "midandsmall" and a
 * "mid and small" token misses it. Identity matching wants that behaviour;
 * token matching does not.
 *
 * The result is space-padded so every token can be tested as a padded
 * substring — which gives word-boundary semantics for free. " quant " does
 * not match " quantum " (Quantum Advisors is a real manager), and " value "
 * does not match " values ".
 */
export function normalizeName(s) {
  const body = String(s ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return ` ${body} `;
}

/**
 * "Mid & Small Cap" spans two bands and has no canonical value. It is matched
 * FIRST and resolved to AMBIGUOUS rather than to a category — which is the
 * whole point of the rule: without it, "Mid and Small Cap Portfolio" matches
 * the Smallcap rule and is published as a smallcap strategy, which it is not.
 * These land in the dry run for hand-mapping.
 */
const MID_AND_SMALL = [
  "mid and small", "small and mid", "mid and smallcap", "smallcap and midcap",
  "midsmall", "smallmid", "smid",
];

/**
 * The ordered keyword table. First rule whose token appears wins, so the
 * order IS the precedence: cap bands beat style labels ("Small Cap Value" is
 * a smallcap strategy, not a value strategy), and the two loosest rules —
 * Value and Growth, both common as marketing adjectives — sit last where
 * almost anything else outranks them.
 *
 * Tokens are matched against normalizeName() output, so list the spelling
 * variants that survive normalisation ("small cap" covers "Small-Cap" and
 * "Small Cap"; "smallcap" is a separate token because it normalises whole).
 */
export const RULES = [
  { category: "Multi-Asset", tokens: ["multi asset", "multiasset", "multi asset allocation"] },
  { category: AMBIGUOUS, tokens: MID_AND_SMALL },
  { category: "Smallcap", tokens: ["small cap", "smallcap"] },
  { category: "Midcap", tokens: ["mid cap", "midcap"] },
  { category: "Largecap", tokens: ["large cap", "largecap"] },
  { category: "Flexicap", tokens: ["flexi cap", "flexicap", "flexi"] },
  { category: "Multicap", tokens: ["multi cap", "multicap"] },
  // Hybrid ahead of Debt: "Equity and Debt" is a hybrid, not a debt strategy.
  { category: "Hybrid", tokens: ["hybrid", "balanced", "equity and debt", "debt and equity"] },
  { category: "Debt", tokens: ["debt", "fixed income", "bond", "structured credit"] },
  // " quant " only — never "quantum".
  { category: "Quant", tokens: ["quant", "quantitative", "quantamental"] },
  { category: "ESG", tokens: ["esg"] },
  // Literal tokens only. Naming the sectors ("pharma", "banking", "IT") would
  // be the guessing this script exists to avoid — and the Thematic/Sectoral
  // line is fuzzy enough that a human should draw it in the overrides file.
  { category: "Thematic", tokens: ["thematic", "theme"] },
  { category: "Sectoral", tokens: ["sectoral", "sector"] },
  { category: "Value", tokens: ["value"] },
  { category: "Growth", tokens: ["growth"] },
];

/**
 * Propose a category from a strategy name.
 * Returns { category, token } — category null when nothing matched, or
 * AMBIGUOUS when a rule matched but deliberately resolves to no value.
 */
export function proposeCategory(strategyName) {
  const name = normalizeName(strategyName);
  for (const rule of RULES) {
    for (const token of rule.tokens) {
      if (name.includes(` ${token} `)) return { category: rule.category, token };
    }
  }
  return { category: null, token: null };
}

/* ---------------------------------------------------------------------------
   Overrides — scripts/pms-category-overrides.json
---------------------------------------------------------------------------- */

export const OVERRIDES_PATH = new URL("./pms-category-overrides.json", import.meta.url);
export const OVERRIDES_DISPLAY_PATH = "scripts/pms-category-overrides.json";

const OVERRIDES_TEMPLATE = {
  README: [
    "Hand-mapped PMS categories for scripts/enrich-pms-categories.mjs. COMMITTED — these must survive",
    "the monthly APMI fetch, which is why they live here and not in the CSV.",
    "",
    "Applied AHEAD of the keyword table, so an entry here always wins. Use it for:",
    "  - the residue the keyword table cannot match (no category token in the name at all)",
    "  - 'Mid & Small Cap' strategies, which the table reports as ambiguous on purpose",
    "  - anything the table got wrong",
    "",
    "Keyed by the normalised (manager, strategyName) pair — the same key scripts/pms-pins.json uses —",
    "so punctuation and abbreviation drift between months does not break an entry.",
    "",
    "To fill this in, run the dry run and read the CSV it prints:",
    "    npm run enrich:categories > categories.csv",
    "Rows with an empty proposedCategory are the residue. Decide each one, add it below, commit.",
    "",
    "An entry with an empty category is reported as UNRESOLVED and never applied — it only records",
    "that someone has looked at this strategy and not decided yet.",
    "",
    "Allowed values: see CANONICAL_CATEGORIES in scripts/enrich-pms-categories.mjs.",
  ],
  overrides: [
    {
      manager: "Example Portfolio Managers Limited",
      strategyName: "Example Mid & Small Cap Approach",
      category: "",
      note: "Template row — delete it. 'Mid & Small' spans two bands, so the keyword table refuses to pick one.",
    },
  ],
};

/**
 * Read and validate the overrides file.
 * Returns { byKey, resolved, unresolved, errors, created }.
 * A missing file is not an error — it is written from the template instead,
 * so the operator always has the worksheet's companion file in place.
 */
export function loadOverrides(path = OVERRIDES_PATH) {
  const result = { byKey: new Map(), resolved: [], unresolved: [], errors: [], created: false };

  if (!existsSync(path)) {
    writeFileSync(path, `${JSON.stringify(OVERRIDES_TEMPLATE, null, 2)}\n`, "utf8");
    result.created = true;
    return result;
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    result.errors.push(`${OVERRIDES_DISPLAY_PATH} is not valid JSON: ${err.message}`);
    return result;
  }

  const rows = parsed?.overrides;
  if (!Array.isArray(rows)) {
    result.errors.push(`${OVERRIDES_DISPLAY_PATH} must have an "overrides" array.`);
    return result;
  }

  for (const [i, o] of rows.entries()) {
    const where = `${OVERRIDES_DISPLAY_PATH} entry ${i + 1}`;
    if (!o?.manager || !o?.strategyName) {
      result.errors.push(`${where}: "manager" and "strategyName" are both required.`);
      continue;
    }
    const category = String(o.category ?? "").trim();
    if (!category) { result.unresolved.push(o); continue; }
    if (!CANONICAL_CATEGORIES.includes(category)) {
      result.errors.push(
        `${where}: "${category}" is not a canonical category. Allowed: ${CANONICAL_CATEGORIES.join(", ")}.`,
      );
      continue;
    }
    result.byKey.set(pairKey(o.manager, o.strategyName), { ...o, category });
    result.resolved.push(o);
  }
  return result;
}

/* ---------------------------------------------------------------------------
   The run
---------------------------------------------------------------------------- */

const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const pct = (n, total) => (total ? `${((n / total) * 100).toFixed(1)}%` : "0.0%");

/** Decide every document's outcome. Pure — no network, no writes. */
export function planEnrichment(docs, overrides, { allowNewCategories = false } = {}) {
  const rows = [];
  for (const doc of docs) {
    const override = overrides.byKey.get(pairKey(doc.manager, doc.strategyName));
    const { category, token } = override
      ? { category: override.category, token: "override" }
      : proposeCategory(doc.strategyName);

    const current = doc.category ?? null;
    const proposed = category && category !== AMBIGUOUS ? category : null;
    const writable = proposed !== null && (allowNewCategories || SCHEMA_CATEGORIES.includes(proposed));

    let outcome;
    if (current) outcome = "already-categorised";
    else if (category === AMBIGUOUS) outcome = "ambiguous";
    else if (!proposed) outcome = "unmatched";
    else if (!writable) outcome = "blocked-by-schema";
    else outcome = "would-set";

    rows.push({ doc, current, proposed, category, token, outcome });
  }
  return rows;
}

export async function main() {
  const argv = process.argv.slice(2);
  const APPLY = argv.includes("--apply");
  const ALLOW_NEW = argv.includes("--allow-new-categories");
  const log = (...a) => console.error(...a); // summary on stderr, CSV on stdout

  const env = requireSanityEnv({ write: APPLY });

  const overrides = loadOverrides();
  if (overrides.created) {
    log(`Created ${OVERRIDES_DISPLAY_PATH} from the template — hand-map the residue there and commit it.\n`);
  }
  if (overrides.errors.length) {
    for (const e of overrides.errors) log(`  ✗ ${e}`);
    log("\nFix the overrides file and re-run. Nothing was written.");
    process.exit(1);
  }

  const docs = await sanityQuery(
    env,
    `*[_type == "pmsStrategy" && !(_id in path("drafts.**"))]{
       _id, _rev, strategyName, manager, category
     } | order(manager asc, strategyName asc)`,
  );

  if (!Array.isArray(docs) || docs.length === 0) {
    log(`No pmsStrategy documents in ${env.projectId}/${env.dataset} — nothing to enrich.`);
    process.exit(1);
  }

  const rows = planEnrichment(docs, overrides, { allowNewCategories: ALLOW_NEW });
  const of = (name) => rows.filter((r) => r.outcome === name);
  const toSet = of("would-set");
  const blocked = of("blocked-by-schema");
  const ambiguous = of("ambiguous");
  const unmatched = of("unmatched");
  const before = of("already-categorised").length;

  /* ---- the worksheet (stdout) ---- */
  console.log(["strategyName", "manager", "currentCategory", "proposedCategory", "matchedToken"].join(","));
  for (const r of rows) {
    console.log([
      csvCell(r.doc.strategyName),
      csvCell(r.doc.manager),
      csvCell(r.current ?? ""),
      csvCell(r.outcome === "ambiguous" ? AMBIGUOUS : r.proposed ?? ""),
      csvCell(r.token ?? ""),
    ].join(","));
  }

  /* ---- the summary (stderr) ---- */
  const total = rows.length;
  const after = before + toSet.length;
  log("");
  log(`Documents            ${total}`);
  log(`  already categorised ${before}  (${pct(before, total)})`);
  log(`  would set           ${toSet.length}`);
  log(`  blocked by schema   ${blocked.length}`);
  log(`  ambiguous           ${ambiguous.length}   (Mid & Small — hand-map)`);
  log(`  no category token   ${unmatched.length}`);
  log("");
  log(`Coverage             ${pct(before, total)} → ${pct(after, total)}`);

  // Rows whose stored category contradicts their own name. Never touched by
  // this script — but a "Largecap" document called "…Small Cap Portfolio" is
  // a data error worth someone's eyes, and this is the only pass that sees it.
  const disagree = rows.filter((r) => r.current && r.proposed && r.current !== r.proposed);
  if (disagree.length) {
    log("");
    log(`Existing value disagrees with the name (${disagree.length}) — not changed, worth checking:`);
    for (const r of disagree.slice(0, 20)) {
      log(`  • ${r.doc.strategyName} — stored ${r.current}, name says ${r.proposed}`);
    }
    if (disagree.length > 20) log(`  … and ${disagree.length - 20} more (all in the CSV)`);
  }
  if (blocked.length) {
    const byValue = new Map();
    for (const r of blocked) byValue.set(r.proposed, (byValue.get(r.proposed) ?? 0) + 1);
    log("");
    log(`Blocked — the category field's option list does not carry these values yet:`);
    for (const [value, n] of [...byValue].sort((a, b) => b[1] - a[1])) log(`  ${value.padEnd(12)} ${n}`);
    log("");
    log("  Add each one to all three, then re-run:");
    log("    sanity/schemas/pmsStrategy.ts   options.list");
    log("    scripts/import-pms.mjs          VALID_CATEGORIES");
    log("    lib/pms.ts                      PMS_CATEGORIES  (else the landing page gets a generic intro)");
    log("  Or pass --allow-new-categories to write them anyway (the Studio will show them as invalid).");
  }
  if (overrides.unresolved.length) {
    log("");
    log(`Unresolved overrides (${overrides.unresolved.length}) — recorded but never applied until "category" is filled in:`);
    for (const o of overrides.unresolved) log(`  • ${o.manager} — ${o.strategyName}`);
  }

  if (!APPLY) {
    log("");
    log("Dry run — nothing was written. Re-run with --apply to patch Sanity.");
    return;
  }

  /* ---- apply ---- */
  if (toSet.length === 0) {
    log("");
    log("Nothing to apply.");
    return;
  }

  // ifRevisionID: if someone set a category in the Studio between the read
  // above and this write, the mutation fails instead of overwriting them.
  const mutations = toSet.map((r) => ({
    patch: { id: r.doc._id, ifRevisionID: r.doc._rev, set: { category: r.proposed } },
  }));

  const BATCH = 50;
  for (let i = 0; i < mutations.length; i += BATCH) {
    await sanityMutate(env, mutations.slice(i, i + BATCH));
    log(`  patched ${Math.min(i + BATCH, mutations.length)} / ${mutations.length}`);
  }
  log("");
  log(`Applied. Coverage ${pct(before, total)} → ${pct(after, total)}.`);
  log("The monthly import carries `category` forward on update, so this survives the next APMI refresh.");
}

// Only run when executed directly — importing this module (the self-test does)
// must not fire a Sanity query.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
