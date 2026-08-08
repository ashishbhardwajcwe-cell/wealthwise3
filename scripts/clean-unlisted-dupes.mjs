#!/usr/bin/env node
/**
 * Merge the duplicate unlistedShare documents the 06-Aug-2026 import created.
 *
 *   npm run clean:unlisted-dupes -- --dry-run    # read the plan, write nothing
 *   npm run clean:unlisted-dupes                 # apply it
 *
 * The 06-Aug list was the partner's first Excel export. Its names are clean and
 * complete; ~34 of ours were OCR wreckage from the PDF era, and the matcher of
 * the day could not bridge the gap, so it created a second document for each.
 * scripts/unlisted-aliases.json now says which list name belongs to which
 * document. This script makes that stick:
 *
 *   1. the declared list name is appended to the TARGET document's aliases, so
 *      tomorrow's import matches it exactly and no heuristic is involved;
 *   2. the duplicate the 06-Aug run created for that same name is deleted.
 *
 * ── WHAT IT REFUSES TO DELETE ──────────────────────────────────────────────
 * Deletion is forever and this dataset is publicly readable, so a document is
 * only ever deleted when it is provably disposable: still hidden behind
 * needsReview, carrying no logo, no summary, no sector, no ipoStatus, and
 * nothing else a human typed. Anything else is PRINTED AND SKIPPED for you to
 * merge in Studio, where you can see both documents side by side. The target
 * document is never deleted, whatever it looks like.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Alias appends are idempotent: a name the target already answers to is not
 * added again, so re-running this is safe and does nothing the second time.
 *
 * Env: NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_API_TOKEN (Editor).
 * --dry-run needs only the project id (the dataset is publicly readable).
 */

import { pathToFileURL } from "node:url";
import { loadDotEnvLocal, requireSanityEnv, sanityQuery, sanityMutate } from "./import-shared.mjs";
import { normalizeCompanyName } from "./unlisted-matching.mjs";
import { loadUnlistedAliases, unresolvedAliasTargets, ALIASES_DISPLAY_PATH } from "./unlisted-aliases.mjs";

// ---------- the plan ----------
// Pure, and exported, so the self-test can exercise the refusal rules without
// a Sanity connection. Everything below the RUN marker only executes when this
// file is the entry point.

/**
 * Fields that mean a human worked on this document. `needsReview: false` is in
 * here too: a live document is one the site may be showing right now, and the
 * only safe way to retire it is to look at it.
 */
export function curatedFields(doc) {
  return [
    doc.hasLogo ? "logo" : null,
    doc.hasSummary ? "summary" : null,
    doc.sector ? `sector "${doc.sector}"` : null,
    doc.ipoStatus ? `ipoStatus "${doc.ipoStatus}"` : null,
    doc.hasDrhp ? "drhp" : null,
    doc.hasFaqs ? "faqs" : null,
    doc.hasFinancials ? "financials" : null,
  ].filter(Boolean);
}

/**
 * Why a document may NOT be deleted, or [] when it is disposable.
 * Deliberately a list of positive reasons rather than a boolean, so the report
 * says what is protecting each survivor.
 */
export function deletionBlockers(doc) {
  const blockers = [];
  if (doc.needsReview !== true) blockers.push("is LIVE on the site (needsReview is not true)");
  for (const f of curatedFields(doc)) blockers.push(`carries ${f}`);
  return blockers;
}

/**
 * Build the merge plan from the alias file and the dataset.
 *
 * For each declared (slug ← name) pair: find the target, find any OTHER
 * document answering to that same name, and decide what to do with it.
 * Returns { aliasAdds, deletions, blocked, noDuplicate, missingTargets }.
 */
export function planCleanup(entries, docs) {
  const bySlug = new Map(docs.map((d) => [d.slug, d]));
  const aliasAdds = [];      // { target, name }
  const deletions = [];      // { target, duplicate, name }
  const blocked = [];        // { target, duplicate, name, blockers }
  const noDuplicate = [];    // { target, name }
  const missingTargets = unresolvedAliasTargets(entries, docs);
  const claimedForDeletion = new Set();

  for (const { slug, name } of entries) {
    const target = bySlug.get(slug);
    if (!target) continue; // reported separately as a missing target

    const key = normalizeCompanyName(name);
    const known = [target.company, ...(target.aliases ?? [])].map(normalizeCompanyName);
    if (!known.includes(key)) aliasAdds.push({ target, name });

    // The duplicate is any OTHER document that answers to this same name —
    // by company or by alias. That is exactly how the 06-Aug run created it:
    // it wrote the list name into both fields of a brand-new document.
    const duplicates = docs.filter(
      (d) =>
        d._id !== target._id &&
        (normalizeCompanyName(d.company) === key || (d.aliases ?? []).some((a) => normalizeCompanyName(a) === key)),
    );

    if (duplicates.length === 0) { noDuplicate.push({ target, name }); continue; }

    for (const duplicate of duplicates) {
      if (claimedForDeletion.has(duplicate._id)) continue;
      const blockers = deletionBlockers(duplicate);
      if (blockers.length) { blocked.push({ target, duplicate, name, blockers }); continue; }
      claimedForDeletion.add(duplicate._id);
      deletions.push({ target, duplicate, name });
    }
  }

  return { aliasAdds, deletions, blocked, noDuplicate, missingTargets };
}

