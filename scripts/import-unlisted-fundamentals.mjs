#!/usr/bin/env node
/**
 * Import annual fundamentals for unlisted companies from a CSV.
 *
 *   npm run import:unlisted-fundamentals -- _incoming/<file>.csv --dry-run
 *   npm run import:unlisted-fundamentals -- _incoming/<file>.csv
 *
 * Template: _templates/unlisted-fundamentals.csv (example rows in
 * _templates/unlisted-fundamentals.example.csv). One row per company per FY;
 * a row with a blank fy_end updates company-level fields only (e.g. DRHP).
 *
 * Identity: rows are matched by `slug` (exact, as in Studio) or `cin`, NEVER by
 * company name. The first import for a company needs its slug; after that the
 * CIN alone is enough. Unknown slug/CIN → the whole import is refused.
 *
 * Writes ONLY `unlistedFundamentals` documents (one per company, id derived
 * from the unlistedShare _id). It never touches unlistedShare documents — not
 * the price, name, slug or logo.
 *
 * An FY already on file with DIFFERENT figures is a restatement: the import is
 * refused and the differences listed (field names, not values). If the change
 * is genuine, re-run with --allow-restatement. There is no --force.
 *
 * After a successful write the CSV is copied to
 * data/unlisted-fundamentals/imports/<YYYY-MM-DD>_<name>.csv for the audit trail
 * — commit it with a PR.
 *
 * CONFIDENTIALITY: the CSV carries no price at all. A column that looks like a
 * dealer/cost/buy price (or any price) aborts the run before anything is read.
 *
 * Env: NEXT_PUBLIC_SANITY_PROJECT_ID; SANITY_API_TOKEN (Editor) for the write.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseCsv, requireSanityEnv, sanityMutate, sanityQuery } from "./import-shared.mjs";
import {
  assertNoConfidentialKeys, fundamentalsDocId, mergeFundamentals, validateFundamentalsCsv,
} from "./unlisted-fundamentals-lib.mjs";

const args = { file: null, dryRun: false, allowRestatement: false };
for (const a of process.argv.slice(2)) {
  if (a === "--dry-run") args.dryRun = true;
  else if (a === "--allow-restatement") args.allowRestatement = true;
  else if (a === "--help" || a === "-h") { console.log("See the header of scripts/import-unlisted-fundamentals.mjs."); process.exit(0); }
  else if (a.startsWith("--")) { console.error(`Unknown flag ${a}`); process.exit(1); }
  else args.file = a;
}
if (!args.file || !existsSync(args.file)) { console.error("Pass the CSV path, e.g. _incoming/fundamentals-2026-11.csv"); process.exit(1); }

const fail = (msg) => { console.error(msg); process.exit(1); };

// 1. Validate the CSV (headers first — a confidential column aborts here).
let parsed;
try { parsed = validateFundamentalsCsv(parseCsv(readFileSync(args.file, "utf8"))); }
catch (e) { fail(e.message); }
console.log(`CSV ok: ${parsed.companies.length} compan${parsed.companies.length === 1 ? "y" : "ies"}, ${parsed.companies.reduce((s, c) => s + c.years.length, 0)} FY row(s).`);

// 2. Resolve identities against Sanity (read-only).
const env = requireSanityEnv({ write: !args.dryRun });
const shares = await sanityQuery(env, `*[_type == "unlistedShare" && !(_id in path("drafts.**"))]{ _id, company, "slug": slug.current }`);
const existing = await sanityQuery(env, `*[_type == "unlistedFundamentals" && !(_id in path("drafts.**"))]`);
assertNoConfidentialKeys(existing, "existing unlistedFundamentals documents");

const shareBySlug = new Map(shares.filter((s) => s.slug).map((s) => [s.slug, s]));
const shareById = new Map(shares.map((s) => [s._id, s]));
const fundByShareId = new Map(existing.map((f) => [f.share?._ref, f]));
const fundByCin = new Map(existing.filter((f) => f.cin).map((f) => [f.cin, f]));

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()); // YYYY-MM-DD
const problems = [];
const plans = [];
for (const c of parsed.companies) {
  let share = c.slug ? shareBySlug.get(c.slug) : null;
  if (c.slug && !share) { problems.push(`slug "${c.slug}" (rows ${c.lines.join(", ")}): no unlisted company has this slug`); continue; }
  if (c.cin) {
    const byCin = fundByCin.get(c.cin);
    if (byCin && share && byCin.share?._ref !== share._id) { problems.push(`cin ${c.cin} is already linked to "${byCin.slug}", not "${c.slug}"`); continue; }
    if (!share) {
      if (!byCin) { problems.push(`cin ${c.cin} (rows ${c.lines.join(", ")}): not linked yet — give the slug on the first import`); continue; }
      share = shareById.get(byCin.share?._ref);
      if (!share) { problems.push(`cin ${c.cin}: linked company no longer exists`); continue; }
    }
  }
  const plan = mergeFundamentals(fundByShareId.get(share._id), share, c, { today, allowRestatement: args.allowRestatement });
  plans.push({ share, ...plan });
}
if (problems.length) fail(`Import refused — nothing written:\n  ${problems.join("\n  ")}`);

// 3. Report.
let restatements = 0;
for (const p of plans) {
  const bits = [];
  if (p.added.length) bits.push(`+FY ${p.added.join(", ")}`);
  if (p.unchanged.length) bits.push(`unchanged ${p.unchanged.join(", ")}`);
  if (p.restated.length) { restatements += p.restated.length; bits.push(`RESTATED ${p.restated.map((r) => `${r.fyEnd} [${r.fields.join(", ")}]`).join("; ")}`); }
  if (p.companyChanges.length) bits.push(`company: ${p.companyChanges.map((c) => `${c.field} → ${JSON.stringify(c.to)}`).join("; ")}`);
  console.log(`  ${p.share.slug}: ${bits.join(" · ") || "no change"}`);
}
if (restatements && !args.allowRestatement) {
  fail(`\n${restatements} FY row(s) differ from what is on file (restatement). Nothing written.\n` +
    "Check the source; if the figures were genuinely restated, re-run with --allow-restatement.");
}

const toWrite = plans.filter((p) => p.added.length || p.companyChanges.length || (args.allowRestatement && p.restated.length) || !fundByShareId.has(p.share._id));
for (const p of toWrite) {
  assertNoConfidentialKeys(p.doc, `document ${p.doc._id}`);
  if (p.doc._id !== fundamentalsDocId(p.share._id)) fail(`internal: unexpected id ${p.doc._id}`);
}
if (args.dryRun) { console.log(`\nDry run: ${toWrite.length} document(s) would be written. Nothing written.`); process.exit(0); }
if (!toWrite.length) { console.log("\nNothing to write."); process.exit(0); }

// 4. Write (unlistedFundamentals only), then keep a copy of the CSV for the audit trail.
await sanityMutate(env, toWrite.map((p) => ({ createOrReplace: p.doc })));
const dir = join(process.cwd(), "data", "unlisted-fundamentals", "imports");
mkdirSync(dir, { recursive: true });
const dest = join(dir, `${today}_${basename(args.file)}`);
copyFileSync(args.file, dest);
console.log(`\nWrote ${toWrite.length} document(s). CSV copied to ${dest.replace(process.cwd() + "/", "")} — commit it on a branch.`);
