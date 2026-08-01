#!/usr/bin/env node
/**
 * Audit (and, on request, repair) the `unlistedShare` documents in Sanity.
 *
 *   npm run audit:unlisted                       # READ-ONLY report
 *   npm run audit:unlisted -- --flagged-only     # skip the clean-document list
 *   npm run audit:unlisted -- --from=docs.json   # rehearse against a dump, no network
 *   npm run audit:unlisted -- --delete-flagged   # delete only the safe ones
 *
 * The default run writes NOTHING. --delete-flagged is the only destructive
 * mode, and it removes a document only when BOTH hold: the name carries a
 * corruption signature, and a clean document for the same company survives.
 * Anything else — no twin, an ambiguous twin, or any hand-curated content on
 * the document — is printed for manual review and left alone.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * The 31-Jul-2026 price import took the partner list's name and price columns
 * as one field and created a parallel set of documents whose `company` reads
 * "(Manipal Cards) 385", "(NCDEX) Limited Unlisted Shares 388", "Shares 454".
 * The document count went from ~188 to 367. scripts/clean-unlisted-names.mjs
 * then stripped the leading "(" it took for OCR logo junk, leaving dangling
 * brackets like "Manipal Cards) 385".
 *
 * This script finds every such document, decides which ones are safe to remove
 * (a corrupted document is only ever deleted when a clean document for the same
 * company still exists), and reports the rest for a human.
 *
 * ── CONFIDENTIALITY ────────────────────────────────────────────────────────
 * The report prints `indicativePriceINR` for flagged documents because you
 * cannot triage without it, and because those values are ALREADY in a publicly
 * readable dataset — that is the incident, not this report. Treat the printed
 * price of any flagged document as untrusted: the importer bug stored whichever
 * number came last before the depository column, which on the partner's list is
 * the DEALER (cost) price. Do not copy those figures anywhere; delete them.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Env: NEXT_PUBLIC_SANITY_PROJECT_ID (reads — the dataset is public),
 * plus SANITY_API_TOKEN (Editor) for --delete-flagged.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  requireSanityEnv, sanityQuery, sanityMutate,
} from "./import-shared.mjs";
import {
  normalizeCompanyName, stripCorruption, trailingNumber,
  hasUnbalancedBracket, LIST_BOILERPLATE_RE,
} from "./unlisted-matching.mjs";

// ─── signatures ─────────────────────────────────────────────────────

/**
 * Structural corruption signatures on a company name — each one is visible in
 * the name itself, no corpus needed.
 */
export function structuralSignatures(company) {
  const s = String(company ?? "");
  const out = [];
  if (!s.trim()) return ["no company name"];
  const tail = trailingNumber(s);
  if (tail) out.push(`ends in digits ("${tail.raw}")`);
  if (hasUnbalancedBracket(s)) out.push("unbalanced bracket");
  if (LIST_BOILERPLATE_RE.test(s)) out.push('contains "Unlisted Shares"');
  return out;
}

/** Every name a document answers to, normalised. */
const docKeys = (d) =>
  [d.company, ...(d.aliases ?? [])]
    .map(normalizeCompanyName)
    .filter(Boolean);

/** " a b c " contains the contiguous word run " b c ". */
const containsPhrase = (haystack, phrase) =>
  !!haystack && !!phrase && ` ${haystack} `.includes(` ${phrase} `);

/**
 * Classify every document, then resolve each flagged one against the clean
 * survivors. Pure — the audit's whole decision surface, unit-tested in
 * scripts/unlisted-pipeline.test.mjs.
 */
