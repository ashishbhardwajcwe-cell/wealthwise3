#!/usr/bin/env node
/**
 * AIF directory importer — populates the `aifFund` documents in Sanity from a
 * CSV of SEBI-registered Alternative Investment Funds.
 *
 * The base dataset is SEBI's public "Recognised Intermediaries" AIF list
 * (name, registration number, category I/II/III, registration date, sponsor /
 * manager). Produce the CSV with scripts/fetch-sebi-aif.mjs (or by hand from
 * scripts/aif-template.csv), then:
 *
 *   npm run import:aif -- scripts/aif-data.csv
 *
 * Documents are keyed by SEBI **registration number**, so re-running the
 * monthly registry refresh UPDATES the same rows instead of duplicating them.
 *
 * Performance (net IRR / MOIC / DPI / TVPI, fund size, fees, …) is optional —
 * it's added per fund as AMC factsheets arrive. A registry re-import that
 * carries only the SEBI columns does NOT wipe those hand-added performance
 * fields: anything the CSV omits is carried forward from the existing
 * document.
 *
 * Required env vars (environment or .env.local):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_API_TOKEN (Editor access)
 *
 * CSV columns (header row required, order doesn't matter):
 *   fundName*  registrationNo*  category  registrationDate  sponsor  manager
 *   vintage  fundSizeCr  minCommitmentCr  tenorYears
 *   netIrr  moic  dpi  tvpi  feesManagement  feesCarry  feesHurdle
 *   asOfDate* (YYYY-MM-DD)  source*  notes
 *   (* = required. category is the broad SEBI class — I, II or III.
 *    registrationDate accepts YYYY-MM-DD, DD-MMM-YYYY or DD/MM/YYYY.)
 */

import {
  requireSanityEnv, readCsvArg, num, slugify, prune,
  sanityUpsert, sanityQuery, normalizeIsoDate,
} from "./import-shared.mjs";

/** "Category II" / "Cat-II" / "II" / "2" → "II"; blank → undefined. */
function normalizeCategory(raw) {
  const s = String(raw || "").trim();
  if (!s) return undefined;
  const m = s.match(/\b(III|II|I)\b/i) || s.match(/([123])/);
  if (!m) return "?";
  const token = m[1].toUpperCase();
  return { 1: "I", 2: "II", 3: "III", I: "I", II: "II", III: "III" }[token] ?? "?";
}

const env = requireSanityEnv();
const rows = readCsvArg("aif-template.csv");

const header = rows[0].map((h) => h.trim());
const idx = (name) => header.indexOf(name);
for (const required of ["fundName", "registrationNo", "asOfDate", "source"]) {
  if (idx(required) === -1) {
    console.error(`CSV is missing the required column "${required}". Expected header:\n` +
      "fundName,registrationNo,category,registrationDate,sponsor,manager,vintage,fundSizeCr,minCommitmentCr,tenorYears,netIrr,moic,dpi,tvpi,feesManagement,feesCarry,feesHurdle,asOfDate,source,notes");
    process.exit(1);
  }
}

const docs = [];
const errors = [];
const seenReg = new Map(); // registrationNo → line, to catch dupes within the CSV

rows.slice(1).forEach((r, i) => {
  const get = (name) => (idx(name) >= 0 ? (r[idx(name)] ?? "").trim() : "");
  const line = i + 2;
  const fundName = get("fundName");
  const registrationNo = get("registrationNo");
  const asOfDate = get("asOfDate");
  const source = get("source");

  if (!fundName) return errors.push(`line ${line}: fundName is required`);
  if (!registrationNo) return errors.push(`line ${line}: registrationNo is required (the upsert key)`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) return errors.push(`line ${line}: asOfDate must be YYYY-MM-DD (got "${asOfDate}")`);
  if (!source) return errors.push(`line ${line}: source is required (e.g. "SEBI registered intermediaries list")`);

  if (seenReg.has(registrationNo)) {
    return errors.push(`line ${line}: registrationNo "${registrationNo}" also on line ${seenReg.get(registrationNo)} — de-duplicate the CSV`);
  }
  seenReg.set(registrationNo, line);

  const category = normalizeCategory(get("category"));
  if (category === "?") {
    return errors.push(`line ${line}: category "${get("category")}" must be I, II or III (or empty)`);
  }

  const registrationDate = normalizeIsoDate(get("registrationDate"));
  if (registrationDate === null) {
    return errors.push(`line ${line}: registrationDate "${get("registrationDate")}" isn't a recognisable date`);
  }

  const vintage = num(get("vintage"));
  if (vintage !== undefined && (vintage < 1990 || vintage > 2100)) {
    return errors.push(`line ${line}: vintage "${get("vintage")}" doesn't look like a year`);
  }

  const returns = prune({
    netIrr: num(get("netIrr")), moic: num(get("moic")),
    dpi: num(get("dpi")), tvpi: num(get("tvpi")),
  });
  const fees = prune({
    management: num(get("feesManagement")), carry: num(get("feesCarry")), hurdle: num(get("feesHurdle")),
  });

  docs.push({
    _id: `aifFund-${slugify(registrationNo)}`,
    _type: "aifFund",
    fundName,
    registrationNo,
    ...(category ? { category } : {}),
    ...(registrationDate ? { registrationDate } : {}),
    ...(get("sponsor") ? { sponsor: get("sponsor") } : {}),
    ...(get("manager") ? { manager: get("manager") } : {}),
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

// ---------- carry-forward ----------
// createOrReplace wipes anything the CSV doesn't carry. The SEBI registry CSV
// carries no performance, so pull the hand-added fields forward from the
// existing document; registry fields it leaves blank are kept too.
const existing = await sanityQuery(
  env,
  `*[_type == "aifFund" && !(_id in path("drafts.**"))]{
     _id, category, registrationDate, sponsor, manager, vintage, fundSize,
     minCommitmentCr, tenor, fees, returns, notes }`,
);
const existingById = new Map(existing.map((d) => [d._id, d]));

const CARRY_IF_BLANK = ["category", "registrationDate", "sponsor", "manager"];
const CARRY_PERFORMANCE = ["vintage", "fundSize", "minCommitmentCr", "tenor", "fees", "returns", "notes"];
let created = 0;
for (const doc of docs) {
  const prev = existingById.get(doc._id);
  if (!prev) { created++; continue; }
  for (const k of CARRY_IF_BLANK) {
    if (doc[k] === undefined && prev[k] !== undefined && prev[k] !== null) doc[k] = prev[k];
  }
  for (const k of CARRY_PERFORMANCE) {
    if (doc[k] === undefined && prev[k] !== undefined && prev[k] !== null) doc[k] = prev[k];
  }
}

await sanityUpsert(env, docs);

console.log(`Imported ${docs.length} AIF funds into Sanity (${env.projectId}/${env.dataset}):`);
console.log(`  ${docs.length - created} updated · ${created} new`);
const withPerf = docs.filter((d) => d.returns).length;
console.log(`  ${withPerf} carry performance data; ${docs.length - withPerf} are registry-only.`);
console.log("\nThe AIF directory on /investment-products/aif shows them after the next revalidation/deploy.");
