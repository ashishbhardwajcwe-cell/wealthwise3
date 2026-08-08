#!/usr/bin/env node
/**
 * Self-test for the unlisted-shares pipeline's silent-failure surfaces.
 *
 *   node scripts/unlisted-pipeline.test.mjs      (or: npm run test:unlisted)
 *
 * No dependencies, no network, no Sanity. Six things are covered, all of
 * them invisible in a normal run and expensive to get wrong:
 *
 *  - The 31-Jul-2026 corruption itself, reproduced from the text-layer row
 *    grammar. The four names in the first test are the real ones that reached
 *    the public dataset; they must keep reproducing exactly, or the guard
 *    below is guarding a bug that has quietly changed shape.
 *  - The pre-write guard (validateImportRows). It has to reject a fused parse
 *    without rejecting real company names that end in digits — "Bira 91" is a
 *    company, "Shares 454" is a parser accident.
 *  - The audit's delete decision (auditUnlistedDocs). It deletes against a
 *    live, publicly readable dataset, so "has a clean twin" and "carries
 *    hand-curated content" have to be exactly right.
 *  - The DEALER column never being selected as the price. Confidential, and a
 *    mis-selection reads as a perfectly ordinary import.
 *  - The two relaxed matching passes, which decide whether the 06-Aug Excel
 *    list updates the existing companies or forks a duplicate of the dataset.
 *  - The .xlsx reader's multi-sheet walk. Reading one sheet of seven looks
 *    exactly like a partner who shrank their list.
 */

import { strict as assert } from "node:assert";
import {
  parsePriceListText, priceFusedName, validateImportRows,
  hasUnbalancedBracket, stripCorruption, trailingNumber,
  mapCsvHeader, assertRetailPriceColumn, resolveUnlistedTarget,
  canonicalDepository, classifyDepository, sanitizeListText,
  storedNameCorruption, nearbyExistingDocs, buildMatchedDocSet,
  stripListBoilerplate, normalizeCompanyName, declaredNameKey,
} from "./unlisted-matching.mjs";
import { loadUnlistedAliases } from "./unlisted-aliases.mjs";
import { planCleanup, planAliasDedupe, dedupeAliases } from "./clean-unlisted-dupes.mjs";
import {
  approvalBlockers, selectForApproval, selectForHiding, reviewRow, renderTable,
} from "./approve-unlisted.mjs";
import {
  auditUnlistedDocs, structuralSignatures, selectPurgeTargets, untrustedPriceRows,
  asOfDateHistogram, confirmExactly, XLSX_PIPELINE_FIRST_IMPORT, GENUINE_TRAILING_DIGIT_NAMES,
} from "./audit-unlisted.mjs";
import { Readable } from "node:stream";
import { crc32 } from "node:zlib";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { cleanUnlistedName } from "./clean-unlisted-names.mjs";
import { readUnlistedXlsxBytes, joinLogosToRows } from "./unlisted-xlsx.mjs";
import { planAttachments, cropFileName, trimUniformWhiteBorder } from "./extract-unlisted-logos.mjs";
import { slugify, normalizeIsoDate } from "./import-shared.mjs";

let passed = 0;
const failures = [];
const pending = [];
const test = (name, fn) => {
  try {
    const r = fn();
    if (r && typeof r.then === "function") {
      pending.push(r.then(() => { passed++; }, (err) => failures.push({ name, err })));
    } else passed++;
  } catch (err) { failures.push({ name, err }); }
};

const row = (name, price = 100) => ({ name, price });

/** Filler company names for the bulk checks — none of them end in a digit, so
 *  they only trip a rule when the rule is genuinely firing. */
const NAMES = [
  "Tata Capital", "Hero FinCorp", "PharmEasy", "NSE India", "Chennai Super Kings",
  "Apl Metals", "Urban Tots", "Fino Paytech", "Arohan Financial", "Galaxeye Space",
  "Indian Gas", "Fusion Micro Finance", "Capgemini Technology", "Sun Drops", "Tea Time",
  "Lakeshore Hospital", "Jai Mata Glass", "India Carbon", "Studds Accessories", "Boat Lifestyle",
];

/* ---------- the bug ---------- */

test("the text-layer row grammar reproduces the 31-Jul corruption exactly", () => {
  // The partner's list is name · retail · depository · dealer · lot. This
  // export put the dealer price BEFORE the depository, so "the last number
  // before the depository" is the dealer price and the retail price stays
  // stuck to the name. Long names wrap, so only the tail fragment shares the
  // line with the numbers — which is why the corrupted names start mid-name.
  const text = [
    "Manipal Payment and Identity Solutions",
    "(Manipal Cards) 385\t370\tNSDL & CDSL\t100",
    "Parag Parikh Financial Advisory Services",
    "(PPFAS) 19850\t19100\tNSDL & CDSL\t10",
    "National Commodity & Derivatives Exchange",
    "(NCDEX) Limited Unlisted Shares 388\t372\tONLY NSDL\t250",
    "Hero FinCorp Limited Unlisted",
    "Shares \t454\t441\tNSDL & CDSL\t50",
  ].join("\n");

  const { rows } = parsePriceListText(text);
  assert.deepEqual(
    rows.map((r) => r.name),
    ["(Manipal Cards) 385", "(PPFAS) 19850", "(NCDEX) Limited Unlisted Shares 388", "Shares   454"],
    "these are the names that actually reached Sanity",
  );
  // …and the price it stored is the SECOND number, not the retail one.
  assert.deepEqual(rows.map((r) => r.price), [370, 19100, 372, 441]);
  assert.equal(rows.length, 4, "every row parsed 'successfully' — nothing errored");
});

test("clean-unlisted-names no longer turns the fused names into dangling brackets", () => {
  // Step two of the incident: the cleanup script read the leading "(" as OCR
  // logo junk and stripped it, leaving "Manipal Cards) 385" behind. A
  // price-fused name is a broken import, not logo junk — leave it for the audit.
  assert.equal(cleanUnlistedName("(Manipal Cards) 385"), "(Manipal Cards) 385");
  assert.equal(cleanUnlistedName("(PPFAS) 19850"), "(PPFAS) 19850");
});

test("clean-unlisted-names never hands back an unbalanced name", () => {
  // A real name that opens with a bracket must survive the leading-symbol rule.
  assert.equal(cleanUnlistedName("(Formerly Bharat Ltd) Alpha Steel"), "(Formerly Bharat Ltd) Alpha Steel");
  // …while the junk it was written for still gets cleaned.
  assert.equal(cleanUnlistedName("[J] Capgemini Technology Services"), "Capgemini Technology Services");
  assert.equal(cleanUnlistedName("«wx Fusion Micro Finance"), "Fusion Micro Finance");
  assert.equal(cleanUnlistedName("i Urban Tots"), "Urban Tots");
  assert.equal(cleanUnlistedName("GS Galaxeye Space"), "Galaxeye Space");
  assert.equal(cleanUnlistedName("A One Steel"), "A One Steel", "A != O, so this is a real name");
  assert.equal(cleanUnlistedName("Capgemini Technology Services|"), "Capgemini Technology Services");
});

/* ---------- trailing row boilerplate ---------- */

test("clean-unlisted-names strips the list's row boilerplate off the tail", () => {
  // Four documents the 06-Aug import created with the row heading baked in.
  assert.equal(cleanUnlistedName("Bazar India Unlisted Shares"), "Bazar India");
  assert.equal(cleanUnlistedName("Cheelizza Pizza Unlisted Shares"), "Cheelizza Pizza");
  assert.equal(cleanUnlistedName("Gynofem Healthcare Unlisted Shares Price"), "Gynofem Healthcare");
  assert.equal(cleanUnlistedName("IKF Finance Limited Unlisted Shares"), "IKF Finance Limited");
  // Singular too — the list writes both.
  assert.equal(cleanUnlistedName("Kineco Limited Unlisted Share"), "Kineco Limited");
});

test("a bracketed qualifier survives the boilerplate strip", () => {
  // "(Equity)" is the ONLY thing separating this document from the CCPS line.
  // Stripping to a bare "Zepto" would make the two indistinguishable.
  assert.equal(cleanUnlistedName("Zepto Unlisted Shares (Equity)"), "Zepto (Equity)");
});

test("the boilerplate strip leaves curated names alone", () => {
  for (const n of ["Hero FinCorp", "PharmEasy", "boAt", "Tata Capital", "Sterlite Grid 5",
                   "Sterlite Electric Limited (formerly Sterlite Power)"]) {
    assert.equal(cleanUnlistedName(n), n, `"${n}" is curated — nothing to clean`);
  }
  // "Price" is only boilerplate at the END of a name, never inside one.
  assert.equal(cleanUnlistedName("Price Waterhouse Limited"), "Price Waterhouse Limited");
});

test("cleanUnlistedName is idempotent — re-running changes nothing", () => {
  for (const n of ["Bazar India Unlisted Shares", "Zepto Unlisted Shares (Equity)",
                   "Gynofem Healthcare Unlisted Shares Price", "[J] Capgemini Technology Services",
                   "«wx Fusion Micro Finance", "(Manipal Cards) 385", "Hero FinCorp"]) {
    const once = cleanUnlistedName(n);
    assert.equal(cleanUnlistedName(once), once, `"${n}" → "${once}" must be a fixed point`);
  }
});

test("clean-unlisted-names shares its boilerplate rule with the matcher", () => {
  // If these two drifted, this script would rename a document to something its
  // own matcher no longer recognised, and the next import would fork a duplicate.
  for (const n of ["Bazar India Unlisted Shares", "Gynofem Healthcare Unlisted Shares Price",
                   "Zepto Unlisted Shares (Equity)", "IKF Finance Limited Unlisted Shares"]) {
    assert.equal(cleanUnlistedName(n), stripListBoilerplate(n).replace(/\s{2,}/g, " ").trim());
  }
});

test("a price-fused name is still left for the audit, boilerplate or not", () => {
  // The early return has to win: stripping "Unlisted Shares" out of this would
  // leave "(NCDEX) Limited 388", which is no more publishable than it was.
  assert.equal(cleanUnlistedName("(NCDEX) Limited Unlisted Shares 388"), "(NCDEX) Limited Unlisted Shares 388");
});

/* ---------- the pre-write guard ---------- */

test("priceFusedName catches the fused names", () => {
  for (const n of ["(Manipal Cards) 385", "Manipal Cards) 385", "(PPFAS) 19850", "Shares   454",
                   "(NCDEX) Limited Unlisted Shares 388"]) {
    assert.ok(priceFusedName(n), `expected "${n}" to be flagged`);
  }
  assert.ok(priceFusedName("Tata Capital ₹950"), "a currency amount in a name is always wrong");
  assert.ok(priceFusedName("Fusion Micro Finance 1,725"), "a formatted number is a price");
});

test("priceFusedName leaves real company names alone", () => {
  for (const n of ["Bira 91", "Cars24", "A One Steel", "B9 Beverages", "63 Moons Technologies",
                   "Hero FinCorp", "PharmEasy", "boAt", "Vision2000 Technologies", "3M India"]) {
    assert.equal(priceFusedName(n), null, `expected "${n}" to pass`);
  }
});

test("validateImportRows aborts a fused parse", () => {
  const { errors } = validateImportRows([
    row("(Manipal Cards) 385", 370),
    row("(PPFAS) 19850", 19100),
    row("Tata Capital", 950),
  ]);
  assert.ok(errors.some((e) => e.code === "name-price-fusion"), "expected a name-price-fusion error");
});

test("validateImportRows passes a clean parse", () => {
  const rows = ["Tata Capital", "Hero FinCorp", "Bira 91", "NSE India", "Chennai Super Kings"]
    .map((n) => row(n));
  const { errors } = validateImportRows(rows, { previousRowCount: 5 });
  assert.deepEqual(errors, [], "a clean list must not be blocked");
});

test("a systemic 2-digit fusion is caught even though each row passes on its own", () => {
  // "Foo 85" alone is indistinguishable from "Bira 91"; eight of them in a
  // ten-row list is a column shift.
  const rows = [...Array(8)].map((_, i) => row(`Company ${i} 8${i}`))
    .concat([row("Tata Capital"), row("Hero FinCorp")]);
  const { errors } = validateImportRows(rows);
  assert.ok(errors.some((e) => e.code === "name-trailing-digits"));
});

test("one 'Bira 91' in a real list is not a systemic fusion", () => {
  const rows = [row("Bira 91"), ...NAMES.slice(0, 19).map((n) => row(n))];
  const { errors } = validateImportRows(rows);
  assert.deepEqual(errors, []);
});

test("validateImportRows enforces the row-count band", () => {
  const rows = [...Array(179)].map((_, i) => row(`${NAMES[i % NAMES.length]} ${i}`.replace(/\d/g, "")));
  assert.deepEqual(validateImportRows(rows, { previousRowCount: 172 }).errors, [], "±4% is normal daily churn");

  const halved = validateImportRows(rows.slice(0, 80), { previousRowCount: 172, previousAsOfDate: "2026-07-22" });
  assert.ok(halved.errors.some((e) => e.code === "row-count-band"), "a list that halves must abort");
  assert.ok(/2026-07-22/.test(halved.errors.find((e) => e.code === "row-count-band").message));

  const doubled = validateImportRows([...rows, ...rows], { previousRowCount: 172 });
  assert.ok(doubled.errors.some((e) => e.code === "row-count-band"), "a list that doubles must abort");

  assert.deepEqual(validateImportRows(rows, { previousRowCount: 0 }).errors, [],
    "no baseline (first import) must not block");
});

