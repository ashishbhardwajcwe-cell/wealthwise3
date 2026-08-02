#!/usr/bin/env node
/**
 * Audit (and, on request, repair) the `unlistedShare` documents in Sanity.
 *
 *   npm run audit:unlisted                                # READ-ONLY report
 *   npm run audit:unlisted -- --as-of=2026-08-01          # scope everything to one import
 *   npm run audit:unlisted -- --flagged-only              # skip the clean-document list
 *   npm run audit:unlisted -- --from=docs.json            # rehearse against a dump, no network
 *   npm run audit:unlisted -- --delete-flagged            # delete corruptions that have a clean twin
 *   npm run audit:unlisted -- --purge-import=2026-08-01   # delete one bad import
 *
 * The default run writes NOTHING. There are two destructive modes:
 *
 *  --delete-flagged     removes a document only when BOTH hold: the name
 *      carries a corruption signature, and a clean document for the same
 *      company survives. Anything else — no twin, an ambiguous twin, or any
 *      hand-curated content — is printed for manual review and left alone.
 *
 *  --purge-import=DATE  removes documents carrying that asOfDate AND a
 *      corruption signature. It refuses to run without an explicit date, prints
 *      the full list first, requires a typed confirmation, and re-reads the
 *      dataset afterwards so the resulting count is observed, not predicted.
 *      Documents with that date but a CLEAN name are never deleted — they are
 *      real companies whose price the bad run overwrote, and they are reported
 *      separately for a price repair.
 *
 * ── WHY THE DATE, NOT THE NAME ──────────────────────────────────
 * asOfDate is the only reliable discriminator for this incident. Name
 * signatures are NOT: "Sterlite Grid 5", "Zepto Unlisted Shares (Equity)",
 * "Signify Innovations (Previously Ph", "Sterlite Electric Limited (Formerly"
 * and "Fusion Techstack Limited (Forme" are GENUINE 22-Jul documents — live on
 * the site with correct retail prices, two of them carrying hand-extracted
 * logos — and they trip exactly the same name rules the corrupted documents do.
 * Purging by signature alone destroys them; purging by date leaves them
 * untouched. --purge-import intersects the two and never uses either alone.
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
 * plus SANITY_API_TOKEN (Editor) for --delete-flagged / --purge-import.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
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
 * Split an audited corpus around one import's asOfDate.
 *
 * `asOfDate` is the only reliable discriminator for the 31-Jul/01-Aug incident.
 * Name signatures are NOT: real 22-Jul documents like "Sterlite Grid 5",
 * "Zepto Unlisted Shares (Equity)" and "Signify Innovations (Previously Ph"
 * trip the same rules, are live on the site with correct retail prices, and two
 * of them carry hand-extracted logos. Purging by signature alone destroys them;
 * purging by date leaves them untouched.
 *
 * Returns:
 *  - targets        — this date AND a corruption signature: the purge list.
 *  - cleanSameDate  — this date but a clean name. NEVER deleted: these are
 *                     pre-existing companies whose price the bad run quietly
 *                     overwrote, so the document is real and only the price is
 *                     poisoned. They need a price repair, not a delete.
 *  - otherDates     — untouched by this purge, listed only for the count.
 */
export function selectPurgeTargets(rows, date) {
  const sameDate = rows.filter((r) => r.doc.asOfDate === date);
  return {
    targets: sameDate.filter((r) => r.signatures.length),
    cleanSameDate: sameDate.filter((r) => !r.signatures.length),
    otherDates: rows.filter((r) => r.doc.asOfDate !== date),
  };
}

/** asOfDate → document count, newest first. Lets an operator eyeball the
 *  discriminator before purging on it. */