export function auditUnlistedDocs(docs) {
  const rows = docs.map((d) => {
    const structural = structuralSignatures(d.company);
    const normKey = normalizeCompanyName(d.company);
    const strippedKey = normalizeCompanyName(stripCorruption(d.company));
    return { doc: d, structural, normKey, strippedKey, signatures: [...structural] };
  });

  // Near-duplicate: this name, with its trailing digits/boilerplate stripped,
  // lands on ANOTHER document's real name. Computed before "clean" is decided
  // so the two rules can't chase each other.
  const byNormKey = new Map();
  for (const r of rows) {
    if (!r.normKey) continue;
    if (!byNormKey.has(r.normKey)) byNormKey.set(r.normKey, []);
    byNormKey.get(r.normKey).push(r);
  }
  for (const r of rows) {
    if (!r.strippedKey || r.strippedKey === r.normKey) continue;
    const others = (byNormKey.get(r.strippedKey) ?? []).filter((o) => o.doc._id !== r.doc._id);
    if (others.length) {
      r.signatures.push(`near-duplicate of ${others.map((o) => `"${o.doc.company}"`).join(", ")}`);
      r.nearDuplicateOf = others.map((o) => o.doc._id);
    }
  }

  const flagged = rows.filter((r) => r.signatures.length);
  const clean = rows.filter((r) => !r.signatures.length);

  // Twin index over the clean survivors only.
  const cleanByKey = new Map();
  for (const r of clean) {
    for (const k of docKeys(r.doc)) {
      if (!cleanByKey.has(k)) cleanByKey.set(k, []);
      if (!cleanByKey.get(k).includes(r)) cleanByKey.get(k).push(r);
    }
  }

  for (const r of flagged) {
    r.twin = findCleanTwin(r, clean, cleanByKey);
    r.blockers = deletionBlockers(r);
    r.deletable = !!r.twin?.doc && r.blockers.length === 0;
    if (!r.twin) r.suggestions = suggestTwins(r, clean);
  }

  return { rows, flagged, clean };
}

/**
 * The clean document this corrupted one is a copy of, or null.
 *   1. exact — the stripped name (or one of its aliases) normalises onto a
 *      clean document's name/alias;
 *   2. fragment — the stripped name is a contiguous run of >=2 words inside
 *      exactly one clean name. This is how a wrapped list name resolves:
 *      "(Manipal Cards) 385" → "Manipal Payment and Identity Solutions
 *      (Manipal Cards)".
 * Anything matching more than one clean document is reported as ambiguous and
 * is never deletable.
 */
function findCleanTwin(row, clean, cleanByKey) {
  const keys = [row.strippedKey, ...(row.doc.aliases ?? []).map((a) => normalizeCompanyName(stripCorruption(a)))];
  for (const key of keys) {
    if (!key) continue;
    const hits = (cleanByKey.get(key) ?? []).filter((c) => c.doc._id !== row.doc._id);
    if (hits.length === 1) return { doc: hits[0].doc, kind: "exact name match" };
    if (hits.length > 1) return { ambiguous: hits.map((h) => h.doc), kind: "exact name match" };
  }

  const phrase = row.strippedKey;
  if (phrase && phrase.split(" ").length >= 2) {
    const hits = clean.filter(
      (c) => c.doc._id !== row.doc._id && docKeys(c.doc).some((k) => containsPhrase(k, phrase)),
    );
    if (hits.length === 1) return { doc: hits[0].doc, kind: "name fragment" };
    if (hits.length > 1) return { ambiguous: hits.map((h) => h.doc), kind: "name fragment" };
  }
  return null;
}

/**
 * Clean documents a no-twin corruption MIGHT belong to, as a hint for the
 * human doing the manual review. A single distinctive word ("ppfas" out of
 * "(PPFAS) 19850") is a strong lead but far too weak to delete on — a word
 * like "shares" or "capital" would happily match the wrong company — so these
 * are printed and never acted upon.
 */
function suggestTwins(row, clean) {
  const word = row.strippedKey;
  if (!word || word.length < 4 || word.includes(" ")) return [];
  return clean
    .filter((c) => docKeys(c.doc).some((k) => containsPhrase(k, word)))
    .slice(0, 3)
    .map((c) => c.doc);
}

/**
 * Reasons never to delete a flagged document, even with a twin in hand.
 * Deletion is irreversible against a live public dataset, so the bar is:
 * the damage must be visible in the name itself, and the document must hold
 * nothing a human typed.
 */