test('"Unlisted Shares" boilerplate warns but does not block on its own', () => {
  const rows = NAMES.slice(0, 10).map((n) => row(`${n} Unlisted Shares`));
  const { errors, warnings } = validateImportRows(rows);
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 1);
});

/* ---------- name helpers ---------- */

test("hasUnbalancedBracket finds the dangling brackets and nothing else", () => {
  assert.ok(hasUnbalancedBracket("Manipal Cards) 385"));
  assert.ok(hasUnbalancedBracket("(Manipal Cards"));
  assert.ok(hasUnbalancedBracket("Foo ) ( Bar"), "a close before its open is unbalanced");
  assert.equal(hasUnbalancedBracket("Parag Parikh (PPFAS) Limited"), false);
  assert.equal(hasUnbalancedBracket("Tata Capital"), false);
});

test("stripCorruption recovers the company underneath", () => {
  assert.equal(stripCorruption("(Manipal Cards) 385"), "Manipal Cards");
  assert.equal(stripCorruption("Manipal Cards) 385"), "Manipal Cards");
  assert.equal(stripCorruption("(NCDEX) Limited Unlisted Shares 388"), "NCDEX Limited");
  assert.equal(stripCorruption("Tata Capital"), "Tata Capital");
});

test("trailingNumber only reports a separated tail", () => {
  assert.equal(trailingNumber("Cars24").separated, false, "fused into the word — a brand, not a column");
  assert.equal(trailingNumber("Bira 91").separated, true);
  assert.equal(trailingNumber("Manipal Cards) 385").separated, true, "a bracket counts as a separator");
  assert.equal(trailingNumber("Tata Capital"), null);
});

/* ---------- the audit ---------- */

const doc = (id, company, extra = {}) => ({
  _id: id, company, indicativePriceINR: 100, lotSize: 10,
  partner: "uz", asOfDate: "2026-07-31", aliases: [], ...extra,
});

test("structuralSignatures reports each corruption signature", () => {
  assert.ok(structuralSignatures("Shares 454").some((s) => s.startsWith("ends in digits")));
  assert.ok(structuralSignatures("Manipal Cards) 385").includes("unbalanced bracket"));
  assert.ok(structuralSignatures("NCDEX Limited Unlisted Shares").includes('contains "Unlisted Shares"'));
  assert.deepEqual(structuralSignatures("Tata Capital"), []);
});

test("a corrupted document with an exact clean twin is deletable", () => {
  const { flagged } = auditUnlistedDocs([
    doc("unlistedShare-tata-capital", "Tata Capital"),
    doc("unlistedShare-tata-capital-950", "Tata Capital 950"),
  ]);
  assert.equal(flagged.length, 1);
  assert.equal(flagged[0].doc._id, "unlistedShare-tata-capital-950");
  assert.equal(flagged[0].deletable, true);
  assert.equal(flagged[0].twin.doc._id, "unlistedShare-tata-capital");
});

test("a wrapped name fragment resolves to its clean twin", () => {
  const { flagged, clean } = auditUnlistedDocs([
    doc("unlistedShare-manipal", "Manipal Payment and Identity Solutions (Manipal Cards)"),
    doc("unlistedShare-manipal-cards-385", "Manipal Cards) 385"),
  ]);
  assert.equal(clean.length, 1, "the curated document must not be flagged");
  assert.equal(flagged.length, 1);
  assert.equal(flagged[0].deletable, true);
  assert.equal(flagged[0].twin.kind, "name fragment");
  assert.equal(flagged[0].twin.doc._id, "unlistedShare-manipal");
});

test("a corrupted document with NO counterpart is never deletable", () => {
  const { flagged } = auditUnlistedDocs([
    doc("unlistedShare-tata-capital", "Tata Capital"),
    doc("unlistedShare-ncdex-388", "(NCDEX) Limited Unlisted Shares 388"),
  ]);
  const ncdex = flagged.find((r) => r.doc._id === "unlistedShare-ncdex-388");
  assert.equal(ncdex.deletable, false);
  assert.equal(ncdex.twin, null, "no twin — this one needs a human");
});

test("an ambiguous match is reported, not deleted", () => {
  const { flagged } = auditUnlistedDocs([
    doc("a", "Sterlite Power Transmission"),
    doc("b", "Sterlite Power Grid"),
    doc("c", "Sterlite Power 450"),
  ]);
  const c = flagged.find((r) => r.doc._id === "c");
  assert.ok(c.twin.ambiguous, "two candidates must not resolve to one");
  assert.equal(c.deletable, false);
});

test("hand-curated content blocks deletion even with a clean twin", () => {
  const { flagged } = auditUnlistedDocs([
    doc("unlistedShare-tata-capital", "Tata Capital"),
    doc("unlistedShare-tata-capital-950", "Tata Capital 950", { summary: "Written by an editor." }),
  ]);
  assert.equal(flagged[0].deletable, false);
  assert.ok(flagged[0].blockers.some((b) => /hand-curated/.test(b)));
});

test("a near-duplicate whose own name looks clean is never auto-deleted", () => {
  // "Bira" and "Bira 91" are both plausible names; only the digits differ, and
  // "Bira 91" is a real company. Flag it for a human, never delete it.
  const { flagged } = auditUnlistedDocs([doc("a", "Bira"), doc("b", "Bira 91")]);
  const b = flagged.find((r) => r.doc._id === "b");
  assert.equal(b.deletable, true, "'Bira 91' ends in digits, so it IS structurally flagged");
  // …which is why the structural rule alone is not the safety net: the twin
  // must exist too, and here a document literally named "Bira" does exist.
  // Verify the inverse — a clean-named near-duplicate is held back.
  const { flagged: f2 } = auditUnlistedDocs([
    doc("x", "Fusion Micro Finance"),
    doc("y", "Fusion Micro Finance Limited"),
  ]);
  for (const r of f2) assert.equal(r.deletable, false, `${r.doc.company} must not be auto-deleted`);
});

test("a clean dataset produces no flags at all", () => {
  const { flagged, clean } = auditUnlistedDocs([
    doc("a", "Tata Capital"), doc("b", "Hero FinCorp"),
    doc("c", "Parag Parikh Financial Advisory Services (PPFAS)"), doc("d", "Bira 91"),
  ]);
  assert.equal(clean.length, 3);
  assert.equal(flagged.length, 1, "'Bira 91' ends in digits and is reported…");
  assert.equal(flagged[0].deletable, false, "…but has no twin, so it is only ever reported");
});

/* ---------- the date-scoped purge ---------- */

/**
 * The five names below are REAL 22-Jul documents, live on the site with correct
 * retail prices and two of them carrying hand-extracted logos. Four of them
 * still trip a name signature, which is precisely why the purge intersects the
 * signature with asOfDate instead of trusting either alone.
 *
 * The fifth, "Sterlite Grid 5", is now whitelisted: its trailing 5 is an SPV
 * number, part of the company. It stays in this list because the purge must go
 * on treating it as a document to protect, not because it still trips.
 */
const GENUINE_22_JUL = [
  "Sterlite Grid 5",
  "Zepto Unlisted Shares (Equity)",
  "Signify Innovations (Previously Ph",
  "Sterlite Electric Limited (Formerly",
  "Fusion Techstack Limited (Forme",
];
const GENUINE_22_JUL_FLAGGED = GENUINE_22_JUL.filter((n) => !GENUINE_TRAILING_DIGIT_NAMES.includes(n));

test("every genuine 22-Jul name really does trip a signature (the trap)", () => {
  for (const n of GENUINE_22_JUL_FLAGGED) {
    assert.ok(structuralSignatures(n).length > 0,
      `"${n}" must trip a signature — that is what makes name-only purging unsafe`);
  }
  assert.equal(GENUINE_22_JUL_FLAGGED.length, 4, "one of the five is whitelisted, the rest still trip");
});

test("a real name ending in digits is whitelisted, not rule-loosened", () => {
  // The SPV number is part of the company.
  assert.deepEqual(structuralSignatures("Sterlite Grid 5"), []);
  // …and the corruptions the rule exists for are structurally identical, so
  // only an explicit whitelist can spare one without sparing the others.
  assert.ok(structuralSignatures("Shares 454").some((s) => s.startsWith("ends in digits")));
  assert.ok(structuralSignatures("(PPFAS) 19850").some((s) => s.startsWith("ends in digits")));
  assert.ok(structuralSignatures("Sterlite Grid 6").some((s) => s.startsWith("ends in digits")),
    "an SPV we have not vouched for is NOT covered by the entry for Grid 5");
  // The whitelist covers the name, not a corrupted variant of it.
  assert.ok(structuralSignatures("Sterlite Grid 5 332").some((s) => s.startsWith("ends in digits")),
    "a price fused onto the whitelisted name must still be flagged");
});

test("purging a date leaves the genuine documents at other dates untouched", () => {
  const docs = [
    ...GENUINE_22_JUL.map((c, i) => doc(`legit-${i}`, c, { asOfDate: "2026-07-22", logo: i < 2 })),
    doc("bad-1", "Shares 555", { asOfDate: "2026-08-01", indicativePriceINR: 545, needsReview: true }),
    doc("bad-2", "Manipal Cards) 385", { asOfDate: "2026-08-01", needsReview: true }),
    doc("bad-3", "PPFAS) 19850", { asOfDate: "2026-07-31", needsReview: true }),
  ];
  const { rows } = auditUnlistedDocs(docs);

  const aug = selectPurgeTargets(rows, "2026-08-01");
  assert.deepEqual(aug.targets.map((r) => r.doc._id), ["bad-1", "bad-2"]);
  assert.equal(aug.otherDates.length, 6, "the 5 genuine + the 31-Jul row are out of scope");
  for (const n of GENUINE_22_JUL) {
    assert.ok(!aug.targets.some((r) => r.doc.company === n), `"${n}" must never be a purge target`);
  }

  const jul31 = selectPurgeTargets(rows, "2026-07-31");
  assert.deepEqual(jul31.targets.map((r) => r.doc._id), ["bad-3"]);

  // …and purging the legitimate import's own date would take the flagged ones
  // with it, which is why the date has to be typed explicitly and the list read
  // first. "Sterlite Grid 5" is spared even then, now that it is whitelisted.
  const jul22 = selectPurgeTargets(rows, "2026-07-22");
  assert.equal(jul22.targets.length, 4);
  assert.ok(!jul22.targets.some((r) => r.doc.company === "Sterlite Grid 5"),
    "the whitelisted name is not a purge target on any date");
  assert.deepEqual(jul22.cleanSameDate.map((r) => r.doc.company), ["Sterlite Grid 5"]);
});

test("a clean name carrying the purge date is reported, never deleted", () => {
  // A pre-existing company the bad run merely re-priced: real document,
  // poisoned price, and a clean name means needsReview is not hiding it.
  const docs = [
    doc("bad-1", "Shares 555", { asOfDate: "2026-08-01", indicativePriceINR: 545, needsReview: true }),
    doc("tata", "Tata Capital", { asOfDate: "2026-08-01", indicativePriceINR: 930 }),
  ];
  const { rows } = auditUnlistedDocs(docs);
  const { targets, cleanSameDate } = selectPurgeTargets(rows, "2026-08-01");
  assert.deepEqual(targets.map((r) => r.doc._id), ["bad-1"]);
  assert.deepEqual(cleanSameDate.map((r) => r.doc._id), ["tata"], "reported for a price repair");
});

test("selectPurgeTargets ignores documents with no asOfDate", () => {
  const docs = [doc("a", "Shares 555", { asOfDate: undefined }), doc("b", "Shares 666", { asOfDate: "2026-08-01" })];
  const { rows } = auditUnlistedDocs(docs);
  assert.deepEqual(selectPurgeTargets(rows, "2026-08-01").targets.map((r) => r.doc._id), ["b"]);
});

/* ---------- which flagged prices are actually suspect ---------- */

test("the untrusted-price warning is scoped to the pre-xlsx importer", () => {
  const docs = [
    // Named badly by the 06-Aug xlsx run — but its price came through the
    // asserted retail column, so the price is fine and only the name is not.
    doc("fresh", "Bazar India Unlisted Shares", { asOfDate: "2026-08-06", indicativePriceINR: 24 }),
    // The old importer: whichever number sat before the depository column.
    doc("stale", "Shares 454", { asOfDate: "2026-07-31", indicativePriceINR: 441 }),
    doc("undated", "Manipal Cards) 385", { asOfDate: undefined, indicativePriceINR: 385 }),
    // Flagged, but holds no price at all — there is nothing to distrust.
    doc("priceless", "Shares 555", { asOfDate: "2026-07-22", indicativePriceINR: undefined }),
  ];
  const { flagged } = auditUnlistedDocs(docs);
  assert.equal(flagged.length, 4, "all four names trip a signature");
  assert.deepEqual(untrustedPriceRows(flagged).map((r) => r.doc._id), ["stale", "undated"]);
});

test("the xlsx cutoff is the boundary, and it is inclusive", () => {
  const before = doc("a", "Shares 454", { asOfDate: "2026-08-05", indicativePriceINR: 10 });
  const on = doc("b", "Shares 455", { asOfDate: XLSX_PIPELINE_FIRST_IMPORT, indicativePriceINR: 10 });
  const { flagged } = auditUnlistedDocs([before, on]);
  assert.deepEqual(untrustedPriceRows(flagged).map((r) => r.doc._id), ["a"],
    "the first xlsx import itself is trustworthy");
});

