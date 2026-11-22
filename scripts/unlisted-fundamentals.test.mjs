#!/usr/bin/env node
/** Self-test for unlisted fundamentals: CSV guard, metrics, scorecard, changes. No network.
 *  npm run test:unlisted-fundamentals */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { parseCsv } from "./import-shared.mjs";
import {
  assertNoConfidentialKeys, changesSince, computeMetrics, drhpAsOf, importDates, latestPerMonth,
  mergeFundamentals, scorecard, validateFundamentalsCsv,
} from "./unlisted-fundamentals-lib.mjs";

const config = JSON.parse(readFileSync("config/unlisted-scorecard.json", "utf8"));
const csv = (t) => validateFundamentalsCsv(parseCsv(t));
const HEADER = readFileSync("_templates/unlisted-fundamentals.csv", "utf8").trim();

// ── CSV: the example passes; identities, never names ──
const ex = csv(readFileSync("_templates/unlisted-fundamentals.example.csv", "utf8"));
assert.equal(ex.companies.length, 1);
const c0 = ex.companies[0];
assert.equal(c0.slug, "example-company");
assert.equal(c0.years.length, 2);
assert.equal(c0.company.drhpStatus, "approved");
assert.deepEqual(c0.company.listedPeers, ["NSE:AARTIIND", "NSE:VINATIORGA"]);

const bad = (text, re) => assert.throws(() => csv(text), re);
bad(HEADER.replace("cash_cr", "dealer_price"), /CONFIDENTIAL/);
bad(HEADER + ",retail_price", /prices never come from this CSV/);
bad(HEADER + ",company_name", /Unknown column/);
bad("name,fy_end\nAcme,2025-03-31", /Unknown column/);
const row = (o) => HEADER + "\n" + HEADER.split(",").map((h) => o[h] ?? "").join(",");
const base = { slug: "acme", fy_end: "2025-03-31", revenue_cr: "100", source: "MCA", source_date: "2025-10-01" };
assert.doesNotThrow(() => csv(row(base)));
bad(row({ ...base, slug: "" }), /needs slug or cin/);
bad(row({ ...base, fy_end: "2025-3-31" }), /zero-padded/);
bad(row({ ...base, source: "PMS Bazaar" }), /source/);
bad(row({ ...base, source_date: "" }), /source_date is required/);
bad(row({ ...base, source_date: "2025-01-01" }), /before fy_end/);
bad(row({ ...base, revenue_cr: "1.2k" }), /not a number/);
bad(row({ ...base, shares_outstanding: "12.5" }), /whole number/);
bad(row({ ...base, audit_qualified: "yes" }), /needs audit_qualification_note/);
bad(row({ ...base, cin: "ABC" }), /valid 21-character CIN/);
bad(row({ ...base, drhp_status: "approved", drhp_filed_date: "2025-09-01" }), /approved needs/);
bad(row({ ...base, revenue_cr: "", source: "", source_date: "" }) , /FY row has no figures|source/);
assert.equal(csv(row({ ...base, revenue_cr: "\"1,234.5\"" })).companies[0].years[0].revenueCr, 1234.5);

// ── Merge: add, unchanged, restatement refused unless allowed, CIN identity ──
const share = { _id: "unlistedShare-abc.1", slug: "example-company", company: "Example Co" };
const m1 = mergeFundamentals(null, share, c0, { today: "2026-11-22" });
assert.equal(m1.doc._id, "unlistedFundamentals-unlistedShare-abc-1");
assert.deepEqual(m1.added, ["2024-03-31", "2025-03-31"]);
assert.ok(m1.doc.years.every((y) => y.importedAt === "2026-11-22"));
const m2 = mergeFundamentals(m1.doc, share, c0, { today: "2026-12-01" });
assert.deepEqual(m2.unchanged, ["2024-03-31", "2025-03-31"]);
assert.equal(m2.added.length, 0);
const restated = { ...c0, years: [{ ...c0.years[1], patCr: 80 }] };
const m3 = mergeFundamentals(m1.doc, share, restated, { today: "2026-12-01" });
assert.deepEqual(m3.restated, [{ fyEnd: "2025-03-31", fields: ["patCr"] }]);
assert.equal(m3.doc.years[1].patCr, 81.7, "restatement not applied without the flag");
const m4 = mergeFundamentals(m1.doc, share, restated, { today: "2026-12-01", allowRestatement: true });
assert.equal(m4.doc.years[1].patCr, 80);
assert.throws(() => mergeFundamentals(m1.doc, share, { ...c0, cin: "U99999MH2010PTC999999" }, { today: "x" }), /CIN/);

// ── Metrics at a retail price of ₹500 ──
const { fy, metrics: m, notes } = computeMetrics(m1.doc.years, 500, config);
assert.equal(fy, "2025-03-31");
assert.equal(m.revenueGrowthYoYPct, 15.9);
assert.equal(m.revenueCagr3yPct, null);
assert.match(notes.revenueCagr3yPct, /not available/);
assert.equal(m.ebitdaMarginPct, 15.79);
assert.equal(m.ebitdaMarginChangePp, 1.01);
assert.equal(m.roePct, 14.07);
assert.equal(m.debtToEquity, 0.15);
assert.equal(m.netCashCr, -34.5);
assert.equal(m.cashConversion, 1.08);
assert.equal(m.marketCapCr, 6250);
assert.equal(m.pe, 76.5);
assert.equal(m.pb, 10.05);
assert.equal(m.evSales, 6.61);