function deletionBlockers(row) {
  const d = row.doc;
  const out = [];
  if (row.structural.length === 0) {
    out.push("flagged only as a near-duplicate — the name itself looks clean");
  }
  const editorial = [
    d.summary ? "summary" : null,
    d.sector ? "sector" : null,
    d.risks?.length ? "risks" : null,
    d.logo ? "logo" : null,
    d.ipoStatus && d.ipoStatus !== "none" ? "ipoStatus" : null,
  ].filter(Boolean);
  if (editorial.length) out.push(`carries hand-curated content (${editorial.join(", ")})`);
  if (row.twin?.ambiguous) {
    out.push(`matches ${row.twin.ambiguous.length} clean documents — ambiguous`);
  }
  return out;
}

// ─── report ─────────────────────────────────────────────────────────

const money = (n) => (typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : "—");
const field = (v) => (v === undefined || v === null || v === "" ? "—" : String(v));

function printFlagged(row) {
  const d = row.doc;
  console.log(`  ${d._id}`);
  console.log(`      company   "${d.company}"`);
  console.log(`      signature ${row.signatures.join(" · ")}`);
  console.log(
    `      price     ${money(d.indicativePriceINR)}  ·  lot ${field(d.lotSize)}` +
    `  ·  partner ${field(d.partner)}  ·  as of ${field(d.asOfDate)}`,
  );
  console.log(
    `      visible   ${d.isActive === false ? "no (isActive false)" : d.needsReview ? "no (needsReview)" : "YES — live on the site"}`,
  );
  if (row.twin?.doc) {
    console.log(`      twin      YES — ${row.twin.doc._id} "${row.twin.doc.company}" (${row.twin.kind})`);
  } else if (row.twin?.ambiguous) {
    console.log(`      twin      AMBIGUOUS — ${row.twin.ambiguous.map((t) => `"${t.company}"`).join(", ")}`);
  } else {
    console.log("      twin      NO — nothing else in the dataset covers this company");
    for (const s of row.suggestions ?? []) console.log(`      possibly  "${s.company}" (${s._id}) — not acted on, check by hand`);
  }
  for (const b of row.blockers) console.log(`      hold      ${b}`);
  console.log("");
}

// ─── run ────────────────────────────────────────────────────────────
// Importing this module (the self-test does) must never touch Sanity, so
// everything below only happens when the file is executed directly.