test("asOfDateHistogram surfaces the discriminator, newest first", () => {
  const docs = [
    doc("a", "Alpha", { asOfDate: "2026-07-22" }), doc("b", "Beta", { asOfDate: "2026-07-22" }),
    doc("c", "Shares 555", { asOfDate: "2026-08-01" }), doc("d", "Gamma", { asOfDate: undefined }),
  ];
  const { rows } = auditUnlistedDocs(docs);
  assert.deepEqual(asOfDateHistogram(rows), [
    ["2026-08-01", 1], ["2026-07-22", 2], ["(no asOfDate)", 1],
  ]);
});

/* ---------- the confirmation gate ---------- */

const silent = { write: () => {} };
const typed = (text) => Readable.from([text]);

test("the purge confirmation accepts only the exact phrase", async () => {
  assert.equal(await confirmExactly("PURGE 2026-08-01", { input: typed("PURGE 2026-08-01\n"), out: silent }), true);
  assert.equal(await confirmExactly("PURGE 2026-08-01", { input: typed("  PURGE 2026-08-01  \n"), out: silent }), true,
    "surrounding whitespace is forgiven");
  for (const wrong of ["y\n", "yes\n", "PURGE\n", "purge 2026-08-01\n", "PURGE 2026-07-22\n", "\n"]) {
    assert.equal(await confirmExactly("PURGE 2026-08-01", { input: typed(wrong), out: silent }), false,
      `"${wrong.trim()}" must not confirm`);
  }
});

test("closed stdin is not consent", async () => {
  assert.equal(await confirmExactly("PURGE 2026-08-01", { input: Readable.from([]), out: silent }), false);
});

/* ---------- the dealer column ---------- */

/**
 * The single most expensive thing this pipeline could get wrong. The dealer
 * (cost) price is confidential and sits next to the retail price on the
 * partner's sheet; publishing it would look like an ordinary successful
 * import. mapCsvHeader identifies dealer columns only to exclude them, and
 * assertRetailPriceColumn then checks what was actually selected.
 */
const XL_HEADER = ["S.No", "", "Share Name", "Retail Price", "Dealer Price", "Depository", "Min. Lot Size"];
const XL_HEADER_DEALER_FIRST = ["S.No", "", "Share Name", "Dealer Price", "Retail Price", "Depository", "Min. Lot Size"];

test("a Dealer Price column is never selected, in either column order", () => {
  const asWritten = mapCsvHeader(XL_HEADER);
  assert.equal(asWritten.price, 3, "retail, not the dealer column beside it");
  assert.equal(asWritten.name, 2);
  assert.equal(asWritten.depository, 5);
  assert.equal(asWritten.lot, 6);

  // …and the same when the partner puts the dealer column FIRST, where "the
  // first price-ish column" would pick exactly the wrong one.
  const swapped = mapCsvHeader(XL_HEADER_DEALER_FIRST);
  assert.equal(swapped.price, 4, "still retail — position must not decide this");
  assert.equal(swapped.name, 2);

  // No mapped column of either layout may land on the dealer header.
  for (const [headers, map] of [[XL_HEADER, asWritten], [XL_HEADER_DEALER_FIRST, swapped]]) {
    for (const [field, idx] of Object.entries(map)) {
      assert.ok(!/dealer/i.test(headers[idx]), `${field} resolved to "${headers[idx]}"`);
    }
  }
});

test("a sheet whose only price column is the dealer one is refused outright", () => {
  const map = mapCsvHeader(["S.No", "", "Share Name", "Dealer Price", "Depository"]);
  assert.ok(map.error, "no retail column means no import, never a fallback to dealer");
  assert.match(map.error, /no retail price column/);
});

test("mapCsvHeader tolerates the blank header on the logo column", () => {
  // Column B holds the row logos and has no title at all. A blank header must
  // simply match nothing — not throw, and not be mistaken for a name column.
  const map = mapCsvHeader(XL_HEADER);
  assert.ok(!map.error);
  assert.notEqual(map.name, 1);
  assert.notEqual(map.price, 1);
  assert.deepEqual(mapCsvHeader(["", "Share Name", "Retail Price"]), { name: 1, price: 2 });
});

test("assertRetailPriceColumn is the second lock, and it says retail or nothing", () => {
  assert.equal(assertRetailPriceColumn(XL_HEADER, 3), "Retail Price");
  // A single plainly-named "Price" column is unambiguous to mapCsvHeader but
  // not provably the retail one, so the Excel path refuses it.
  const plain = ["Share Name", "Price", "Dealer Price"];
  assert.equal(mapCsvHeader(plain).price, 1, "mapCsvHeader alone would accept it");
  assert.throws(() => assertRetailPriceColumn(plain, 1), /not a RETAIL price column/);
  assert.throws(() => assertRetailPriceColumn(XL_HEADER, 4), /not a RETAIL price column/,
    "and it refuses the dealer column even when handed it directly");
});

/* ---------- depository ---------- */

test('"SDL & CDSL" is a typo for NSDL, not a reason to drop NSDL', () => {
  // SK Finance Limited on the 06-Aug list. The letters "sdlcdsl" fail /nsdl/
  // while /cdsl/ still matches, so this used to store as "CDSL only" — a wrong
  // fact on a public page, and one nothing downstream could have caught.
  assert.equal(canonicalDepository("SDL & CDSL"), "NSDL & CDSL");
  assert.equal(classifyDepository("SDL & CDSL").typo, "SDL & CDSL", "and it is reported, not silent");

  // The repair must not touch anything that was already right.
  assert.equal(canonicalDepository("NSDL & CDSL"), "NSDL & CDSL");
  assert.equal(canonicalDepository("CDSL & NSDL"), "NSDL & CDSL");
  assert.equal(canonicalDepository("Only CDSL"), "CDSL only");
  assert.equal(canonicalDepository("CDSL"), "CDSL only");
  assert.equal(canonicalDepository("NSDL"), "NSDL only");
  assert.equal(canonicalDepository("NSDL &CDsSL"), "NSDL & CDSL", "OCR noise still tolerated");
  for (const clean of ["NSDL & CDSL", "Only CDSL", "CDSL", "NSDL"]) {
    assert.equal(classifyDepository(clean).typo, undefined, `"${clean}" needs no repair`);
  }
});

test('an absent depository stays absent — "—" is not a guess', () => {
  // E Trav Tech Limited. Blank, dash and N/A all mean "none on this row".
  for (const none of ["—", "-", "–", "", "   ", "N/A", "n.a.", "nil"]) {
    const v = classifyDepository(none);
    assert.equal(v.value, undefined, `"${none}" must not resolve to a depository`);
    assert.equal(v.blank, true, `"${none}" is blank, not unreadable`);
    assert.equal(v.unrecognised, undefined);
  }
  assert.equal(canonicalDepository("—"), undefined);
});

test("an unreadable depository is flagged, never downgraded", () => {
  const v = classifyDepository("Held with XYZ");
  assert.equal(v.value, undefined);
  assert.equal(v.unrecognised, "Held with XYZ", "the caller has to be able to report this");
});

/* ---------- matching the 06-Aug Excel names ---------- */

const share = (id, company, aliases = []) => ({ _id: id, company, slug: slugify(company), aliases });

test('(a) the list\'s "Unlisted Shares" boilerplate does not fork a duplicate', () => {
  // 97 of the 183 incoming names carry it; not one stored name does.
  const docs = [share("apl", "APL Metals"), share("hero", "Hero FinCorp")];
  const t = resolveUnlistedTarget("APL Metals Unlisted Shares", docs, slugify);
  assert.equal(t.doc?._id, "apl");
  assert.equal(t.via, "boilerplate");
  assert.equal(t.alias, "APL Metals Unlisted Shares", "the raw name is recorded so the next run matches exactly");

  // It works through aliases and through a trailing "Price" too…
  const viaAlias = resolveUnlistedTarget("Hero FinCorp Limited Unlisted Shares Price", [share("hero", "Hero Fincorp Ltd", ["Hero FinCorp Limited"])], slugify);
  assert.equal(viaAlias.doc?._id, "hero");
  // …and in the other direction, when the STORED name is the one carrying it.
  const stored = resolveUnlistedTarget("NCDEX Limited", [share("ncdex", "NCDEX Limited Unlisted Shares")], slugify);
  assert.equal(stored.doc?._id, "ncdex");
});

test("(a) two stored companies that collapse to the same name are ambiguous, not guessed", () => {
  const docs = [share("a", "Sterlite Power"), share("b", "Sterlite Power Unlisted Shares")];
  const t = resolveUnlistedTarget("Sterlite Power Unlisted Shares Price", docs, slugify);
  assert.ok(t.ambiguous, "two candidates must never resolve to one");
  assert.equal(t.doc, undefined);
});

test("(b) a stored name truncated by the old OCR is matched by the new full name", () => {
  // A real 22-Jul document. The stump is what is STORED; the Excel list now
  // supplies the whole thing — the reverse of the truncated-name case.
  const docs = [share("signify", "Signify Innovations (Previously Ph"), share("tata", "Tata Capital")];
  const t = resolveUnlistedTarget(
    "Signify Innovations India Limited (Previously Philips Lighting India Limited) Unlisted Shares",
    docs, slugify,
  );
  assert.equal(t.doc?._id, "signify");
  assert.equal(t.via, "reverse-prefix");
  assert.ok(t.alias, "the full name is recorded as an alias");

  for (const stump of ["Sterlite Electric Limited (Formerly", "Fusion Techstack Limited (Forme"]) {
    const hit = resolveUnlistedTarget(`${stump}ly Something) Unlisted Shares`, [share("x", stump)], slugify);
    assert.equal(hit.doc?._id, "x", `"${stump}" must match its own full name`);
  }
});

test("(b) Inox Clean Energy and Inox Leasing stay different companies", () => {
  // The length floor exists for exactly this: three companies share a first
  // word, and a short stored name must not swallow any longer one.
  const docs = [
    share("clean", "Inox Clean Energy Limited"),
    share("leasing", "Inox Leasing and Finance Limited"),
  ];
  const clean = resolveUnlistedTarget("Inox Clean Energy Limited", docs, slugify);
  const leasing = resolveUnlistedTarget("Inox Leasing and Finance Limited Unlisted Shares", docs, slugify);
  assert.equal(clean.doc?._id, "clean");
  assert.equal(leasing.doc?._id, "leasing");
  assert.notEqual(clean.doc._id, leasing.doc._id, "these are different companies");
});

test("(b) a short stored name never swallows a longer incoming one", () => {
  const docs = [share("inox", "Inox")]; // 4 characters normalised
  for (const incoming of ["Inox Clean Energy Limited", "Inox Leasing and Finance Limited Unlisted Shares"]) {
    const t = resolveUnlistedTarget(incoming, docs, slugify);
    assert.equal(t.doc, undefined, `"${incoming}" must not resolve onto "Inox"`);
    assert.equal(t.create, true, "it is a new company, and gets reviewed as one");
  }
  // The floor is on the STORED name, so a 12-character stump still works.
  const t = resolveUnlistedTarget("Studds Accessories Limited Unlisted Shares", [share("s", "Studds Access")], slugify);
  assert.equal(t.doc?._id, "s");
});

test("(b) two stored stumps of the same name are ambiguous, not guessed", () => {
  const docs = [share("a", "Sterlite Power Transmis"), share("b", "Sterlite Power Transmission Ser")];
  const t = resolveUnlistedTarget("Sterlite Power Transmission Services Limited", docs, slugify);
  assert.ok(t.ambiguous);
  assert.equal(t.ambiguous.length, 2);
  assert.equal(t.via, "reverse-prefix");
});

test("the relaxed passes never displace an exact match", () => {
  // "Bira" is 4 characters so (b) can't fire, but "Bira 91 Unlisted Shares"
  // must land on "Bira 91" rather than anywhere else regardless.
  const docs = [share("bira91", "Bira 91"), share("bira", "Bira")];
  assert.equal(resolveUnlistedTarget("Bira 91", docs, slugify).doc._id, "bira91");
  assert.equal(resolveUnlistedTarget("Bira 91 Unlisted Shares", docs, slugify).doc._id, "bira91");
  assert.equal(resolveUnlistedTarget("Bira", docs, slugify).doc._id, "bira");
});

/* ---------- damage in the STORED name ---------- */

/**
 * Every string below is REAL: the stored side is what the old OCR pipeline
 * actually wrote into Sanity, the incoming side is what the partner's Excel
 * now sends. Left unbridged, each of these forks a second document for a
 * company we already have — 34 of them on the 06-Aug list.
 *
 * They are all loaded into ONE dataset for these tests, alongside decoys, so
 * the exactly-one rule is genuinely under test rather than assumed.
 */
const OCR_DAMAGE = {
  "stored-truncated": [
    ["Krasny Defence Technologies Li", "Krasny Defence Technologies Limited"],
    ["Evergreen Recyclekaro (India) Li", "Evergreen Recyclekaro (India) Limited"],
    ["Galaxeye Space Solutions Limite", "Galaxeye Space Solutions Limited"],
    ["Hindustan Power Exchange Limit", "Hindustan Power Exchange Limited (HPX India)"],
    ["Shree Associates Infraventures P", "Shree Associates Infraventures Private Limited"],
    ["Imperative Business Ventures Lim", "Imperative Business Ventures Limited"],
  ],
  "leading-junk": [
    ["EB Graand Prix Luxury Elevators Limi", "Graand Prix Luxury Elevators Limited"],
    ["El Easterninvestment Limited", "Eastern Investment Limited"],
    ["EE Kanara Consumer Products For", "Kanara Consumer Products Formulations Limited"],
    ["Net Ncl Buildtek Limited (Previously N", "NCL Buildtek Limited (Previously Nagarjuna Cement Limited)"],
    ["Z Cochin International Airport Limit", "Cochin International Airport Limited"],
    ["B® Orbis Financial Corporation", "Orbis Financial Corporation Limited"],
    ["4A sigachilaboratories Limited", "Sigachi Laboratories Limited"],
    ["cost Boat Unlisted Share (Imagine Mar", "boAt Unlisted Share (Imagine Marketing Limited)"],
    ["Rt. Hindon Mercantile Limited", "Hindon Mercantile Limited"],
  ],
  "il1-confusion": [
    ["Bvglndia Limited", "BVG India Limited"],
    ["Hellalnfra Market", "Hella Infra Market"],
    ["Kim Axiva Finvest", "KLM Axiva Finvest"],
    ["Madhurlron And Steel", "Madhur Iron and Steel"],
  ],
};

