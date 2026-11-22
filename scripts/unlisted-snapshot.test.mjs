#!/usr/bin/env node
/** Self-test for the monthly unlisted snapshot. No network.  npm run test:unlisted-snapshot */
import { strict as assert } from "node:assert";
import {
  assertNoConfidentialKeys, buildRows, importDates, istMonthWindow, latestPerMonth,
  previousImportDate, toCsv, validateRows, ROW_FIELDS,
} from "./unlisted-snapshot-lib.mjs";

const doc = (company, history, extra = {}) => ({
  company, slug: company.toLowerCase().replace(/\s+/g, "-"), sector: "Tech", lotSize: 100,
  priceHistory: history.map(([d, p]) => ({ _key: d, d, p })), ...extra,
});
const docs = [
  doc("Alpha", [["2026-08-10", 100], ["2026-11-21", 120]]),
  doc("Beta", [["2026-08-10", 50]]),                         // dropped
  doc("Gamma", [["2026-11-21", 10]]),                        // new
  doc("Delta", [["2026-08-10", 10], ["2026-11-21", 100]]),   // +900% → implausible
  ...Array.from({ length: 25 }, (_, i) => doc(`Filler ${i}`, [["2026-08-06", 1], ["2026-08-10", 1], ["2026-11-21", 1]])),
  doc("Hand", [["2026-07-22", 5]]),
];

// Import detection by asOfDate row count, not by name.
const { dates, ignored } = importDates(docs, 20);
assert.deepEqual(dates, ["2026-08-06", "2026-08-10", "2026-11-21"]);
assert.deepEqual(ignored, [["2026-07-22", 1]]);
assert.deepEqual(latestPerMonth(dates), ["2026-08-10", "2026-11-21"]);
assert.equal(previousImportDate(dates, "2026-11-21"), "2026-08-10");
assert.equal(previousImportDate(dates, "2026-08-10"), null, "same-month import is not 'previous month'");

// Rows.
const enq = new Map([["alpha", 3]]);
const rows = validateRows(buildRows(docs, "2026-11-21", "2026-08-10", enq));
const by = Object.fromEntries(rows.map((r) => [r.name, r]));
assert.equal(by.Alpha.pctChange, 20);
assert.equal(by.Alpha.listing, "continuing");
assert.equal(by.Alpha.minInvestmentINR, 12000);
assert.equal(by.Alpha.enquiries, 3);
assert.equal(by.Beta.listing, "dropped");
assert.equal(by.Beta.retailPriceINR, null);
assert.equal(by.Gamma.listing, "new");
assert.equal(by.Gamma.enquiries, 0);
assert.equal(by.Delta.pctChange, null);
assert.equal(by.Delta.pctChangeFlag, "implausible");
assert.equal(by.Hand, undefined);
for (const r of rows) assert.deepEqual(Object.keys(r).sort(), [...ROW_FIELDS].sort());

// First snapshot: no comparison, enquiries unavailable.
const first = buildRows(docs, "2026-08-10", null, null);
assert.ok(first.every((r) => r.listing === null && r.enquiries === null));

// Confidentiality: a dealer-ish key anywhere aborts.
for (const k of ["dealerPriceINR", "dealer_price", "costPrice", "buyPrice", "purchasePrice", "margin"]) {
  assert.throws(() => assertNoConfidentialKeys([{ company: "X", priceHistory: [{ d: "2026-11-21", [k]: 1 }] }]), /CONFIDENTIAL/);
}
assert.throws(() => validateRows([{ ...rows[0], dealer: 1 }]), /unexpected field|CONFIDENTIAL/);
assert.doesNotThrow(() => assertNoConfidentialKeys(docs));

// CSV quoting + header.
const csv = toCsv([{ ...rows[0], name: 'A, "B"' }]);
assert.ok(csv.startsWith(ROW_FIELDS.join(",") + "\n"));
assert.ok(csv.includes('"A, ""B"""'));

// IST month window.
assert.deepEqual(istMonthWindow("2026-11"), { start: "2026-10-31T18:30:00.000Z", end: "2026-11-30T18:30:00.000Z" });

console.log("unlisted-snapshot: all tests passed");
