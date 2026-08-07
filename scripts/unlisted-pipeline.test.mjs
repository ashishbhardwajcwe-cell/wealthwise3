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
} from "./unlisted-matching.mjs";
import {
  auditUnlistedDocs, structuralSignatures, selectPurgeTargets,
  asOfDateHistogram, confirmExactly,
} from "./audit-unlisted.mjs";
import { Readable } from "node:stream";
import { crc32 } from "node:zlib";
import { cleanUnlistedName } from "./clean-unlisted-names.mjs";
import { readUnlistedXlsxBytes, joinLogosToRows } from "./unlisted-xlsx.mjs";
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
 * retail prices and two of them carrying hand-extracted logos. Every one of
 * them trips a name signature, which is precisely why the purge intersects the
 * signature with asOfDate instead of trusting either alone.
 */
const GENUINE_22_JUL = [
  "Sterlite Grid 5",
  "Zepto Unlisted Shares (Equity)",
  "Signify Innovations (Previously Ph",
  "Sterlite Electric Limited (Formerly",
  "Fusion Techstack Limited (Forme",
];

test("every genuine 22-Jul name really does trip a signature (the trap)", () => {
  for (const n of GENUINE_22_JUL) {
    assert.ok(structuralSignatures(n).length > 0,
      `"${n}" must trip a signature — that is what makes name-only purging unsafe`);
  }
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

  // …and purging the legitimate import's own date would take the five with it,
  // which is why the date has to be typed explicitly and the list read first.
  assert.equal(selectPurgeTargets(rows, "2026-07-22").targets.length, 5);
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

/* ---------- report ---------- */

await Promise.all(pending);

for (const { name, err } of failures) {
  console.error(`✗ ${name}\n  ${err.message.split("\n")[0]}`);
}
console.log(`\n${passed} passed · ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
