#!/usr/bin/env node
/**
 * Review and publish the unlisted-share documents parked behind needsReview.
 *
 *   npm run approve:unlisted                                # list them all
 *   npm run approve:unlisted -- --approve=slug-a,slug-b     # publish those
 *   npm run approve:unlisted -- --approve-all               # publish everything that passes
 *
 * The price importer creates a company it has never seen with needsReview:
 * true, so it stays off the site until someone has looked at it. That is the
 * right default — a name the matcher invented should not appear in public
 * before a human reads it — but it means a list with 18 genuinely new
 * companies leaves 18 documents to open in Studio one at a time.
 *
 * So: one table, one command. Publishing sets needsReview to false and touches
 * nothing else — no price, no name, no slug, no curated field.
 *
 * ── THE GATE ───────────────────────────────────────────────────────────────
 * --approve-all refuses a document that would embarrass the site:
 *   • no price               — the card would render an empty figure
 *   • no minimum lot size    — the buyer cannot act on it
 *   • "Unlisted Shares" still in the company name — that is the partner's row
 *     boilerplate, not a company, and it would go straight onto a public page
 * Those are printed and skipped; everything else is published.
 *
 * Naming a slug explicitly with --approve is an operator decision and is
 * honoured even when the gate would complain — the complaint is printed, so
 * it is a choice rather than an accident.
 *
 * A document that is already live is never touched on any path.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Run this AFTER `npm run clean:unlisted-dupes` — several of the hidden
 * documents are duplicates that the cleanup deletes, and there is no point
 * reviewing something that is about to go.
 *
 * Env: NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_API_TOKEN (Editor).
 * Listing needs only the project id (the dataset is publicly readable).
 */

import { pathToFileURL } from "node:url";
import { loadDotEnvLocal, requireSanityEnv, sanityQuery, sanityMutate } from "./import-shared.mjs";
import { LIST_BOILERPLATE_RE } from "./unlisted-matching.mjs";

// ---------- the decision ----------
// Pure and exported, so the self-test can exercise the gate without Sanity.

/**
 * Why a document is not fit to publish in bulk, or [] when it is.
 * A list of reasons rather than a boolean, so the report says what to fix.
 */
export function approvalBlockers(doc) {
  const blockers = [];
  if (typeof doc.indicativePriceINR !== "number" || !(doc.indicativePriceINR > 0)) {
    blockers.push("no price");
  }
  if (typeof doc.lotSize !== "number" || !Number.isInteger(doc.lotSize) || doc.lotSize < 1) {
    blockers.push("no minimum lot size");
  }
  if (LIST_BOILERPLATE_RE.test(doc.company ?? "")) {
    blockers.push('company name still contains "Unlisted Shares" — rename it in Studio first');
  }
  return blockers;
}

/**
 * Decide what to publish.
 *
 * `docs` must already be the needsReview set. Returns
 * { publish, blocked, unknown }:
 *   publish  documents to set needsReview: false on
 *   blocked  { doc, blockers } — failed the gate under --approve-all
 *   unknown  slugs named with --approve that are not in the hidden set,
 *            because they are already live, or do not exist
 *
 * A document already live is not in `docs` and so can never be published
 * again by this function — that is the whole reason the caller filters first.
 */
export function selectForApproval(docs, { slugs = null, all = false } = {}) {
  if (all) {
    const publish = [];
    const blocked = [];
    for (const doc of docs) {
      const blockers = approvalBlockers(doc);
      if (blockers.length) blocked.push({ doc, blockers });
      else publish.push(doc);
    }
    return { publish, blocked, unknown: [] };
  }

  const bySlug = new Map(docs.map((d) => [d.slug, d]));
  const publish = [];
  const unknown = [];
  for (const slug of slugs ?? []) {
    const doc = bySlug.get(slug);
    if (doc) publish.push(doc);
    else unknown.push(slug);
  }
  return { publish, blocked: [], unknown };
}

/** One row of the review table. */
export function reviewRow(doc) {
  return {
    slug: doc.slug ?? "(no slug)",
    company: doc.company ?? "(no name)",
    price: typeof doc.indicativePriceINR === "number" ? `₹${doc.indicativePriceINR.toLocaleString("en-IN")}` : "—",
    lot: typeof doc.lotSize === "number" ? String(doc.lotSize) : "—",
    depository: doc.depository ?? "—",
    asOfDate: doc.asOfDate ?? "—",
    logo: doc.hasLogo ? "yes" : "no",
  };
}

/** Render rows as a fixed-width table. Long names are truncated, not wrapped —
 *  the point is to scan the whole set in one screen. */
