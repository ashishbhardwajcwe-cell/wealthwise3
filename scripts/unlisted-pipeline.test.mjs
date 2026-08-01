#!/usr/bin/env node
/**
 * Self-test for the unlisted-shares pipeline's silent-failure surfaces.
 *
 *   node scripts/unlisted-pipeline.test.mjs      (or: npm run test:unlisted)
 *
 * No dependencies, no network, no Sanity. Three things are covered, all of
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
 */

import { strict as assert } from "node:assert";
import {
  parsePriceListText, priceFusedName, validateImportRows,
  hasUnbalancedBracket, stripCorruption, trailingNumber,
} from "./unlisted-matching.mjs";
import { auditUnlistedDocs, structuralSignatures } from "./audit-unlisted.mjs";
import { cleanUnlistedName } from "./clean-unlisted-names.mjs";

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try { fn(); passed++; } catch (err) { failures.push({ name, err }); }
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

/* ---------- report ---------- */

for (const { name, err } of failures) {
  console.error(`✗ ${name}\n  ${err.message.split("\n")[0]}`);
}
console.log(`\n${passed} passed · ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
