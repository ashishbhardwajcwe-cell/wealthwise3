#!/usr/bin/env node
/**
 * AIF data importer — populates the `aifFund` documents in Sanity from a
 * CSV of fund performance data.
 *
 * Data sources (in order of preference — see scripts/README.md):
 *   1. Manager PPMs / quarterly investor letters (you're empanelled — use them)
 *   2. SEBI's AIF disclosures (official, free)
 *   3. CRISIL AIF Benchmarks (published half-yearly, free summary tables)
 *
 * Fill scripts/aif-template.csv and run:
 *
 *   npm run import:aif -- scripts/aif-data.csv
 *
 * Required env vars (environment or .env.local):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_API_TOKEN (Editor access)
 *
 * CSV columns (header row required, order doesn't matter):
 *   fundName*  manager*  category  vintage  fundSizeCr  minCommitmentCr
 *   tenorYears  netIrr  moic  dpi  tvpi
 *   feesManagement  feesCarry  feesHurdle
 *   asOfDate* (YYYY-MM-DD)  source*  notes
 *
 * category must be one of the Sanity list values, e.g. "Cat II - PE".
 * The document _id derives from manager + fund name, so re-running the
 * import UPDATES the same records instead of duplicating them.
 */

import { requireSanityEnv, readCsvArg, num, slugify, prune, sanityUpsert } from "./import-shared.mjs";

const VALID_CATEGORIES = [
  "Cat I - VC", "Cat I - Infra", "Cat I - Social",
  "Cat II - PE", "Cat II - Credit", "Cat II - RE", "Cat II - FoF",
  "Cat III - LS", "Cat III - Quant",
];

const env = requireSanityEnv();
const rows = readCsvArg("aif-template.csv");

const header = rows[0].map((h) => h.trim());
const idx = (name) => header.indexOf(name);
for (const required of ["fundName", "manager", "asOfDate", "source"]) {
  if (idx(required) === -1) {
    console.error(`CSV is missing the required column "${required}". Expected header:\n` +
      "fundName,manager,category,vintage,fundSizeCr,minCommitmentCr,tenorYears,netIrr,moic,dpi,tvpi,feesManagement,feesCarry,feesHurdle,asOfDate,source,notes");
    process.exit(1);
  }
}

const docs = [];
const errors = [];
rows.slice(1).forEach((r, i) => {
  const get = (name) => (idx(name) >= 0 ? (r[idx(name)] ?? "").trim() : "");
  const line = i + 2;
  const fundName = get("fundName");
  const manager = get("manager");
  const asOfDate = get("asOfDate");
  const source = get("source");

  if (!fundName || !manager) return errors.push(`line ${line}: fundName and manager are required`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) return errors.push(`line ${line}: asOfDate must be YYYY-MM-DD (got "${asOfDate}")`);
  if (!source) return errors.push(`line ${line}: source is required (e.g. "Manager quarterly letter, Q1 FY27")`);
  const category = get("category");
  if (category && !VALID_CATEGORIES.includes(category)) {
    return errors.push(`line ${line}: category "${category}" must be one of ${VALID_CATEGORIES.join(", ")} (or empty)`);
  }
  const vintage = num(get("vintage"));
  if (vintage !== undefined && (vintage < 1990 || vintage > 2100)) {
    return errors.push(`line ${line}: vintage "${get("vintage")}" doesn't look like a year`);
  }

  const returns = prune({
    netIrr: num(get("netIrr")),
    moic: num(get("moic")),
    dpi: num(get("dpi")),
    tvpi: num(get("tvpi")),
  });
  const fees = prune({
    management: num(get("feesManagement")),
    carry: num(get("feesCarry")),
    hurdle: num(get("feesHurdle")),
  });

  docs.push({
    _id: `aifFund-${slugify(`${manager}-${fundName}`)}`,
    _type: "aifFund",
    fundName,
    manager,
    ...(category ? { category } : {}),
    ...(vintage !== undefined ? { vintage } : {}),
    ...(num(get("fundSizeCr")) !== undefined ? { fundSize: num(get("fundSizeCr")) } : {}),
    ...(num(get("minCommitmentCr")) !== undefined ? { minCommitmentCr: num(get("minCommitmentCr")) } : {}),
    ...(num(get("tenorYears")) !== undefined ? { tenor: num(get("tenorYears")) } : {}),
    ...(returns ? { returns } : {}),
    ...(fees ? { fees } : {}),
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

await sanityUpsert(env, docs);

console.log(`Imported ${docs.length} AIF funds into Sanity (${env.projectId}/${env.dataset}):`);
for (const d of docs) console.log(`  • ${d.manager} — ${d.fundName} (as of ${d.asOfDate})`);
console.log("\nThe /investment-products/aif page will show them after the next revalidation/deploy.");