export function asOfDateHistogram(rows) {
  const counts = new Map();
  for (const r of rows) {
    const k = r.doc.asOfDate || "(no asOfDate)";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[0].localeCompare(a[0]));
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

// ─── confirmation ───────────────────────────────────────────────────

/**
 * Typed confirmation before a purge. The operator has to retype the exact
 * phrase — "y" is too easy to hit on the wrong terminal, and this deletes
 * documents from a live dataset. Closed stdin (a CI runner, a detached shell)
 * yields no line at all, and no line means no consent: the caller aborts.
 */
export async function confirmExactly(expected, { input = process.stdin, out = process.stdout } = {}) {
  out.write(`\nType exactly  ${expected}  to proceed (anything else aborts): `);
  const rl = createInterface({ input, terminal: false });
  const answer = await new Promise((res) => {
    rl.once("line", (l) => res(l));
    rl.once("close", () => res(null));
  });
  rl.close();
  if (answer === null) {
    out.write("\nNo input available on stdin — refusing to delete without a typed confirmation.\n");
    return false;
  }
  return String(answer).trim() === expected;
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const args = { deleteFlagged: false, flaggedOnly: false, from: null, asOf: null, purgeDate: null };
for (const a of process.argv.slice(2)) {
  if (a === "--delete-flagged") args.deleteFlagged = true;
  else if (a === "--flagged-only") args.flaggedOnly = true;
  else if (a.startsWith("--from=")) args.from = a.slice(7).trim();
  else if (a.startsWith("--as-of=")) args.asOf = a.slice(8).trim();
  else if (a.startsWith("--purge-import=")) args.purgeDate = a.slice(15).trim();
  else if (a === "--purge-import" || a === "--as-of") {
    // Refusing a bare flag is the point: a purge with no date, or one that
    // silently defaulted to "today", would delete the wrong import.
    console.error(
      `${a} must name an explicit date: ${a}=YYYY-MM-DD\n` +
      "Run the audit with no flags first and read the asOfDate breakdown to pick the right one.",
    );
    process.exit(1);
  } else if (a === "--help" || a === "-h") {
    console.log("See the header of scripts/audit-unlisted.mjs for usage.");
    process.exit(0);
  } else { console.error(`Unknown flag ${a}`); process.exit(1); }
}

for (const [flag, value] of [["--as-of", args.asOf], ["--purge-import", args.purgeDate]]) {
  if (value !== null && !ISO_DATE.test(value)) {
    console.error(`${flag}="${value}" is not a zero-padded ISO date (YYYY-MM-DD, e.g. 2026-08-01).`);
    process.exit(1);
  }
}
if (args.purgeDate && args.deleteFlagged) {
  console.error("--purge-import and --delete-flagged are different repairs; run them one at a time.");
  process.exit(1);
}
if (args.purgeDate && args.asOf && args.purgeDate !== args.asOf) {
  console.error(`--as-of=${args.asOf} contradicts --purge-import=${args.purgeDate}. Drop --as-of.`);
  process.exit(1);
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
  : requireSanityEnv({ write: args.deleteFlagged || !!args.purgeDate });

/** Fetch + audit the whole corpus. The audit always sees EVERY document, even
 *  when a date scope is in play — twins and near-duplicates live at other
 *  dates, and scoping the corpus would hide them. */
async function loadAndAudit() {
  const all = args.from
    ? JSON.parse(readFileSync(resolve(args.from), "utf8"))
    : await sanityQuery(env, QUERY);
  if (!Array.isArray(all)) { console.error("Expected an array of unlistedShare documents."); process.exit(1); }
  const drafts = all.filter((d) => d._id.startsWith("drafts."));
  const published = all.filter((d) => !d._id.startsWith("drafts."));
  return { drafts, published, draftIds: new Set(drafts.map((d) => d._id)), ...auditUnlistedDocs(published) };
}

function printReport(state, { scope = null, flaggedOnly = false, heading = "read-only" } = {}) {
  const { rows, published, drafts } = state;
  const inScope = (r) => !scope || r.doc.asOfDate === scope;
  const scoped = rows.filter(inScope);
  const flagged = scoped.filter((r) => r.signatures.length);
  const clean = scoped.filter((r) => !r.signatures.length);

  console.log(`Unlisted-shares audit · ${env.projectId}/${env.dataset} · ${heading}`);
  if (scope) console.log(`Scoped to asOfDate ${scope} — ${scoped.length} of ${published.length} documents\n`);
  else console.log("");

  console.log("Documents by asOfDate:");
  for (const [date, n] of asOfDateHistogram(rows)) {
    const bad = rows.filter((r) => (r.doc.asOfDate || "(no asOfDate)") === date && r.signatures.length).length;
    console.log(`  ${date}  ${String(n).padStart(4)}${bad ? `   (${bad} flagged)` : ""}`);
  }
  console.log("");

  if (!flaggedOnly) {
    console.log(`${scoped.length} published document${scoped.length === 1 ? "" : "s"}${scope ? ` at ${scope}` : ""}:`);
    for (const r of scoped.slice().sort((a, b) => String(a.doc.company ?? "").localeCompare(String(b.doc.company ?? "")))) {
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
  console.log(`  total documents        ${scoped.length}${scope ? ` (of ${published.length})` : ""}${drafts.length ? `  (+${drafts.length} drafts, not audited)` : ""}`);
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
  return { flagged, clean, deletable, manual };
}

/** Delete ids in batches so a failure is localised and earlier batches stick. */
async function deleteIds(ids, draftIds) {
  const mutations = [];
  for (const id of ids) {
    mutations.push({ delete: { id } });
    if (draftIds.has(`drafts.${id}`)) mutations.push({ delete: { id: `drafts.${id}` } });
  }
  const BATCH = 50;
  for (let i = 0; i < mutations.length; i += BATCH) {
    await sanityMutate(env, mutations.slice(i, i + BATCH));
    console.log(`  … ${Math.min(i + BATCH, mutations.length)}/${mutations.length} mutations applied`);
  }
}

let state = await loadAndAudit();

// ═══════════════ purge one import ═══════════════
if (args.purgeDate) {
  const { targets, cleanSameDate, otherDates } = selectPurgeTargets(state.rows, args.purgeDate);

  console.log(`Unlisted-shares PURGE PLAN · ${env.projectId}/${env.dataset} · import of ${args.purgeDate}\n`);
  console.log("Documents by asOfDate:");
  for (const [date, n] of asOfDateHistogram(state.rows)) {
    console.log(`  ${date}  ${String(n).padStart(4)}${date === args.purgeDate ? "   ← purge target" : ""}`);
  }

  if (targets.length === 0) {
    console.log(`\nNothing carries asOfDate ${args.purgeDate} with a corruption signature. No mutations sent.`);
    process.exit(0);
  }

  console.log(`\nTO BE DELETED — asOfDate ${args.purgeDate} AND a corruption signature (${targets.length})`);
  console.log("─".repeat(72));
  for (const r of targets) printFlagged(r);

  // Item 4: a pre-existing company the bad run merely UPDATED has a clean name
  // and a poisoned price. Deleting it would destroy a real company, so it is
  // only ever reported — but it is the more dangerous case, because a clean
  // name means nothing hides it from the site.
  console.log(`CLEAN NAMES ALSO CARRYING ${args.purgeDate} — NOT deleted (${cleanSameDate.length})`);
  console.log("─".repeat(72));
  if (cleanSameDate.length === 0) {
    console.log("  None. Every document stamped with this import has a corrupted name, so the bad run\n" +
      "  only created documents — it did not overwrite the price of any existing company.\n");
  } else {
    console.log(
      "  These are real companies whose price this import overwrote. The document must stay; the\n" +
      "  PRICE is the problem, and a clean name means needsReview is not hiding it.\n",
    );
    for (const r of cleanSameDate) {
      const d = r.doc;
      console.log(`  ${d._id}`);
      console.log(`      company   "${d.company}"`);
      console.log(`      price     ${money(d.indicativePriceINR)}  ·  as of ${field(d.asOfDate)}  ·  partner ${field(d.partner)}`);
      console.log(`      visible   ${d.isActive === false ? "no (isActive false)" : d.needsReview ? "no (needsReview)" : "YES — LIVE ON THE SITE"}`);
      console.log("");
    }
    console.log(
      "  Fix these by re-importing the correct list for this date (the importer will overwrite the\n" +
      "  price), or by clearing indicativePriceINR/asOfDate in Studio. Do NOT delete them.\n",
    );
  }

  console.log("After this purge");
  console.log("─".repeat(72));
  console.log(`  deleted                ${targets.length}`);
  console.log(`  remaining              ${state.published.length - targets.length}`);
  console.log(`    · other import dates ${otherDates.length}`);
  console.log(`    · clean, same date   ${cleanSameDate.length}  (price needs repair — see above)`);

  const curated = targets.filter((r) => r.blockers.some((b) => /hand-curated/.test(b)));
  if (curated.length) {
    console.log(`\n  ⚠ ${curated.length} of the documents to be deleted carry hand-curated content:`);
    for (const r of curated) console.log(`      "${r.doc.company}" — ${r.blockers.find((b) => /hand-curated/.test(b))}`);
    console.log("      That content will be lost. Check the list above before confirming.");
  }

  if (targets.length >= state.published.length) {
    console.error("\nABORTED — this purge would empty the dataset. That is never the right repair.");
    process.exit(1);
  }
  if (args.from) {
    console.log("\n--from: rehearsal only, nothing was written and no confirmation was asked for.");
    process.exit(0);
  }

  if (!await confirmExactly(`PURGE ${args.purgeDate}`)) {
    console.log("\nAborted — nothing was written.");
    process.exit(1);
  }

  console.log(`\nDeleting ${targets.length} documents stamped ${args.purgeDate}:`);
  for (const r of targets) console.log(`  ✗ ${r.doc._id}  "${r.doc.company}"  ${money(r.doc.indicativePriceINR)}`);
  await deleteIds(targets.map((r) => r.doc._id), state.draftIds);
  console.log(`\nDeleted ${targets.length} documents from ${env.projectId}/${env.dataset}.`);

  // Item 5: re-read from Sanity and re-report, so the new count is observed
  // rather than predicted.
  console.log(`\n${"═".repeat(72)}\nRe-reading the dataset to confirm\n${"═".repeat(72)}\n`);
  state = await loadAndAudit();
  printReport(state, { flaggedOnly: true, heading: `after purging ${args.purgeDate}` });
  if (cleanSameDate.length) {
    console.log(
      `\n  Still outstanding: ${cleanSameDate.length} clean-named document${cleanSameDate.length === 1 ? "" : "s"} ` +
      `whose price came from the ${args.purgeDate} run.\n  Re-import the correct list, or clear the price in Studio.`,
    );
  }
  process.exit(0);
}

// ═══════════════ report / twin-based delete ═══════════════
const heading = args.deleteFlagged ? "DELETE MODE" : "read-only";
const { deletable, manual } = printReport(state, { scope: args.asOf, flaggedOnly: args.flaggedOnly, heading });

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
for (const r of deletable) {
  console.log(`  ✗ ${r.doc._id}  "${r.doc.company}"  →  kept: ${r.twin.doc._id} "${r.twin.doc.company}"`);
}
await deleteIds(deletable.map((r) => r.doc._id), state.draftIds);

console.log(`\nDeleted ${deletable.length} documents from ${env.projectId}/${env.dataset}.`);
if (manual.length) {
  console.log(`${manual.length} flagged documents were LEFT IN PLACE for manual review — see the list above.`);
}
console.log("Re-run the audit to confirm, then re-import the day's price list once the importer guard passes.");

}