// No price → valuation not available, never a guess.
const np = computeMetrics(m1.doc.years, null, config);
assert.equal(np.metrics.pe, null);
assert.match(np.notes.pe, /no retail price/);

// Implausible growth is withheld.
const jump = computeMetrics([{ fyEnd: "2024-03-31", revenueCr: 10 }, { fyEnd: "2025-03-31", revenueCr: 100 }], null, config);
assert.equal(jump.metrics.revenueGrowthYoYPct, null);
assert.match(jump.notes.revenueGrowthYoYPct, /withheld/);

// ── Scorecard: seven independent factors, no total ──
const drhp = drhpAsOf(m1.doc ? { ...m1.doc, ...c0.company } : null, "2026-11-30");
assert.equal(drhp.status, "approved");
assert.equal(drhpAsOf(c0.company, "2026-01-31").status, "filed");
assert.equal(drhpAsOf(c0.company, "2025-01-31").status, "none");
const sc = scorecard(m, notes, drhp, config);
const st = Object.fromEntries(sc.map((f) => [f.factor, f.status]));
assert.deepEqual(st, { growthQuality: "green", profitabilityTrend: "green", balanceSheet: "green", cashConversion: "green", governance: "green", valuation: "red", ipoVisibility: "green" });
assert.ok(sc.every((f) => typeof f.rule === "string" && f.rule.length > 10 && "display" in f));
assert.ok(!sc.some((f) => "score" in f || "weight" in f), "factors are never scored or weighted");
const empty = computeMetrics([], null, config);
const scE = scorecard(empty.metrics, empty.notes, drhpAsOf(null, "2026-11-30"), config);
assert.ok(scE.every((f) => f.status === "not_available" && f.display === "not available"));

// Loss-making caps growth at amber; P/E falls back to EV/Sales.
const loss = computeMetrics([
  { fyEnd: "2024-03-31", revenueCr: 100, ebitdaCr: 5, patCr: -2, netWorthCr: 50, totalDebtCr: 0, cashCr: 10, sharesOutstanding: 1e7 },
  { fyEnd: "2025-03-31", revenueCr: 130, ebitdaCr: 9, patCr: -1, netWorthCr: 49, totalDebtCr: 0, cashCr: 12, sharesOutstanding: 1e7 },
], 100, config);
const scL = Object.fromEntries(scorecard(loss.metrics, loss.notes, { status: "none" }, config).map((f) => [f.factor, f]));
assert.equal(scL.growthQuality.status, "amber");
assert.equal(scL.valuation.metric, "evSales");
assert.equal(scL.cashConversion.status, "not_available");
assert.equal(scL.ipoVisibility.status, "red");

// ── What changed ──
const rec = (years, drhpS) => ({ years, drhp: drhpS });
const y = (fyEnd, extra = {}) => ({ fyEnd, auditor: "A & Co", auditQualified: false, source: "MCA", sourceDate: "2025-10-01", ...extra });
assert.equal(changesSince(undefined, rec([y("2025-03-31")], { status: "none" })), null);
assert.deepEqual(changesSince(null, rec([y("2024-03-31"), y("2025-03-31")], { status: "none" })), [{ type: "fundamentals_added", fyEnds: ["2024-03-31", "2025-03-31"] }]);
const ch = changesSince(rec([y("2024-03-31")], { status: "none" }),
  rec([y("2024-03-31"), y("2025-03-31", { auditor: "B LLP", auditQualified: true, auditQualificationNote: "going concern" })], { status: "filed", filedDate: "2026-11-03" }));
assert.deepEqual(ch.map((c) => c.type), ["results_filed", "auditor_change", "qualification_added", "drhp_filed"]);
const ap = changesSince(rec([], { status: "filed", filedDate: "2026-01-01" }), rec([], { status: "approved", filedDate: "2026-01-01", approvedDate: "2026-11-10" }));
assert.deepEqual(ap, [{ type: "drhp_approved", date: "2026-11-10" }]);

// ── Confidentiality + import dates ──
for (const k of ["dealerPriceINR", "dealer_price", "costPrice", "buyPrice", "purchasePrice"]) {
  assert.throws(() => assertNoConfidentialKeys({ years: [{ [k]: 1 }] }), /CONFIDENTIAL/);
}
const docs = Array.from({ length: 25 }, () => ({ priceHistory: [{ d: "2026-08-06" }, { d: "2026-08-10" }, { d: "2026-11-21" }] })).concat([{ priceHistory: [{ d: "2026-07-22" }] }]);
const id = importDates(docs, 20);
assert.deepEqual(latestPerMonth(id.dates), ["2026-08-10", "2026-11-21"]);
assert.deepEqual(id.ignored, [["2026-07-22", 1]]);

console.log("unlisted-fundamentals: all tests passed");