export function renderTable(rows, { maxCompany = 42, maxSlug = 38 } = {}) {
  const cut = (s, n) => (s.length <= n ? s : `${s.slice(0, n - 1)}…`);
  const cols = [
    { key: "slug", head: "SLUG", max: maxSlug },
    { key: "company", head: "COMPANY", max: maxCompany },
    { key: "price", head: "PRICE", right: true },
    { key: "lot", head: "LOT", right: true },
    { key: "depository", head: "DEPOSITORY" },
    { key: "asOfDate", head: "AS OF" },
    { key: "logo", head: "LOGO" },
  ];
  const cells = rows.map((r) => cols.map((c) => cut(String(r[c.key]), c.max ?? 999)));
  const width = cols.map((c, i) => Math.max(c.head.length, ...cells.map((row) => row[i].length), 0));
  const line = (values) =>
    values.map((v, i) => (cols[i].right ? v.padStart(width[i]) : v.padEnd(width[i]))).join("  ").trimEnd();
  return [line(cols.map((c) => c.head)), line(width.map((w) => "─".repeat(w))), ...cells.map(line)].join("\n");
}

// ═══════════════ RUN ═══════════════
// Only when invoked directly — importing this module must never touch Sanity.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {

// ---------- args ----------
const args = { slugs: null, all: false };
for (const a of process.argv.slice(2)) {
  if (a === "--approve-all") args.all = true;
  else if (a.startsWith("--approve=")) {
    args.slugs = a.slice(10).split(",").map((s) => s.trim()).filter(Boolean);
  } else if (a === "--help" || a === "-h") { console.log("See the header of scripts/approve-unlisted.mjs for usage."); process.exit(0); }
  else { console.error(`Unknown flag ${a}`); process.exit(1); }
}
if (args.all && args.slugs) {
  console.error("Use --approve-all or --approve=<slugs>, not both.");
  process.exit(1);
}
if (args.slugs && args.slugs.length === 0) {
  console.error("--approve= needs at least one slug. Run with no flags to see them.");
  process.exit(1);
}

const writing = args.all || !!args.slugs;
loadDotEnvLocal();
const env = requireSanityEnv({ write: writing });

const hidden = await sanityQuery(
  env,
  `*[_type == "unlistedShare" && !(_id in path("drafts.**")) && needsReview == true] | order(company asc)` +
  `{ _id, company, "slug": slug.current, indicativePriceINR, lotSize, depository, asOfDate, "hasLogo": defined(logo) }`,
);

if (hidden.length === 0) {
  console.log("No unlisted-share documents are waiting for review. Nothing to do.");
  process.exit(0);
}

console.log(`${hidden.length} unlisted-share documents are hidden behind needsReview:\n`);
console.log(renderTable(hidden.map(reviewRow)));

const gated = hidden.map((doc) => ({ doc, blockers: approvalBlockers(doc) })).filter((g) => g.blockers.length);
if (gated.length) {
  console.log(`\n${gated.length} would be REFUSED by --approve-all:`);
  for (const g of gated) console.log(`  • ${g.doc.slug}\n      ${g.blockers.join("\n      ")}`);
}

// ---------- listing only ----------
if (!writing) {
  console.log(
    `\nNothing published — this was a listing.\n\n` +
    `  Publish some:  npm run approve:unlisted -- --approve=${hidden[0].slug}${hidden[1] ? `,${hidden[1].slug}` : ""}\n` +
    `  Publish all:   npm run approve:unlisted -- --approve-all${gated.length ? `   (skips the ${gated.length} above)` : ""}\n\n` +
    "  Run npm run clean:unlisted-dupes first if you haven't — some of these are duplicates it deletes.",
  );
  process.exit(0);
}

// ---------- publish ----------
const { publish, blocked, unknown } = selectForApproval(hidden, args);

if (unknown.length) {
  console.log(`\n${unknown.length} named slug${unknown.length > 1 ? "s are" : " is"} not in the hidden set — already live, or no such document:`);
  for (const s of unknown) console.log(`  • ${s}`);
  console.log("  Nothing was done for these. A document that is already live is never touched.");
}
if (blocked.length) {
  console.log(`\nSkipped ${blocked.length} that did not pass the gate:`);
  for (const b of blocked) console.log(`  • ${b.doc.company}  [${b.doc.slug}]\n      ${b.blockers.join("\n      ")}`);
  console.log("\n  Fix these in Studio, then re-run. Or approve one deliberately by naming its slug.");
}

// A slug named explicitly still gets its problems printed — the operator asked
// for this document, so it is published, but not silently.
if (args.slugs) {
  for (const doc of publish) {
    const blockers = approvalBlockers(doc);
    if (blockers.length) {
      console.log(`\nWarning: ${doc.company} [${doc.slug}] was named explicitly and will be published despite:`);
      for (const b of blockers) console.log(`  ${b}`);
    }
  }
}

if (publish.length === 0) {
  console.log("\nNothing to publish.");
  process.exit(unknown.length ? 1 : 0);
}

console.log(`\nPublishing ${publish.length}:`);
for (const doc of publish) console.log(`  ✓ ${doc.company}  [${doc.slug}]`);

await sanityMutate(env, publish.map((doc) => ({ patch: { id: doc._id, set: { needsReview: false } } })));
console.log(`\nWrote ${publish.length} mutations to Sanity (${env.projectId}/${env.dataset}).`);
console.log("They appear on the unlisted-shares page at its next revalidation (≤1h) or deploy.");

}