/** Real names that must never be dragged into a relaxed match. */
const DECOYS = ["Tata Capital", "Hero FinCorp", "NSE India", "3M India", "Sterlite Grid 5", "Bira 91"];

const DAMAGED_DOCS = [...Object.values(OCR_DAMAGE).flat().map(([s]) => s), ...DECOYS]
  .map((company, i) => share(`dmg-${i}`, company));

for (const [via, cases] of Object.entries(OCR_DAMAGE)) {
  test(`${via}: the Excel name finds the document our OCR damaged`, () => {
    for (const [storedName, incoming] of cases) {
      const t = resolveUnlistedTarget(incoming, DAMAGED_DOCS, slugify);
      assert.equal(t.doc?.company, storedName,
        `"${incoming}" should resolve to "${storedName}", got ${t.doc?.company ?? (t.ambiguous ? "ambiguous" : "create")}`);
      assert.equal(t.via, via);
      assert.equal(t.alias, incoming, "the clean name is recorded so the next run is exact");
    }
  });
}

test("a name too short after repair goes to a human, not to a guess", () => {
  // The 12-character floor. "csk" could be Chennai Super Kings or a dozen
  // other things; "kineco" and "rkb global" are no better. Loosening the floor
  // to catch them would let far worse through.
  const docs = [...DAMAGED_DOCS, share("short-1", "I csk"), share("short-2", "w+ Kineco Limited"), share("short-3", "Ee Rkb Global Limited")];
  for (const incoming of ["Chennai Super Kings Cricket Limited", "Kineco Limited", "RKB Global Limited"]) {
    const t = resolveUnlistedTarget(incoming, docs, slugify);
    assert.equal(t.create, true, `"${incoming}" must be left for manual review, got ${t.doc?.company ?? "ambiguous"}`);
  }
});

test("a trailing NUMBER is part of the name, never a severed word", () => {
  // "Sterlite Grid 5" reduced to "Sterlite Grid" would answer for Grid 1-4.
  const docs = [share("grid5", "Sterlite Grid 5"), share("bira", "Bira 91")];
  assert.equal(resolveUnlistedTarget("Sterlite Grid 6 Limited", docs, slugify).create, true);
  assert.equal(resolveUnlistedTarget("Bira 92 Beverages", docs, slugify).create, true);
  // …while the real one still resolves.
  assert.equal(resolveUnlistedTarget("Sterlite Grid 5 Limited", docs, slugify).doc?._id, "grid5");
});

test("three Inox companies stay three companies", () => {
  const docs = [
    share("clean", "Inox Clean Energy Limited"),
    share("leasing", "Inox Leasing and Finance Limited"),
    share("neo", "Inox Neo Energies Limited"),
  ];
  const hits = [
    "Inox Clean Energy Limited",
    "Inox Leasing and Finance Limited Unlisted Shares",
    "Inox Neo Energies Limited",
  ].map((n) => resolveUnlistedTarget(n, docs, slugify));

  assert.deepEqual(hits.map((h) => h.doc?._id), ["clean", "leasing", "neo"]);
  assert.equal(new Set(hits.map((h) => h.doc._id)).size, 3, "three rows, three documents");
});

test("an editorial document and its OCR-damaged twin are ambiguous, not a coin toss", () => {
  // Both are real documents for one real company. Each is found by a
  // DIFFERENT relaxed pass, which is exactly why the passes pool their
  // candidates instead of letting whichever ran first take the row.
  const docs = [
    share("editorial", "Motilal Oswal Home Finance"),
    share("imported", "Motilal Oswal Home Finance Limi"),
    share("other", "Tata Capital"),
  ];
  const t = resolveUnlistedTarget("Motilal Oswal Home Finance Limited Unlisted Shares", docs, slugify);
  assert.equal(t.doc, undefined, "must not pick one of two real documents");
  assert.deepEqual(t.ambiguous.map((d) => d._id).sort(), ["editorial", "imported"]);
});

/* ---------- boilerplate stripped before EVERY comparison ---------- */

/**
 * The 06-Aug bug, exactly. Passes A and B stripped the list's "Unlisted
 * Shares" boilerplate before comparing; the compact and l/I/1-fold
 * comparisons did not. So a row needing BOTH — boilerplate stripping AND a
 * fuzzy fold — matched on neither rung and created a duplicate document.
 *
 * The first two names below carry no boilerplate and matched even then. The
 * last two carry it and did not. That was the whole difference.
 */
const FOLD_PAIRS = [
  // [stored (ours, damaged), incoming (theirs, clean)] — real strings
  ["Hellalnfra Market Private Limited", "Hella Infra Market Private Limited"],  // matched before
  ["Madhurlron And Steel (India)", "Madhur Iron and Steel (India)"],            // matched before
  ["Kim Axiva Finvest", "KLM Axiva Finvest Unlisted Shares Price"],             // CREATED a duplicate
  ["Bvglndia Limited", "BVG India Limited Unlisted Share"],                     // CREATED a duplicate
];

test("the l/I/1 fold works whether or not the row carries boilerplate", () => {
  const docs = FOLD_PAIRS.map(([stored], i) => share(`fold-${i}`, stored));
  FOLD_PAIRS.forEach(([stored, incoming], i) => {
    const t = resolveUnlistedTarget(incoming, docs, slugify);
    assert.equal(t.doc?._id, `fold-${i}`,
      `"${incoming}" should reach "${stored}", got ${t.doc?.company ?? (t.ambiguous ? "ambiguous" : "create")}`);
  });
});

test("a trailing \"Price\" is boilerplate too", () => {
  // The partner writes "… Unlisted Shares Price" on some rows and
  // "… Unlisted Share Price" on others.
  assert.equal(stripListBoilerplate("KLM Axiva Finvest Unlisted Shares Price"), "KLM Axiva Finvest");
  assert.equal(stripListBoilerplate("Lakeshore Hospital Unlisted Share Price"), "Lakeshore Hospital");
  assert.equal(stripListBoilerplate("Market Simplified Unlisted Shares Price"), "Market Simplified");
  assert.equal(stripListBoilerplate("APL Metals Unlisted Shares"), "APL Metals");
  // …and a name that merely begins with the word is left alone.
  assert.equal(stripListBoilerplate("Price Waterhouse Limited"), "Price Waterhouse Limited");
  assert.equal(stripListBoilerplate("Tata Capital"), "Tata Capital");
});

test("every rung compares the same stripped text", () => {
  // One document per rung, one incoming name each, all carrying boilerplate.
  const docs = [
    share("exact", "Zenith Holdings Limited"),
    share("compact", "RrpS4EInnovation"),
    share("fold", "Kim Axiva Finvest"),
    share("junk", "4A sigachilaboratories Limited"),
    share("tail", "Krasny Defence Technologies Li"),
  ];
  const cases = [
    ["exact", "Zenith Holdings Limited Unlisted Shares"],
    ["compact", "RRP S4E innovation Unlisted Shares Price"],
    ["fold", "KLM Axiva Finvest Unlisted Shares Price"],
    ["junk", "Sigachi Laboratories Limited Unlisted Shares"],
    ["tail", "Krasny Defence Technologies Limited Unlisted Shares"],
  ];
  for (const [id, incoming] of cases) {
    assert.equal(resolveUnlistedTarget(incoming, docs, slugify).doc?._id, id, `"${incoming}"`);
  }
});

test("the looser fold does not collapse companies that share a stem", () => {
  // Real trios and pairs from the dataset. Every one must stay its own row.
  const groups = [
    [["rrp-s4e", "Rrp S4EInnovation"], ["rrp-semi", "Rrp Semiconductor (Ccps)"], ["rrp-elec", "RRP Electronics Limited"]],
    [["ifincorp", "IFincorp Limited"], ["ikf", "IKF Finance Limited"]],
    [["mill", "Invade Mill Limited"], ["agro", "Invade Agro Limited"]],
    [["pay", "Manipal Payment Identity Solut"], ["housing", "Manipal Housing Finance Syndicate Limited"]],
  ];
  for (const group of groups) {
    const docs = group.map(([id, company]) => share(id, company));
    const resolved = group.map(([id, company]) => {
      const t = resolveUnlistedTarget(`${company} Unlisted Shares`, docs, slugify);
      return t.doc?._id ?? (t.ambiguous ? `ambiguous:${id}` : `create:${id}`);
    });
    assert.deepEqual(resolved, group.map(([id]) => id),
      `${group.map(([, c]) => c).join(" / ")} must stay separate`);
    assert.equal(new Set(resolved).size, group.length);
  }
});

/* ---------- the declared alias file ---------- */

test("a declared name outranks every heuristic", () => {
  // "IFincorp" is our stored spelling of "ICL Fincorp" with a letter missing;
  // no fold reaches it, and a rule loose enough to would be dangerous. So it
  // is declared, and the declaration beats even an exact match elsewhere.
  const docs = [
    share("ours", "IFincorp Limited", ["|cIFincorp Limited"]),
    share("dupe", "ICL Fincorp Limited Unlisted Shares"),
  ];
  const declared = new Map([[declaredNameKey("ICL Fincorp Limited Unlisted Shares"), "ifincorp-limited"]]);

  // Without the file the exact name wins — which is how the duplicate got made.
  assert.equal(resolveUnlistedTarget("ICL Fincorp Limited Unlisted Shares", docs, slugify).doc?._id, "dupe");
  // With it, the operator's decision wins.
  const t = resolveUnlistedTarget("ICL Fincorp Limited Unlisted Shares", docs, slugify, { declared });
  assert.equal(t.doc?._id, "ours");
  assert.equal(t.via, "declared");
});

test("a declared name matches however the list punctuates it", () => {
  const docs = [share("target", "Hur Solar Private Limited")];
  const declared = new Map([[declaredNameKey("HVR Solar Private Limited"), "hur-solar-private-limited"]]);
  for (const spelling of ["HVR Solar Private Limited", "HVR Solar Pvt. Ltd.", "HVR SOLAR PRIVATE LIMITED Unlisted Shares"]) {
    assert.equal(resolveUnlistedTarget(spelling, docs, slugify, { declared }).doc?._id, "target", spelling);
  }
});

test("a declaration pointing at a missing document is an error, never a silent fallback", () => {
  const docs = [share("other", "Something Else Entirely")];
  const declared = new Map([[declaredNameKey("RKB Global Limited"), "ee-rkb-global-limited"]]);
  const t = resolveUnlistedTarget("RKB Global Limited", docs, slugify, { declared });
  assert.equal(t.doc, undefined);
  assert.equal(t.create, undefined, "it must not quietly create the duplicate the entry exists to prevent");
  assert.match(t.error, /unlisted-aliases\.json/);
  assert.match(t.error, /ee-rkb-global-limited/);
});

test("the shipped alias file is valid and self-consistent", () => {
  const loaded = loadUnlistedAliases();
  assert.deepEqual(loaded.errors, [], "the committed file must always load");
  assert.ok(loaded.entries.length >= 10, `expected the seeded pairs, got ${loaded.entries.length}`);
  // Every pair the brief named is present, keyed by the real slug.
  for (const [slug, name] of [
    ["kim-axiva-finvest", "KLM Axiva Finvest Unlisted Shares Price"],
    ["rrp-s4einnovation", "RRP S4E innovation Unlisted Shares Price"],
    ["4a-sigachilaboratories-limited", "Sigachi Laboratories Limited Unlisted Shares"],
    ["bvglndia-limited", "BVG India Limited Unlisted Share"],
    ["c-ifincorp-limited", "ICL Fincorp Limited Unlisted Shares"],
    ["ee-rkb-global-limited", "RKB Global Limited"],
    ["w-kineco-limited", "Kineco Limited Unlisted Share"],
    ["hur-solar-private-limited", "HVR Solar Private Limited"],
    ["chennai-super-kings", "CSK Unlisted Shares"],
    ["api-holdings-pharmeasy", "PharmEasy Unlisted Shares"],
  ]) {
    assert.equal(loaded.byIncoming.get(declaredNameKey(name)), slug, `${name} → ${slug}`);
  }
});