if (import.meta.url !== `file://${process.argv[1]}`) {
  // imported for its pure helpers — nothing to do
} else {

const args = { deleteFlagged: false, flaggedOnly: false, from: null };
for (const a of process.argv.slice(2)) {
  if (a === "--delete-flagged") args.deleteFlagged = true;
  else if (a === "--flagged-only") args.flaggedOnly = true;
  else if (a.startsWith("--from=")) args.from = a.slice(7).trim();
  else if (a === "--help" || a === "-h") {
    console.log("See the header of scripts/audit-unlisted.mjs for usage.");
    process.exit(0);
  } else { console.error(`Unknown flag ${a}`); process.exit(1); }
}
if (args.from && args.deleteFlagged) {
  console.error("--from is a read-only rehearsal against a dump; it cannot be combined with --delete-flagged.");
  process.exit(1);
}

const QUERY = `*[_type == "unlistedShare"]{
     _id, company, indicativePriceINR, lotSize, partner, asOfDate,
     "slug": slug.current, aliases, needsReview, isActive,
     summary, sector, risks, ipoStatus, "logo": defined(logo)
   }`;

const env = args.from
  ? { projectId: "fixture", dataset: args.from }
  : requireSanityEnv({ write: args.deleteFlagged });

const all = args.from
  ? JSON.parse(readFileSync(resolve(args.from), "utf8"))
  : await sanityQuery(env, QUERY);
if (!Array.isArray(all)) { console.error("Expected an array of unlistedShare documents."); process.exit(1); }

const drafts = all.filter((d) => d._id.startsWith("drafts."));
const published = all.filter((d) => !d._id.startsWith("drafts."));
const draftIds = new Set(drafts.map((d) => d._id));

const { rows, flagged, clean } = auditUnlistedDocs(published);

console.log(`Unlisted-shares audit · ${env.projectId}/${env.dataset} · ${args.deleteFlagged ? "DELETE MODE" : "read-only"}\n`);

if (!args.flaggedOnly) {
  console.log(`All ${published.length} published documents:`);
  for (const r of rows.slice().sort((a, b) => String(a.doc.company ?? "").localeCompare(String(b.doc.company ?? "")))) {
      const label = String(r.doc.company ?? "(no company name)");
    console.log(`  ${r.signatures.length ? "⚠" : " "} ${label}${r.signatures.length ? "" : `  ${money(r.doc.indicativePriceINR)}`}`);
  }
  console.log("");
}

const deletable = flagged.filter((r) => r.deletable);
const manual = flagged.filter((r) => !r.deletable);

if (deletable.length) {
  console.log(`Flagged WITH a clean twin — safe to delete (${deletable.length})`);
  console.log("─".repeat(72));
  for (const r of deletable) printFlagged(r);
}

if (manual.length) {
  console.log(`Flagged WITHOUT a safe counterpart — MANUAL REVIEW, never auto-deleted (${manual.length})`);
  console.log("─".repeat(72));
  for (const r of manual) printFlagged(r);
}

console.log("Summary");
console.log("─".repeat(72));
console.log(`  total documents        ${published.length}${drafts.length ? `  (+${drafts.length} drafts, not audited)` : ""}`);
console.log(`  clean                  ${clean.length}`);
console.log(`  flagged                ${flagged.length}`);
console.log(`    · with a clean twin  ${deletable.length}  → deletable with --delete-flagged`);
console.log(`    · manual review      ${manual.length}`);

if (flagged.length) {
  console.log(
    "\n  Note: a flagged document's stored price is NOT trustworthy. The importer bug took\n" +
    "  whichever number sat last before the depository column, which on the partner's list\n" +
    "  is the confidential dealer price. Treat every flagged figure as a leak to be removed,\n" +
    "  not a value to be re-used.",
  );
}

if (!args.deleteFlagged) {
  if (deletable.length) {
    console.log(
      `\nNothing was written. Re-run with --delete-flagged to remove the ${deletable.length} ` +
      `document${deletable.length === 1 ? "" : "s"} listed above.`,
    );
  } else {
    console.log("\nNothing was written (read-only).");
  }
  process.exit(0);
}

// ---------- destructive path ----------
if (deletable.length === 0) {
  console.log("\n--delete-flagged: nothing qualifies for deletion. No mutations sent.");
  process.exit(0);
}

console.log(`\nDeleting ${deletable.length} corrupted documents (each one has a clean twin):`);
const mutations = [];
for (const r of deletable) {
  console.log(`  ✗ ${r.doc._id}  "${r.doc.company}"  →  kept: ${r.twin.doc._id} "${r.twin.doc.company}"`);
  mutations.push({ delete: { id: r.doc._id } });
  if (draftIds.has(`drafts.${r.doc._id}`)) {
    console.log(`      (also removing its draft drafts.${r.doc._id})`);
    mutations.push({ delete: { id: `drafts.${r.doc._id}` } });
  }
}

// Batched so a failure (e.g. another document references one of these) is
// localised and the successful batches are already durable.
const BATCH = 50;
for (let i = 0; i < mutations.length; i += BATCH) {
  await sanityMutate(env, mutations.slice(i, i + BATCH));
  console.log(`  … ${Math.min(i + BATCH, mutations.length)}/${mutations.length} mutations applied`);
}

console.log(`\nDeleted ${deletable.length} documents from ${env.projectId}/${env.dataset}.`);
if (manual.length) {
  console.log(`${manual.length} flagged documents were LEFT IN PLACE for manual review — see the list above.`);
}
console.log("Re-run the audit to confirm, then re-import the day's price list once the importer guard passes.");

}
