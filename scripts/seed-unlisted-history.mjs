#!/usr/bin/env node
/**
 * One-time seed for the unlisted-shares price history.
 *
 *   node scripts/seed-unlisted-history.mjs --dry-run
 *   node scripts/seed-unlisted-history.mjs           (writes)
 *   npm run seed:unlisted-history -- --dry-run
 *
 * The partner sends a single spot price with no change data, and until now every
 * import overwrote indicativePriceINR and lost the previous value permanently.
 * priceHistory fixes that going forward — but a document with no history has
 * nothing for tomorrow's import to compare against, so the first change indicator
 * would not appear until the day AFTER the next import.
 *
 * This seeds each already-priced document's CURRENT price as the first history
 * entry, so tomorrow's run is the first comparison instead of the first entry.
 *
 * What it does, for every unlistedShare that has BOTH indicativePriceINR and
 * asOfDate AND an empty/missing priceHistory:
 *   - writes priceHistory = [{ _key: asOfDate, d: asOfDate, p: indicativePriceINR }]
 *   - sets NOTHING else. previousPriceINR/previousAsOfDate are deliberately left
 *     unset — there is no previous price yet, and inventing one would show a
 *     change indicator that never happened.
 *
 * Documents already carrying a priceHistory are left completely alone (idempotent
 * re-run). The ~20 editorial docs with no price are correctly skipped.
 *
 * --dry-run is REQUIRED reading before the real run: it prints exactly which
 * documents would be seeded and which are skipped and why. Expect ~185 seeded.
 *
 * CONFIDENTIALITY: only the retail/indicative price is ever read or written.
 * There is no dealer figure anywhere in an unlistedShare document to leak.
 *
 * Env (same conventions as import-unlisted-prices.mjs):
 * NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_API_TOKEN (Editor).
 */

import { strict as assert } from "node:assert";
import {
  loadDotEnvLocal, requireSanityEnv, sanityQuery, sanityMutate,
} from "./import-shared.mjs";
import { planPriceHistoryPatch } from "./unlisted-matching.mjs";

// ---------- args ----------
const args = { dryRun: false };
for (const a of process.argv.slice(2)) {
  if (a === "--dry-run") args.dryRun = true;
  else if (a === "--help" || a === "-h") {
    console.log("See the header of scripts/seed-unlisted-history.mjs for usage.");
    process.exit(0);
  } else { console.error(`Unknown flag ${a}`); process.exit(1); }
}

// ---------- env (dry-run may preview without a write token) ----------
loadDotEnvLocal();
const env = requireSanityEnv({ write: !args.dryRun });

const docs = await sanityQuery(
  env,
  `*[_type == "unlistedShare" && !(_id in path("drafts.**"))]{
     _id, company, indicativePriceINR, asOfDate, "historyLen": count(priceHistory)
   }`,
);

const seeded = [];   // { doc }
const skipped = [];   // { doc, reason }

for (const doc of docs) {
  const hasPrice = typeof doc.indicativePriceINR === "number";
  const hasDate = typeof doc.asOfDate === "string" && doc.asOfDate !== "";
  if (!hasPrice || !hasDate) {
    skipped.push({ doc, reason: !hasPrice && !hasDate ? "no price and no date" : !hasPrice ? "no price" : "no asOfDate" });
    continue;
  }
  if ((doc.historyLen ?? 0) > 0) {
    skipped.push({ doc, reason: `already has ${doc.historyLen} history entr${doc.historyLen === 1 ? "y" : "ies"}` });
    continue;
  }
  seeded.push({ doc });
}

// ---------- report ----------
console.log(`Seed unlisted-shares price history · ${env.projectId}/${env.dataset}${args.dryRun ? " · DRY RUN" : ""}`);
console.log(`\n${docs.length} documents · ${seeded.length} to seed · ${skipped.length} skipped`);

if (seeded.length) {
  console.log("\nTo seed (current price becomes the first history entry):");
  for (const { doc } of seeded) {
    console.log(`  • ${doc.company}  ₹${doc.indicativePriceINR.toLocaleString("en-IN")}  as of ${doc.asOfDate}`);
  }
}
if (skipped.length) {
  console.log("\nSkipped:");
  for (const { doc, reason } of skipped) console.log(`  • ${doc.company ?? doc._id} — ${reason}`);
}

// ---------- build + write mutations ----------
const mutations = [];
for (const { doc } of seeded) {
  // Reuse the importer's planner so the seeded entry has EXACTLY the same shape
  // (_key === d === asOfDate, p === indicativePriceINR) the importer produces.
  const plan = planPriceHistoryPatch([], { date: doc.asOfDate, price: doc.indicativePriceINR });
  assert.equal(plan.action, "append");
  assert.equal(plan.previousPriceINR, null, "seeding must not invent a previous price");
  // Confirm the value stored is the retail price we read — nothing else.
  assert.equal(plan.history[0].p, doc.indicativePriceINR);
  mutations.push({ patch: { id: doc._id, set: { priceHistory: plan.history } } });
}

if (args.dryRun) {
  console.log("\n--dry-run: nothing written.");
  process.exit(0);
}
if (!mutations.length) {
  console.log("\nNothing to seed — every priced document already has a history. No mutations sent.");
  process.exit(0);
}

await sanityMutate(env, mutations);
console.log(`\nWrote ${mutations.length} mutations to Sanity (${env.projectId}/${env.dataset}).`);
console.log("Run the price import next — its first run is now a comparison, not a first entry.");