test("one name may not be declared for two documents", () => {
  const dir = mkdtempSync(join(tmpdir(), "unlisted-aliases-"));
  try {
    const file = join(dir, "a.json");
    writeFileSync(file, JSON.stringify({ aliases: { "doc-a": ["Same Name Limited"], "doc-b": ["Same Name Ltd."] } }));
    const loaded = loadUnlistedAliases(pathToFileURL(file));
    assert.equal(loaded.errors.length, 1);
    assert.match(loaded.errors[0], /declared for both/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ---------- the duplicate cleanup ---------- */

test("cleanup deletes only a hidden, uncurated duplicate", () => {
  const target = { _id: "t", slug: "kim-axiva-finvest", company: "Kim Axiva Finvest", aliases: [] };
  const dupe = {
    _id: "d", slug: "klm-axiva-finvest-unlisted-shares-price",
    company: "KLM Axiva Finvest Unlisted Shares Price", aliases: ["KLM Axiva Finvest Unlisted Shares Price"],
    needsReview: true, indicativePriceINR: 18, asOfDate: "2026-08-06",
  };
  const plan = planCleanup(
    [{ slug: "kim-axiva-finvest", name: "KLM Axiva Finvest Unlisted Shares Price" }],
    [target, dupe],
  );
  assert.deepEqual(plan.deletions.map((x) => x.duplicate._id), ["d"]);
  assert.deepEqual(plan.aliasAdds.map((x) => x.name), ["KLM Axiva Finvest Unlisted Shares Price"]);
  assert.deepEqual(plan.blocked, []);
});

test("cleanup refuses a live duplicate, or one carrying anything a human wrote", () => {
  const target = { _id: "t", slug: "target", company: "Target Company", aliases: [] };
  const base = { slug: "dupe", company: "Target Company Unlisted Shares", aliases: [], needsReview: true };
  const entries = [{ slug: "target", name: "Target Company Unlisted Shares" }];

  for (const [label, extra] of [
    ["live", { needsReview: false }],
    ["logo", { hasLogo: true }],
    ["summary", { hasSummary: true }],
    ["sector", { sector: "Financial Services" }],
    ["ipoStatus", { ipoStatus: "drhp-filed" }],
  ]) {
    const plan = planCleanup(entries, [target, { ...base, _id: `d-${label}`, ...extra }]);
    assert.deepEqual(plan.deletions, [], `a duplicate with ${label} must not be deleted`);
    assert.equal(plan.blocked.length, 1, `a duplicate with ${label} must be reported`);
    assert.ok(plan.blocked[0].blockers.length >= 1);
  }
});

test("cleanup never deletes the target, and never re-adds an alias it already has", () => {
  const target = {
    _id: "t", slug: "target", company: "Target Company",
    aliases: ["Target Company Unlisted Shares"], needsReview: true,
  };
  const plan = planCleanup([{ slug: "target", name: "Target Company Unlisted Shares" }], [target]);
  assert.deepEqual(plan.aliasAdds, [], "idempotent — the target already answers to this name");
  assert.deepEqual(plan.deletions, [], "the target is never a deletion candidate, whatever it looks like");
  assert.deepEqual(plan.noDuplicate.map((n) => n.target._id), ["t"]);
});

/* ---------- doubled aliases ---------- */

test("the same name stored twice is tidied to one, keeping the better spelling", () => {
  // Real alias lists from the dataset. The --adopt-names run appended an old
  // company name the document already answered to under a spelling that
  // normalises identically — "…Limi…" and "…Limi".
  assert.deepEqual(
    dedupeAliases(["EB Graand Prix Luxury Elevators Limi...", "Graand Prix Luxury Elevators Limited Unlisted Shares", "EB Graand Prix Luxury Elevators Limi"]),
    ["EB Graand Prix Luxury Elevators Limi", "Graand Prix Luxury Elevators Limited Unlisted Shares"],
    "the ellipsis-free spelling wins, in the first occurrence's position",
  );
  assert.deepEqual(
    dedupeAliases(["Hellalnfra Market Private Limited", "Hella Infra Market Private Limited", "Hellalnfra Market Private Limited"]),
    ["Hellalnfra Market Private Limited", "Hella Infra Market Private Limited"],
  );
  // A list with nothing to tidy is returned unchanged.
  assert.deepEqual(dedupeAliases(["Tata Capital", "Tata Capital Limited Unlisted Shares"]),
    ["Tata Capital", "Tata Capital Limited Unlisted Shares"]);
  assert.deepEqual(dedupeAliases([]), []);
});

test("tidying an alias list never drops a distinct name", () => {
  // The only thing that would matter: a name the document answers to going
  // missing. Two spellings that normalise apart must both survive.
  const before = ["Z Cochin International Airport Limit...", "Cochin International Airport Limited", "Cochin International Airport Limit"];
  const after = dedupeAliases(before);
  const keys = (list) => new Set(list.map(normalizeCompanyName));
  assert.deepEqual([...keys(after)].sort(), [...keys(before)].sort());
  assert.equal(after.length, 3, "leading junk makes these three different names");
});

test("only documents that actually change are patched", () => {
  const plan = planAliasDedupe([
    { _id: "a", slug: "a", company: "A", aliases: ["Foo Limited", "Foo Ltd."] },   // same name twice
    { _id: "b", slug: "b", company: "B", aliases: ["Bar", "Baz"] },                // nothing to do
    { _id: "c", slug: "c", company: "C", aliases: ["Only One"] },
    { _id: "d", slug: "d", company: "D" },                                          // no aliases at all
  ]);
  assert.deepEqual(plan.map((p) => p.doc._id), ["a"]);
  assert.equal(plan[0].removed, 1);
  assert.deepEqual(plan[0].after, ["Foo Limited"]);
});

/* ---------- approving the review queue ---------- */

const hiddenDoc = (slug, company, extra = {}) => ({
  _id: `unlistedShare-${slug}`, slug, company,
  indicativePriceINR: 100, lotSize: 500, depository: "NSDL & CDSL",
  asOfDate: "2026-08-06", hasLogo: false, ...extra,
});

test("--approve-all refuses a document that would embarrass the site", () => {
  assert.deepEqual(approvalBlockers(hiddenDoc("ok", "Machint Solutions Limited")), []);
  assert.deepEqual(approvalBlockers(hiddenDoc("a", "Foo", { indicativePriceINR: undefined })), ["no price"]);
  assert.deepEqual(approvalBlockers(hiddenDoc("b", "Foo", { lotSize: undefined })), ["no minimum lot size"]);
  assert.deepEqual(approvalBlockers(hiddenDoc("c", "Foo", { lotSize: 0 })), ["no minimum lot size"]);
  // The real ones from the 06-Aug list.
  for (const name of ["Bazar India Unlisted Shares", "Cheelizza Pizza Unlisted Shares",
                      "Gynofem Healthcare Unlisted Shares Price", "IKF Finance Limited Unlisted Shares"]) {
    assert.deepEqual(approvalBlockers(hiddenDoc("x", name)), ['company name still contains "Unlisted Shares" — rename it in Studio first']);
  }
  // Several problems at once are all reported.
  assert.equal(approvalBlockers(hiddenDoc("y", "Foo Unlisted Shares", { indicativePriceINR: undefined, lotSize: undefined })).length, 3);
});

test("--approve-all publishes what passes and skips what does not", () => {
  const docs = [
    hiddenDoc("good-1", "Machint Solutions Limited"),
    hiddenDoc("bad-name", "Bazar India Unlisted Shares"),
    hiddenDoc("good-2", "Vivriti Finance Limited"),
    hiddenDoc("no-price", "Something Limited", { indicativePriceINR: undefined }),
  ];
  const { publish, blocked, unknown } = selectForApproval(docs, { all: true });
  assert.deepEqual(publish.map((d) => d.slug), ["good-1", "good-2"]);
  assert.deepEqual(blocked.map((b) => b.doc.slug), ["bad-name", "no-price"]);
  assert.deepEqual(unknown, []);
});

test("a named slug that is live, or does not exist, is reported and never touched", () => {
  // The caller passes ONLY the needsReview set, so a live document simply is
  // not there — which is what makes "never touch a live document" structural
  // rather than a rule that has to be remembered.
  const docs = [hiddenDoc("hidden-1", "Hidden Company Limited")];
  const { publish, unknown } = selectForApproval(docs, { slugs: ["hidden-1", "tata-capital", "no-such-thing"] });
  assert.deepEqual(publish.map((d) => d.slug), ["hidden-1"]);
  assert.deepEqual(unknown, ["tata-capital", "no-such-thing"]);
});

test("naming a slug explicitly overrides the gate — deliberately", () => {
  const docs = [hiddenDoc("bad-name", "Bazar India Unlisted Shares")];
  const { publish, blocked } = selectForApproval(docs, { slugs: ["bad-name"] });
  assert.deepEqual(publish.map((d) => d.slug), ["bad-name"], "an operator asked for this one by name");
  assert.deepEqual(blocked, [], "the gate belongs to --approve-all");
  // …and the caller still has the reasons to print as a warning.
  assert.equal(approvalBlockers(docs[0]).length, 1);
});

/* ---------- --hide: the way back off the public page ---------- */

test("--hide takes a live document off the page by slug or by document id", () => {
  const live = [
    hiddenDoc("bb-zepto-unlisted-ccps-shares-79", "BB Zepto Unlisted( Ccps Shares((79..",
      { indicativePriceINR: 39, lotSize: 2, asOfDate: "2026-07-22" }),
    hiddenDoc("tata-capital", "Tata Capital"),
  ];
  // The audit prints _ids, so both spellings have to land on the same document.
  for (const ref of ["bb-zepto-unlisted-ccps-shares-79", "unlistedShare-bb-zepto-unlisted-ccps-shares-79"]) {
    const { hide, unknown } = selectForHiding(live, [ref]);
    assert.deepEqual(hide.map((d) => d.slug), ["bb-zepto-unlisted-ccps-shares-79"]);
    assert.deepEqual(unknown, []);
  }
  // Naming the same document twice hides it once.
  const both = selectForHiding(live, ["bb-zepto-unlisted-ccps-shares-79", "unlistedShare-bb-zepto-unlisted-ccps-shares-79"]);
  assert.equal(both.hide.length, 1);
});

test("--hide never touches a document that is already hidden", () => {
  // The caller passes ONLY the live set, the mirror of --approve's rule: a
  // document that is already behind needsReview simply is not there.
  const { hide, unknown } = selectForHiding([hiddenDoc("live-1", "Live Company Limited")],
    ["live-1", "already-hidden", "no-such-thing"]);
  assert.deepEqual(hide.map((d) => d.slug), ["live-1"]);
  assert.deepEqual(unknown, ["already-hidden", "no-such-thing"]);
});

test("--hide applies no gate — it is the safe direction", () => {
  // approvalBlockers guards what goes ONTO the page. Taking something off it
  // can never embarrass the site, so a document that fails every check is
  // still hideable.
  const doc = hiddenDoc("bad", "Foo Unlisted Shares", { indicativePriceINR: undefined, lotSize: undefined });
  assert.equal(approvalBlockers(doc).length, 3);
  assert.deepEqual(selectForHiding([doc], ["bad"]).hide.map((d) => d.slug), ["bad"]);
});

test("the review table renders every column and truncates rather than wraps", () => {
  const table = renderTable([
    hiddenDoc("a-one-steel-india-limited", "A One Steel India Limited", { indicativePriceINR: 272, lotSize: 1000 }),
    hiddenDoc("e-trav-tech-limited", "E Trav Tech Limited", { depository: undefined, indicativePriceINR: 102 }),
    hiddenDoc("x", "A Company With A Very Long Name Indeed That Runs On And On", { hasLogo: true }),
  ].map(reviewRow), { maxCompany: 24 });

  const lines = table.split("\n");
  for (const head of ["SLUG", "COMPANY", "PRICE", "LOT", "DEPOSITORY", "AS OF", "LOGO"]) {
    assert.ok(lines[0].includes(head), `missing column ${head}`);
  }
  assert.equal(lines.length, 5, "header, rule, three rows");
  assert.ok(lines[2].includes("₹272") && lines[2].includes("1000"));
  assert.ok(lines[3].includes("—"), "a missing depository shows as a dash, not blank");
  assert.ok(lines[4].includes("…"), "a long name is cut, not wrapped");
  assert.ok(lines[4].includes("yes"), "logo yes/no");
  assert.ok(lines.every((l) => !/\s$/.test(l)), "no trailing whitespace");
});

/* ---------- name adoption ---------- */

test("a corruption signature is required before a stored name may be overwritten", () => {
  // Damaged — every one of these is a reason to prefer the partner's spelling.
  assert.deepEqual(storedNameCorruption("Hindustan Power Exchange Limit", "Hindustan Power Exchange Limited"),
    ['ends in the part-word "limit"']);
  assert.deepEqual(storedNameCorruption("Rt. Hindon Mercantile Limited", "Hindon Mercantile Limited"),
    ['starts with the stray token "rt"']);
  assert.deepEqual(storedNameCorruption("Bvglndia Limited", "BVG India Limited"),
    ["differs from the incoming name only in l / I / 1"]);
  assert.deepEqual(storedNameCorruption("Signify Innovations (Previously Ph", "Signify Innovations India Limited (Previously Philips Lighting)"),
    ["unbalanced bracket", 'ends in the part-word "ph"', "is a strict prefix of the incoming name"]);
  assert.ok(storedNameCorruption("Manipal Cards) 385", "Manipal Payment and Identity Solutions").includes("unbalanced bracket"));

  // Intact — a merely SHORTER or differently-spelled name is not a damaged one.
  for (const [stored, incoming] of [
    ["Tata Capital", "Tata Capital Limited"],
    ["NSE India", "NSE India Limited"],       // a short first token is ordinary
    ["3M India", "3M India Limited"],
    ["Hero FinCorp", "Hero FinCorp"],
    ["Sterlite Grid 5", "Sterlite Grid 5 Limited"], // a trailing number is a name
  ]) {
    assert.deepEqual(storedNameCorruption(stored, incoming), [], `"${stored}" must not be treated as damaged`);
  }
});

test("a stored name that is merely shorter is never reached for adoption", () => {
  // "Bira 91" IS a strict prefix of "Bira 91 Beverages Limited", so the
  // signature fires — but adoption only ever consults it after a relaxed pass
  // matched, and at 7 normalised characters "Bira 91" is under
  // REVERSE_PREFIX_MIN. The row creates a new company instead, and the
  // existing document keeps its name.
  assert.deepEqual(storedNameCorruption("Bira 91", "Bira 91 Beverages Limited"),
    ["is a strict prefix of the incoming name"]);
  assert.equal(resolveUnlistedTarget("Bira 91 Beverages Limited", [share("bira", "Bira 91")], slugify).create, true);
});

test("adoption never touches slug, and only touches company when asked", () => {
  const priceFields = { indicativePriceINR: 950, asOfDate: "2026-08-06", partner: "uz", lotSize: 100 };
  for (const publish of [false, true]) {
    for (const adoptCompany of [null, "Hindustan Power Exchange Limited"]) {
      const set = buildMatchedDocSet({ priceFields, publish, adoptCompany });
      assert.equal("slug" in set, false, "a URL is a promise — partner data never moves one");
      assert.equal(set.company, adoptCompany ?? undefined);
      assert.equal(set.indicativePriceINR, 950, "the price still gets written");
      // Hand-curated fields are absent from the payload, so a `set` patch
      // cannot disturb them.
      for (const k of ["logo", "sector", "summary", "ipoStatus", "isActive"]) {
        assert.equal(k in set, false, `${k} must not be in a matched-doc patch`);
      }
    }
  }
});

/* ---------- one document, one row ---------- */

/**
 * The relaxed passes are looser than anything this pipeline had before, and
 * they can fail in exactly one way: two companies on the list collapsing onto
 * one of our documents. The second price would overwrite the first and a
 * company would vanish from the site with nothing in the output to say so.
 *
 * This is the only test here that runs the importer for real, because "aborts
 * the run" is not a property of a pure function. No network: the Sanity read
 * is answered by a preloaded fetch stub, and --dry-run means there is nothing
 * to write even if the guard failed.
 */
test("two incoming rows claiming one document abort the run", () => {
  const dir = mkdtempSync(join(tmpdir(), "unlisted-collide-"));
  try {
    // Both spell the SAME stored company, whose name our OCR cut to
    // "…Technologies Li" — so both rows resolve onto it.
    writeFileSync(join(dir, "list.csv"),
      "Share Name,Retail Price\n" +
      "Krasny Defence Technologies Limited,950\n" +
      "Krasny Defence Technologies Private Limited,1200\n");
    writeFileSync(join(dir, "stub.mjs"),
      'const docs = [{ _id: "krasny", company: "Krasny Defence Technologies Li",' +
      ' slug: "krasny-defence-technologies-li", aliases: [] }];\n' +
      'globalThis.fetch = async () => new Response(JSON.stringify({ result: docs }),' +
      ' { headers: { "content-type": "application/json" } });\n');

    const importer = fileURLToPath(new URL("./import-unlisted-prices.mjs", import.meta.url));
    const res = spawnSync(
      process.execPath,
      ["--import", pathToFileURL(join(dir, "stub.mjs")).href, importer, join(dir, "list.csv"), "--dry-run"],
      { encoding: "utf8", env: { ...process.env, NEXT_PUBLIC_SANITY_PROJECT_ID: "stub", SANITY_API_TOKEN: "stub" } },
    );

    assert.equal(res.status, 1, `expected a non-zero exit, got ${res.status}\n${res.stdout}\n${res.stderr}`);
    assert.match(res.stderr, /ABORTED/);
    assert.match(res.stderr, /claimed by more than\s+one row/);
    assert.match(res.stderr, /Krasny Defence Technologies Li/);
    assert.doesNotMatch(res.stdout, /nothing written/i, "it must not reach the ordinary dry-run ending");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ---------- the create list, split ---------- */

test("a create that resembles an existing document is separated out", () => {
  const docs = [
    share("krasny", "Krasny Defence Technologies Li"),
    share("tata", "Tata Capital"),
  ];
  // A fourth spelling of a document we already have…
  const near = nearbyExistingDocs("Krasny Defence Technologies Limited", docs);
  assert.equal(near[0]?.doc._id, "krasny");
  // …versus a company we have genuinely never priced.
  assert.deepEqual(nearbyExistingDocs("Waaree Renewable Technologies Limited", docs), []);
});

test("the duplicate report reads aliases too, and never claims a match", () => {
  const docs = [share("hpx", "Hindustan Power Exchange Limit", ["Hindustan Power Exchange"])];
  const near = nearbyExistingDocs("Hindustan Power Exchange Limited (HPX India)", docs);
  assert.equal(near.length, 1);
  assert.ok(near[0].shared >= 10);
  // It is a report, not a decision: resolveUnlistedTarget is what matches.
  assert.equal(typeof near[0].doc._id, "string");
});

/* ---------- the ligature sanitiser ---------- */

test("the ligature sanitiser repairs the codepoints the PDF→Excel conversion left behind", () => {
  const fix = (s) => sanitizeListText(s).text;
  // U+FB01 → "fi"
  assert.equal(fix("Elo\uFB01c Industries Limited"), "Elofic Industries Limited");
  assert.equal(fix("Indo\uFB01l Industries Limited"), "Indofil Industries Limited");
  assert.equal(fix("Market Simpli\uFB01ed Technologies"), "Market Simplified Technologies");
  assert.equal(fix("SMILE Micro\uFB01nance Limited"), "SMILE Microfinance Limited");
  // U+E009 → "tt"
  assert.equal(fix("Bolzen and Mu\uE009er"), "Bolzen and Mutter");
  assert.equal(fix("Calcu\uE009a Stock Exchange"), "Calcutta Stock Exchange");
  assert.equal(fix("Ramaraju Surgical Co\uE009on Mills"), "Ramaraju Surgical Cotton Mills");
  // U+E007 → "ff"
  assert.equal(fix("Ei\uE007il Water Infra"), "Eiffil Water Infra");
});

test("the one-instance codepoint is flagged for confirmation against the PDF", () => {
  const eiffil = sanitizeListText("Ei\uE007il Water Infra");
  const sub = eiffil.substitutions.find((s) => s.codepoint === "U+E007");
  assert.deepEqual(sub, { codepoint: "U+E007", to: "ff", count: 1, confirm: true });
  // The well-attested ones are logged but need no confirmation.
  assert.equal(sanitizeListText("Calcu\uE009a").substitutions[0].confirm, false);
  assert.equal(sanitizeListText("Elo\uFB01c").substitutions[0].confirm, false);
  assert.deepEqual(sanitizeListText("Tata Capital").substitutions, [], "a clean name substitutes nothing");
});

test("every substitution is counted, so the run can log what it changed", () => {
  const r = sanitizeListText("Co\uE009on and Mu\uE009er and Elo\uFB01c");
  assert.equal(r.text, "Cotton and Mutter and Elofic");
  assert.equal(r.substitutions.find((s) => s.codepoint === "U+E009").count, 2);
  assert.equal(r.substitutions.find((s) => s.codepoint === "U+FB01").count, 1);
});

test("an UNKNOWN private-use codepoint is reported, never silently deleted", () => {
  // Deleting it would hand back a plausible-looking but wrong company name.
  const r = sanitizeListText("Acme \uE042 Steel");
  assert.deepEqual(r.unmapped, ["U+E042"]);
  assert.ok(r.text.includes("\uE042"), "left in place so the damage is visible");
  assert.deepEqual(sanitizeListText("Elo\uFB01c").unmapped, [], "a mapped codepoint is not left over");
});

test("names are NFKC-normalised and their whitespace collapsed", () => {
  assert.equal(sanitizeListText("  Tata   Capital \n Limited ").text, "Tata Capital Limited");
  assert.equal(sanitizeListText("Ｔata Ｃapital").text, "Tata Capital", "full-width letters fold to ASCII");
  assert.equal(sanitizeListText(undefined).text, "");
});

/* ---------- the .xlsx reader ---------- */

/**
 * A workbook is a zip of XML parts, so the fixture is built as one — stored
 * (uncompressed) entries, which the reader handles alongside Excel's deflate.
 * Everything the real file does that could break the reader is reproduced:
 * the r:id → sheetN.xml mapping deliberately does NOT follow tab order, the
 * header sits on row 2 under a title row, column B has a blank header, and
 * two of the three sheets are not price lists at all.
 */
function storedZip(files) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, "utf8");
    const body = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
    const sum = crc32(body);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(sum, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(body.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, body);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt32LE(sum, 16);
    entry.writeUInt32LE(body.length, 20);
    entry.writeUInt32LE(body.length, 24);
    entry.writeUInt16LE(nameBuf.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBuf);

    offset += local.length + nameBuf.length + body.length;
  }
  const dir = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(dir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, eocd]);
}

const xmlEscape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const colName = (i) => {
  let s = "", n = i + 1;
  while (n > 0) { s = String.fromCharCode(65 + ((n - 1) % 26)) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

/** Build a worksheet part from [rowNumber, cells[]]; strings go through the
 *  shared string table, exactly as Excel writes them. */
function sheetPart(rows, sst, extra = "") {
  const body = rows.map(([n, cells]) => {
    const xml = cells.map((v, i) => {
      if (v === null || v === undefined || v === "") return "";
      const ref = `${colName(i)}${n}`;
      if (typeof v === "number") return `<c r="${ref}"><v>${v}</v></c>`;
      let idx = sst.indexOf(v);
      if (idx === -1) idx = sst.push(v) - 1;
      return `<c r="${ref}" t="s"><v>${idx}</v></c>`;
    }).join("");
    return `<row r="${n}">${xml}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData>${extra}</worksheet>`;
}

const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function buildWorkbook() {
  const sst = [];
  const header = ["S.No", "", "Share Name", "Retail Price", "Dealer Price", "Depository", "Min. Lot Size"];

  // Sheet "A-M". Row 1 is the title, row 2 the header, data from row 3 —
  // derived by the reader, never assumed.
  //
  // Every DEALER figure below is unique across the whole fixture — no S.No,
  // retail price or lot size shares a value with one — so the confidentiality
  // test can search the reader's entire output for them and mean it.
  const am = sheetPart([
    [1, ["Unlisted Shares Price List — As on 06 Aug 2026"]],
    [2, header],
    [3, [1, "", "APL Metals Unlisted Shares", 385, 371, "NSDL & CDSL", 100]],
    [4, [2, "", "Elo\uFB01c Industries Limited", 1200, 1151, "Only CDSL", 50]],
    [6, [3, "", "Inox Clean Energy Limited", 940, 901, "NSDL", 25]],
  ], sst, '<drawing r:id="rId1"/>');

  const nz = sheetPart([
    [1, ["Unlisted Shares Price List — As on 06 Aug 2026"]],
    [2, header],
    [3, [1, "", "SK Finance Limited", 940, 902, "SDL & CDSL", 25]],
    [4, [2, "", "E Trav Tech Limited", 55, 51, "—", 1000]],
    [5, [3, "", "", 999, 991, "NSDL", 10]],
    [6, [4, "", "Zzz Holdings Limited", "on request", 992, "NSDL", 10]],
  ], sst, "");

  const cover = sheetPart([
    [1, ["Unlisted Shares Price List"]],
    [2, ["Prices are indicative and subject to availability."]],
  ], sst, "");

  const sharedStrings =
    `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sst.length}" uniqueCount="${sst.length}">` +
    sst.map((s) => `<si><t>${xmlEscape(s)}</t></si>`).join("") + "</sst>";

  return storedZip([
    { name: "[Content_Types].xml", data: '<?xml version="1.0"?><Types/>' },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0"?><Relationships xmlns="${REL}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      // Tab order is Cover, A-M, N-Z — but the r:ids point at sheet1/sheet7/
      // sheet2. Anything that assumes file numbering follows tab order reads
      // the cover page as a price list and loses two thirds of the rows.
      name: "xl/workbook.xml",
      data: `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${REL}"><sheets>` +
        '<sheet name="Cover" sheetId="1" r:id="rId4"/>' +
        '<sheet name="A-M" sheetId="2" r:id="rId2"/>' +
        '<sheet name="N-Z" sheetId="3" r:id="rId9"/>' +
        "</sheets></workbook>",
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0"?><Relationships xmlns="${REL}">` +
        `<Relationship Id="rId4" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="${REL}/worksheet" Target="worksheets/sheet7.xml"/>` +
        `<Relationship Id="rId9" Type="${REL}/worksheet" Target="worksheets/sheet2.xml"/>` +
        `<Relationship Id="rId11" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/>` +
        "</Relationships>",
    },
    { name: "xl/worksheets/sheet1.xml", data: cover },
    { name: "xl/worksheets/sheet7.xml", data: am },
    { name: "xl/worksheets/sheet2.xml", data: nz },
    {
      name: "xl/worksheets/_rels/sheet7.xml.rels",
      data: `<?xml version="1.0"?><Relationships xmlns="${REL}"><Relationship Id="rId1" Type="${REL}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`,
    },
    {
      name: "xl/drawings/drawing1.xml",
      data: `<?xml version="1.0"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${REL}">` +
        // A logo on Excel row 3 — <xdr:row> is ZERO-BASED, so it says 2.
        "<xdr:oneCellAnchor><xdr:from><xdr:col>1</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>" +
        '<xdr:ext cx="400" cy="400"/><xdr:pic><xdr:blipFill><a:blip r:embed="rId1"/></xdr:blipFill></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>' +
        // A background shape: same anchor shape, no r:embed. Not an image.
        "<xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>" +
        '<xdr:ext cx="9999" cy="9999"/><xdr:sp><xdr:spPr/></xdr:sp><xdr:clientData/></xdr:oneCellAnchor>' +
        "</xdr:wsDr>",
    },
    {
      name: "xl/drawings/_rels/drawing1.xml.rels",
      data: `<?xml version="1.0"?><Relationships xmlns="${REL}"><Relationship Id="rId1" Type="${REL}/image" Target="../media/image1.jpeg"/></Relationships>`,
    },
    { name: "xl/media/image1.jpeg", data: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]) },
    { name: "xl/sharedStrings.xml", data: sharedStrings },
  ]);
}

const WORKBOOK = buildWorkbook();

/** Every retail and dealer figure in the logo fixture. All unique, and none of
 *  them a lot size or an image dimension, so the confidentiality check can
 *  search the whole output for them and mean it. */
const LOGO_FIXTURE_PRICES = [385, 371, 332, 301, 930, 901, 55, 51];

/**
 * A workbook whose rows carry REAL embedded images, for the end-to-end run.
 * Four priced rows, three with a logo anchored to them:
 *   • PharmEasy      — a mark with a white border, which gets trimmed
 *   • Sterlite Grid 5 — a mark filling its tile, uploaded as-is
 *   • Some Company…  — a good image belonging to no document of ours
 *   • Zzz Holdings   — priced, but no image at all
 */
function buildLogoWorkbook(makeJpeg) {
  const sst = [];
  const header = ["S.No", "", "Share Name", "Retail Price", "Dealer Price", "Depository", "Min. Lot Size"];
  const sheet = sheetPart([
    [1, ["Unlisted Shares Price List — As on 06 Aug 2026"]],
    [2, header],
    [3, [1, "", "PharmEasy Unlisted Shares", 385, 371, "NSDL & CDSL", 100]],
    [4, [2, "", "Sterlite Grid 5 Unlisted Shares", 332, 301, "NSDL", 100]],
    [5, [3, "", "Some Company Nobody Has Limited", 930, 901, "NSDL", 100]],
    [6, [4, "", "Zzz Holdings Limited", 55, 51, "NSDL", 10]],
  ], sst, '<drawing r:id="rId1"/>');

  // <xdr:row> is zero-based, so 2/3/4 are Excel rows 3/4/5.
  const anchor = (row, rid) =>
    `<xdr:oneCellAnchor><xdr:from><xdr:col>1</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
    `<xdr:ext cx="400" cy="400"/><xdr:pic><xdr:blipFill><a:blip r:embed="${rid}"/></xdr:blipFill></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;

  const sharedStrings =
    `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sst.length}" uniqueCount="${sst.length}">` +
    sst.map((s) => `<si><t>${xmlEscape(s)}</t></si>`).join("") + "</sst>";

  return storedZip([
    { name: "[Content_Types].xml", data: '<?xml version="1.0"?><Types/>' },
    { name: "_rels/.rels", data: `<?xml version="1.0"?><Relationships xmlns="${REL}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${REL}">` +
        '<sheets><sheet name="A-M" sheetId="1" r:id="rId2"/></sheets></workbook>',
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0"?><Relationships xmlns="${REL}">` +
        `<Relationship Id="rId2" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId11" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/></Relationships>`,
    },
    { name: "xl/worksheets/sheet1.xml", data: sheet },
    {
      name: "xl/worksheets/_rels/sheet1.xml.rels",
      data: `<?xml version="1.0"?><Relationships xmlns="${REL}"><Relationship Id="rId1" Type="${REL}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`,
    },
    {
      name: "xl/drawings/drawing1.xml",
      data: `<?xml version="1.0"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${REL}">` +
        anchor(2, "rId1") + anchor(3, "rId2") + anchor(4, "rId3") + "</xdr:wsDr>",
    },
    {
      name: "xl/drawings/_rels/drawing1.xml.rels",
      data: `<?xml version="1.0"?><Relationships xmlns="${REL}">` +
        [1, 2, 3].map((i) => `<Relationship Id="rId${i}" Type="${REL}/image" Target="../media/image${i}.jpeg"/>`).join("") +
        "</Relationships>",
    },
    { name: "xl/media/image1.jpeg", data: makeJpeg(84, 84, 10, "image/jpeg") },
    { name: "xl/media/image2.jpeg", data: makeJpeg(120, 60, 0, "image/jpeg") },
    { name: "xl/media/image3.jpeg", data: makeJpeg(60, 60, 6, "image/jpeg") },
    { name: "xl/sharedStrings.xml", data: sharedStrings },
  ]);
}

test("a multi-sheet workbook yields rows from EVERY data sheet", () => {
  const book = readUnlistedXlsxBytes(WORKBOOK, "fixture.xlsx");
  assert.deepEqual(book.sheetsRead.map((s) => s.name), ["A-M", "N-Z"], "the cover page is not a price list");
  assert.equal(book.sheetCount, 3);
  // Reading one sheet of several is the failure this has to make impossible.
  assert.deepEqual([...new Set(book.rows.map((r) => r.sheet))], ["A-M", "N-Z"]);
  assert.deepEqual(book.sheetsRead.map((s) => s.rowCount), [3, 2]);
});

test("sheets are resolved through r:id, not by file numbering", () => {
  const book = readUnlistedXlsxBytes(WORKBOOK, "fixture.xlsx");
  assert.deepEqual(
    book.sheetsRead.map((s) => [s.name, s.part]),
    [["A-M", "xl/worksheets/sheet7.xml"], ["N-Z", "xl/worksheets/sheet2.xml"]],
    "tab order says nothing about which file holds which tab",
  );
});

test("the header row and data start are derived, not hardcoded", () => {
  const book = readUnlistedXlsxBytes(WORKBOOK, "fixture.xlsx");
  for (const s of book.sheetsRead) assert.equal(s.headerRow, 2);
  assert.deepEqual(book.rows.filter((r) => r.sheet === "A-M").map((r) => r.row), [3, 4, 6],
    "row numbers are the real 1-based Excel rows, gaps and all");
});

test("rows carry exactly the four publishable fields, and the ligatures are already fixed", () => {
  const book = readUnlistedXlsxBytes(WORKBOOK, "fixture.xlsx");
  assert.deepEqual(book.rows[0], {
    sno: 1, name: "APL Metals Unlisted Shares", price: 385,
    depository: "NSDL & CDSL", lotSize: 100, sheet: "A-M", row: 3,
  });
  assert.equal(book.rows[1].name, "Elofic Industries Limited", "sanitised on read");
  assert.equal(book.rows[1].price, 1200, "the RETAIL price, never the 1150 beside it");
  for (const r of book.rows) {
    assert.deepEqual(
      Object.keys(r).filter((k) => !["sno", "name", "price", "depository", "lotSize", "sheet", "row"].includes(k)),
      [], `row "${r.name}" carries a field it should not`,
    );
  }
});

test("the workbook's dealer prices appear nowhere in what the reader returns", () => {
  const book = readUnlistedXlsxBytes(WORKBOOK, "fixture.xlsx");
  const { logos, ...rest } = book; // logo bytes are image data, not text
  const dump = JSON.stringify(rest);
  for (const dealerOnly of [371, 1151, 901, 902, 51, 991, 992]) {
    assert.ok(!new RegExp(`\\b${dealerOnly}\\b`).test(dump),
      `the dealer figure ${dealerOnly} must not survive anywhere in the reader's output`);
  }
});

test("per-row validation matches the CSV path", () => {
  const book = readUnlistedXlsxBytes(WORKBOOK, "fixture.xlsx");
  assert.deepEqual(book.skipped, [
    { line: "N-Z row 5: (blank)", reason: "blank company name" },
    { line: "N-Z row 6: Zzz Holdings Limited", reason: 'unreadable retail price "on request"' },
  ]);
});

test("the depository typo and the absent depository both come through correctly", () => {
  const book = readUnlistedXlsxBytes(WORKBOOK, "fixture.xlsx");
  const sk = book.rows.find((r) => r.name === "SK Finance Limited");
  const etrav = book.rows.find((r) => r.name === "E Trav Tech Limited");
  assert.equal(sk.depository, "NSDL & CDSL", '"SDL & CDSL" is a typo, not "CDSL only"');
  assert.equal("depository" in etrav, false, '"—" means none, not a guess');
  assert.deepEqual(book.depositoryNotes.map((n) => [n.kind, n.name]), [["typo", "SK Finance Limited"]]);
});

test('the "As on" date is read from the shared strings and normalises to ISO', () => {
  const book = readUnlistedXlsxBytes(WORKBOOK, "fixture.xlsx");
  assert.equal(book.asOnRaw, "06 Aug 2026");
  assert.equal(normalizeIsoDate(book.asOnRaw), "2026-08-06", "zero-padded, always");
});

test("logo anchors resolve to media, on the right (1-based) Excel row", () => {
  const book = readUnlistedXlsxBytes(WORKBOOK, "fixture.xlsx");
  assert.equal(book.logos.length, 1, "the background shape has no r:embed and is not a logo");
  const [logo] = book.logos;
  assert.equal(logo.sheet, "A-M");
  assert.equal(logo.row, 3, "<xdr:row>2</xdr:row> is zero-based — that is Excel row 3");
  assert.equal(logo.mediaPath, "xl/media/image1.jpeg");
  assert.deepEqual([...logo.bytes.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  assert.equal(book.rows.find((r) => r.sheet === logo.sheet && r.row === logo.row).name, "APL Metals Unlisted Shares");
});

test("a workbook whose price column is not the retail one is refused, not read", () => {
  const sst = [];
  const bad = sheetPart([
    [2, ["S.No", "", "Share Name", "Dealer Price", "Depository"]],
    [3, [1, "", "Tata Capital", 950, "NSDL"]],
  ], sst, "");
  const zip = storedZip([
    { name: "_rels/.rels", data: `<?xml version="1.0"?><Relationships xmlns="${REL}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `<?xml version="1.0"?><workbook xmlns:r="${REL}"><sheets><sheet name="Prices" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0"?><Relationships xmlns="${REL}"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>` },
    { name: "xl/worksheets/sheet1.xml", data: bad },
    { name: "xl/sharedStrings.xml", data: `<?xml version="1.0"?><sst>${sst.map((s) => `<si><t>${xmlEscape(s)}</t></si>`).join("")}</sst>` },
  ]);
  assert.throws(() => readUnlistedXlsxBytes(zip, "bad.xlsx"), /no retail price column/);
});

test("a file that is not a workbook fails loudly rather than reading as empty", () => {
  assert.throws(() => readUnlistedXlsxBytes(Buffer.from("Share Name,Retail Price\nTata,950\n")), /not a zip archive/);
});

/* ---------- joining logos to companies ---------- */

/**
 * The logo extractor's whole premise: the workbook SAYS which row an image is
 * anchored to, so the logo and the company are joined on (sheet, row) and no
 * pixel geometry is consulted. Getting this wrong puts one company's brand
 * mark on another company's card — visible to every visitor, and invisible to
 * every check that only looks at prices.
 */
test("a logo is joined to the company standing on its anchored row", () => {
  const book = readUnlistedXlsxBytes(WORKBOOK, "fixture.xlsx");
  const { paired, orphans, missing } = joinLogosToRows(book);

  assert.equal(orphans.length, 0);
  assert.deepEqual(paired.map((p) => [p.name, p.sheet, p.row]),
    [["APL Metals Unlisted Shares", "A-M", 3]]);
  assert.equal(paired[0].mediaPath, "xl/media/image1.jpeg");
  assert.deepEqual([...paired[0].bytes.subarray(0, 3)], [0xff, 0xd8, 0xff]);

  // Every other priced company keeps the site's monogram fallback.
  assert.deepEqual(missing, [
    "Elofic Industries Limited", "Inox Clean Energy Limited",
    "SK Finance Limited", "E Trav Tech Limited",
  ]);
});

test("a paired logo carries a name and bytes — and no price of any kind", () => {
  const book = readUnlistedXlsxBytes(WORKBOOK, "fixture.xlsx");
  const { paired } = joinLogosToRows(book);
  assert.deepEqual(Object.keys(paired[0]).sort(), ["bytes", "mediaPath", "name", "row", "sheet"]);
  const { bytes, ...rest } = paired[0];
  // 385 is the row's retail price. The logo pipeline must never see it.
  assert.ok(!/\b385\b/.test(JSON.stringify(rest)), "no price may cross into the logo path");
});

test("an image anchored to a row with no company is an orphan, not a mis-pairing", () => {
  // A banner on the title row, and a logo on a row that was skipped for a bad
  // price. Neither may be silently attached to whichever company is nearest.
  const rows = [
    { name: "Tata Capital", price: 950, sheet: "A-M", row: 3 },
    { name: "Hero FinCorp", price: 1725, sheet: "A-M", row: 4 },
    { name: "Zepto", price: 55, sheet: "N-Z", row: 3 },
  ];
  const logos = [
    { sheet: "A-M", row: 1, mediaPath: "xl/media/banner.jpeg", bytes: Buffer.of(1) },
    { sheet: "A-M", row: 4, mediaPath: "xl/media/image2.jpeg", bytes: Buffer.of(2) },
    { sheet: "N-Z", row: 9, mediaPath: "xl/media/image3.jpeg", bytes: Buffer.of(3) },
  ];
  const { paired, orphans, missing } = joinLogosToRows({ rows, logos });
  assert.deepEqual(paired.map((p) => p.name), ["Hero FinCorp"]);
  assert.deepEqual(orphans.map((o) => `${o.sheet} ${o.row}`), ["A-M 1", "N-Z 9"]);
  assert.deepEqual(missing, ["Tata Capital", "Zepto"]);
});

test("the same row number on two sheets is two different companies", () => {
  // Row 3 exists on all seven data sheets. Joining on the row alone would put
  // sheet A-C's logo on sheet U-Z's company.
  const rows = [
    { name: "Alpha", price: 1, sheet: "A-C", row: 3 },
    { name: "Omega", price: 2, sheet: "U-Z", row: 3 },
  ];
  const logos = [
    { sheet: "U-Z", row: 3, mediaPath: "m/omega.jpeg", bytes: Buffer.of(9) },
  ];
  const { paired, missing } = joinLogosToRows({ rows, logos });
  assert.deepEqual(paired.map((p) => p.name), ["Omega"]);
  assert.deepEqual(missing, ["Alpha"]);
});

test("joinLogosToRows copes with a workbook that has no images at all", () => {
  const rows = [{ name: "Tata Capital", price: 950, sheet: "A-M", row: 3 }];
  assert.deepEqual(joinLogosToRows({ rows, logos: [] }), { paired: [], orphans: [], missing: ["Tata Capital"] });
  assert.deepEqual(joinLogosToRows(), { paired: [], orphans: [], missing: [] });
});

/* ---------- attaching logos to documents ---------- */

/**
 * The logo path resolves a name through the SAME resolveUnlistedTarget and the
 * SAME declared alias file as the price import. Anything less and a name lands
 * on one document when it carries a price and another — or none — when it
 * carries a picture.
 */

const logoDoc = (slug, company, extra = {}) => ({
  _id: `unlistedShare-${slug}`, slug, company, aliases: [], hasLogo: false, ...extra,
});
const crop = (name) => ({ name, bytes: Buffer.from([1, 2, 3]), contentType: "image/jpeg", extension: "jpeg" });

test("a logo is never allowed to create a document", () => {
  const { planned, unmatched } = planAttachments([crop("Some Company Nobody Has Limited")], [logoDoc("tata", "Tata Capital")], {});
  assert.deepEqual(planned, []);
  assert.equal(unmatched.length, 1);
  assert.match(unmatched[0].reason, /never create/);
  assert.equal(unmatched[0].name, "Some Company Nobody Has Limited", "reported by company name, not by index");
});

test("the declared alias file decides a logo the heuristics cannot", () => {
  // Real shape from the live dataset: the partner writes "PharmEasy Unlisted
  // Shares", and that exact string is an alias on TWO of our documents. Without
  // the alias file the matcher correctly refuses to guess — and the logo is
  // dropped. With it, the operator's choice wins.
  const docs = [
    logoDoc("api-holdings-pharmeasy", "API Holdings (PharmEasy)", { aliases: ["API Holdings (PharmEasy)", "PharmEasy Unlisted Shares"] }),
    logoDoc("pharm-easy", "Pharm Easy", { aliases: ["PharmEasy", "PharmEasy Unlisted Shares"] }),
  ];
  const crops = [crop("PharmEasy Unlisted Shares")];

  const without = planAttachments(crops, docs, {});
  assert.deepEqual(without.planned, [], "two candidates must never be guessed between");
  assert.match(without.unmatched[0].reason, /^ambiguous/);

  const declared = new Map([[declaredNameKey("PharmEasy Unlisted Shares"), "api-holdings-pharmeasy"]]);
  const with_ = planAttachments(crops, docs, { declared });
  assert.deepEqual(with_.planned.map((p) => p.doc.slug), ["api-holdings-pharmeasy"]);
  assert.equal(with_.planned[0].via, "declared");
});

test("the committed alias file is the one the logo path actually loads", () => {
  // Guards against the two drifting: the file on disk has to parse, and its
  // keys have to be the keys the matcher looks up.
  const { byIncoming, errors } = loadUnlistedAliases();
  assert.deepEqual(errors, [], "scripts/unlisted-aliases.json must be structurally valid");
  assert.equal(byIncoming.get(declaredNameKey("PharmEasy Unlisted Shares")), "api-holdings-pharmeasy");
  const docs = [
    logoDoc("api-holdings-pharmeasy", "API Holdings (PharmEasy)", { aliases: ["PharmEasy Unlisted Shares"] }),
    logoDoc("pharm-easy", "Pharm Easy", { aliases: ["PharmEasy Unlisted Shares"] }),
  ];
  const { planned } = planAttachments([crop("PharmEasy Unlisted Shares")], docs, { declared: byIncoming });
  assert.deepEqual(planned.map((p) => p.doc.slug), ["api-holdings-pharmeasy"]);
});

test("a document that already has a logo is left alone unless --force", () => {
  const docs = [logoDoc("tata", "Tata Capital", { hasLogo: true })];
  const plain = planAttachments([crop("Tata Capital")], docs, {});
  assert.deepEqual(plain.planned, []);
  assert.match(plain.unmatched[0].reason, /--force/);
  assert.equal(plain.unmatched[0].doc.slug, "tata", "the skipped entry knows its document, so a dry run can file it");

  const forced = planAttachments([crop("Tata Capital")], docs, { force: true });
  assert.deepEqual(forced.planned.map((p) => p.doc.slug), ["tata"]);
});

test("two logos claiming one document: the first wins, the second is reported", () => {
  const docs = [logoDoc("krasny", "Krasny Defence Technologies Li")];
  const { planned, unmatched } = planAttachments(
    [crop("Krasny Defence Technologies Limited"), crop("Krasny Defence Technologies Private Limited")], docs, {},
  );
  assert.equal(planned.length, 1, "one document, one logo");
  assert.equal(planned[0].crop.name, "Krasny Defence Technologies Limited");
  assert.match(unmatched[0].reason, /already got a logo this run/);
});

test("a logo plan carries nothing that could rename or move a document", () => {
  const docs = [logoDoc("wu-sterlite-grid-5", "Sterlite Grid 5")];
  const { planned } = planAttachments([crop("Sterlite Grid 5 Unlisted Shares")], docs, {});
  assert.deepEqual(Object.keys(planned[0]).sort(), ["crop", "doc", "via"]);
  // The document object is passed through by reference and never rewritten.
  assert.equal(planned[0].doc, docs[0]);
  assert.equal(planned[0].doc.company, "Sterlite Grid 5");
  assert.equal(planned[0].doc.slug, "wu-sterlite-grid-5");
});

test("a crop is filed under the document's real slug, not a slug of its name", () => {
  // These differ in live data more often than you'd think: "Sterlite Grid 5"
  // lives at wu-sterlite-grid-5, because the slug was minted from an OCR-damaged
  // name and slugs never move. Naming the file from the company would put a
  // picture in the review folder that matches no document in Studio.
  const doc = logoDoc("wu-sterlite-grid-5", "Sterlite Grid 5");
  assert.equal(cropFileName(doc, crop("Sterlite Grid 5 Unlisted Shares")), "wu-sterlite-grid-5.jpeg");
  assert.notEqual(cropFileName(doc, crop("x")), `${slugify(doc.company)}.jpeg`);
  // An unmatched crop has no slug to use, so it is filed under the list name.
  assert.equal(cropFileName(null, crop("Some Company Nobody Has")), "some-company-nobody-has.jpeg");
});

/* ---------- the embedded images ---------- */

/**
 * These marks arrive small — 40 to 168px wide, median 84 — and already at the
 * size they will be published at. The rules are: trim uniform white borders,
 * never scale anything, and drop what is too small to be a brand mark.
 */

let makeImage = null;
try {
  const { createCanvas } = await import("@napi-rs/canvas");
  /** A `w`×`h` white tile with a solid mark inset by `pad` on every side. */
  makeImage = (w, h, pad, mime = "image/png") => {
    const c = createCanvas(w, h);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    if (pad * 2 < Math.min(w, h)) {
      ctx.fillStyle = "#1b3a8f";
      ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2);
    }
    return mime === "image/png" ? c.toBuffer("image/png") : c.toBuffer("image/jpeg", 92);
  };
} catch { /* @napi-rs/canvas absent — the image tests below skip themselves */ }

if (makeImage) {
  test("a uniform white border is trimmed down to the mark", async () => {
    const out = await trimUniformWhiteBorder(makeImage(120, 120, 20), "xl/media/image1.png");
    assert.equal(out.trimmed, true);
    assert.equal(out.width, 80, "120 less a 20px border on each side");
    assert.equal(out.height, 80);
    assert.equal(out.contentType, "image/png");
  });

  test("an image with no border is handed back byte-for-byte, not re-encoded", async () => {
    // Re-encoding a JPEG that needed no work just adds a second round of loss.
    const bytes = makeImage(84, 84, 0, "image/jpeg");
    const out = await trimUniformWhiteBorder(bytes, "xl/media/image1.jpeg");
    assert.equal(out.trimmed, false);
    assert.equal(out.bytes, bytes, "the partner's own bytes, unchanged");
    assert.equal(out.contentType, "image/jpeg");
  });

  test("nothing is ever upscaled", async () => {
    // A 40px mark is the smallest the partner sends. It must come out 40px.
    for (const [w, h] of [[40, 40], [48, 84], [168, 60]]) {
      const out = await trimUniformWhiteBorder(makeImage(w, h, 0), "xl/media/image1.png");
      assert.ok(out.width <= w && out.height <= h, `${w}×${h} grew to ${out.width}×${out.height}`);
    }
  });

  test("a mark under 32px after trimming is dropped for the monogram", async () => {
    // A 100px tile whose actual mark is 20px is a bullet or a rule.
    const out = await trimUniformWhiteBorder(makeImage(100, 100, 40), "xl/media/image1.png");
    assert.equal(out.tooSmall, true);
    assert.equal(out.width, 20);
    // …and the floor is a floor: 32 exactly survives.
    const edge = await trimUniformWhiteBorder(makeImage(100, 100, 34), "xl/media/image1.png");
    assert.equal(edge.width, 32);
    assert.ok(!edge.tooSmall, "32px is the floor, not below it");
  });

  test("an all-white image is blank, not a logo", async () => {
    const out = await trimUniformWhiteBorder(makeImage(84, 84, 84), "xl/media/image1.png");
    assert.equal(out.blank, true);
  });

  /**
   * The one end-to-end run of the logo extractor. Everything above is a pure
   * function; this checks the two things that are only true of the whole
   * script: that a dry run files each crop under its DOCUMENT's slug, and that
   * no price of any kind reaches the output.
   *
   * No network — the Sanity read is answered by a preloaded fetch stub — and
   * --dry-run means there is nothing to upload even if that failed.
   */
  test("a dry run files crops by slug and prints no price", () => {
    const dir = mkdtempSync(join(tmpdir(), "unlisted-logos-"));
    try {
      writeFileSync(join(dir, "list.xlsx"), buildLogoWorkbook(makeImage));
      writeFileSync(join(dir, "stub.mjs"),
        "const docs = [\n" +
        '  { _id: "d1", company: "API Holdings (PharmEasy)", slug: "api-holdings-pharmeasy", aliases: ["PharmEasy Unlisted Shares"], hasLogo: false },\n' +
        '  { _id: "d2", company: "Pharm Easy", slug: "pharm-easy", aliases: ["PharmEasy Unlisted Shares"], hasLogo: false },\n' +
        '  { _id: "d3", company: "Sterlite Grid 5", slug: "wu-sterlite-grid-5", aliases: [], hasLogo: false },\n' +
        "];\n" +
        'globalThis.fetch = async () => new Response(JSON.stringify({ result: docs }),' +
        ' { headers: { "content-type": "application/json" } });\n');

      const script = fileURLToPath(new URL("./extract-unlisted-logos.mjs", import.meta.url));
      const res = spawnSync(
        process.execPath,
        ["--import", pathToFileURL(join(dir, "stub.mjs")).href, script, join(dir, "list.xlsx"),
         "--dry-run", `--out=${join(dir, "out")}`],
        { encoding: "utf8", env: { ...process.env, NEXT_PUBLIC_SANITY_PROJECT_ID: "stub", SANITY_API_TOKEN: "stub" } },
      );
      assert.equal(res.status, 0, `expected a clean exit\n${res.stdout}\n${res.stderr}`);

      // Filed under the DOCUMENT's slug. "Sterlite Grid 5" lives at
      // wu-sterlite-grid-5, so a name-derived slug would be wrong here.
      const written = readdirSync(join(dir, "out")).filter((f) => f.endsWith(".jpeg")).sort();
      assert.deepEqual(written, ["api-holdings-pharmeasy.jpeg", "wu-sterlite-grid-5.jpeg"]);

      // PharmEasy is an alias on BOTH documents; only the alias file separates
      // them, so this landing anywhere at all is the alias file working.
      assert.match(res.stdout, /matched through scripts\/unlisted-aliases\.json/);

      // CONFIDENTIALITY: every retail AND dealer figure in the fixture is
      // unique, so finding any of them anywhere in the output means a price
      // crossed into the logo path.
      for (const price of LOGO_FIXTURE_PRICES) {
        assert.doesNotMatch(res.stdout + res.stderr, new RegExp(`\\b${price}\\b`),
          `${price} is a price from the workbook and must never reach the logo path's output`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a rejected image never reaches a document", async () => {
    // The size floor has to be applied before matching, not after: a company
    // whose only image is a smudge keeps the monogram rather than getting one.
    const tiny = await trimUniformWhiteBorder(makeImage(100, 100, 45), "xl/media/image1.png");
    assert.ok(tiny.tooSmall);
    const usable = [{ ...(await trimUniformWhiteBorder(makeImage(84, 84, 4), "xl/media/image1.png")), name: "Tata Capital" }];
    const { planned } = planAttachments(usable, [logoDoc("tata", "Tata Capital")], {});
    assert.deepEqual(planned.map((p) => p.doc.slug), ["tata"]);
  });
}

/* ---------- report ---------- */

await Promise.all(pending);

for (const { name, err } of failures) {
  console.error(`✗ ${name}\n  ${err.message.split("\n")[0]}`);
}
console.log(`\n${passed} passed · ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