// ═══════════════ RUN ═══════════════
// Only when invoked directly — importing this module must never touch Sanity.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {

// ---------- args ----------
const args = { dryRun: false };
for (const a of process.argv.slice(2)) {
  if (a === "--dry-run") args.dryRun = true;
  else if (a === "--help" || a === "-h") { console.log("See the header of scripts/clean-unlisted-dupes.mjs for usage."); process.exit(0); }
  else { console.error(`Unknown flag ${a}`); process.exit(1); }
}

loadDotEnvLocal();
const env = requireSanityEnv({ write: !args.dryRun });

const aliasFile = loadUnlistedAliases();
if (aliasFile.errors.length) {
  console.error(`\n${ALIASES_DISPLAY_PATH} is not usable:\n`);
  for (const e of aliasFile.errors) console.error(`  ${e}`);
  process.exit(1);
}
if (aliasFile.entries.length === 0) {
  console.log(`${ALIASES_DISPLAY_PATH} declares no names. Nothing to do.`);
  process.exit(0);
}

const docs = await sanityQuery(
  env,
  `*[_type == "unlistedShare" && !(_id in path("drafts.**"))]{ _id, company, "slug": slug.current, aliases, ` +
  `indicativePriceINR, asOfDate, needsReview, sector, ipoStatus, "hasLogo": defined(logo), ` +
  `"hasSummary": defined(summary), "hasDrhp": defined(drhpUrl), "hasFaqs": count(faqs) > 0, "hasFinancials": count(financials) > 0 }`,
);

const plan = planCleanup(aliasFile.entries, docs);

console.log(`${docs.length} unlistedShare documents · ${aliasFile.entries.length} declared names in ${ALIASES_DISPLAY_PATH}\n`);

if (plan.missingTargets.length) {
  console.error(`ABORTED — ${plan.missingTargets.length} declared entries point at a slug no document has:\n`);
  for (const m of plan.missingTargets) console.error(`  "${m.name}"  ->  ${m.slug}`);
  console.error("\n  Check the slug in Studio's URL bar and correct the file. Nothing was written.");
  process.exit(1);
}

const label = (d) => `${d.company}  [${d.slug ?? "(no slug)"}]`;

if (plan.aliasAdds.length) {
  console.log(`Alias additions (${plan.aliasAdds.length}) — so tomorrow's import matches exactly:`);
  for (const a of plan.aliasAdds) console.log(`  • ${label(a.target)}\n      + "${a.name}"`);
} else {
  console.log("Alias additions: none — every declared name is already on its target.");
}

if (plan.deletions.length) {
  console.log(`\nDeletions (${plan.deletions.length}) — duplicates created by the 06-Aug run, hidden and uncurated:`);
  for (const d of plan.deletions) {
    const price = typeof d.duplicate.indicativePriceINR === "number"
      ? `₹${d.duplicate.indicativePriceINR.toLocaleString("en-IN")} as of ${d.duplicate.asOfDate ?? "(no date)"}`
      : "no price";
    console.log(`  • DELETE ${label(d.duplicate)}\n      ${price}\n      merging into ${label(d.target)}`);
  }
} else {
  console.log("\nDeletions: none.");
}

if (plan.blocked.length) {
  console.log(`\nSkipped — NOT deletable (${plan.blocked.length}). Merge these in Studio:`);
  for (const b of plan.blocked) {
    console.log(`  • ${label(b.duplicate)}`);
    for (const why of b.blockers) console.log(`      ${why}`);
    console.log(`      would have merged into ${label(b.target)}`);
  }
  console.log(
    "\n  Nothing here is touched. Open both documents, move anything worth keeping onto the survivor,\n" +
    "  then delete the other by hand.",
  );
}

if (plan.noDuplicate.length) {
  console.log(`\nNo duplicate found (${plan.noDuplicate.length}) — declared, aliased, nothing to delete:`);
  for (const n of plan.noDuplicate) console.log(`  • "${n.name}" → ${label(n.target)}`);
}

const mutations = [
  ...plan.aliasAdds.flatMap((a) => [
    { patch: { id: a.target._id, setIfMissing: { aliases: [] } } },
    { patch: { id: a.target._id, insert: { after: "aliases[-1]", items: [a.name] } } },
  ]),
  ...plan.deletions.map((d) => ({ delete: { id: d.duplicate._id } })),
];

console.log(`\n${plan.aliasAdds.length} alias additions · ${plan.deletions.length} deletions · ${plan.blocked.length} skipped for review`);

if (args.dryRun) {
  console.log("\n--dry-run: nothing written. Re-run without it to apply.");
  process.exit(0);
}
if (mutations.length === 0) { console.log("\nNothing to write."); process.exit(0); }

await sanityMutate(env, mutations);
console.log(`\nWrote ${mutations.length} mutations to Sanity (${env.projectId}/${env.dataset}).`);
console.log("Run `npm run audit:unlisted` to confirm the document count, then re-run the price import.");
}
