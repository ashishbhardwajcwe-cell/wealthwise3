#!/usr/bin/env node
/**
 * Monthly FUNDAMENTALS snapshot of unlisted companies, for the newsletter.
 *
 *   npm run unlisted:snapshot -- --date=YYYY-MM-DD   that month's price import (asOfDate)
 *   npm run unlisted:snapshot -- --backfill          every past month with a price import
 *   add --dry-run to print the summary and write nothing
 *
 * Read-only against Sanity. Writes data/unlisted-snapshots/YYYY-MM.json and
 * latest.json (always the newest month on disk).
 *
 * Per company: latest fundamentals, calculated metrics, the 7-factor scorecard,
 * valuation at that month's RETAIL price, and "what changed this month"
 * (compared with the previous month's snapshot file).
 *
 * NOT a buy signal: companies are listed alphabetically, factors are never
 * combined, and price momentum is never used — the retail price only feeds
 * market cap, P/E, P/B and EV/Sales.
 *
 * Imports are identified by asOfDate (a date carried in ≥20 documents'
 * priceHistory), never by company name. Fundamentals imported after the end of
 * the snapshot month, and DRHP events dated after it, are excluded, so a
 * backfilled month shows only what was known then.
 *
 * CONFIDENTIALITY: retail price only. Aborts before writing if a dealer/cost/buy
 * style key is found in Sanity or the output, or "dealer" appears in the file.
 *
 * Thresholds: config/unlisted-scorecard.json.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireSanityEnv, sanityQuery } from "./import-shared.mjs";
import {
  assertNoConfidentialKeys, assertNoConfidentialText, changesSince, computeMetrics, drhpAsOf,
  importDates, isIsoDate, latestPerMonth, monthEnd, monthOf, retailPriceOn, scorecard,
} from "./unlisted-fundamentals-lib.mjs";

const OUT_DIR = join(process.cwd(), "data", "unlisted-snapshots");
const CONFIG_PATH = join(process.cwd(), "config", "unlisted-scorecard.json");
const SOURCE_PRICE = "PlanMyCashflows indicative (retail) price list";

const args = { date: null, backfill: false, dryRun: false, minRows: 20 };
for (const a of process.argv.slice(2)) {
  if (a.startsWith("--date=")) args.date = a.slice(7);
  else if (a === "--backfill") args.backfill = true;
  else if (a === "--dry-run") args.dryRun = true;
  else if (a.startsWith("--min-rows=")) args.minRows = Number(a.slice(11));
  else if (a === "--help" || a === "-h") { console.log("See the header of scripts/unlisted-snapshot.mjs."); process.exit(0); }
  else { console.error(`Unknown flag ${a}`); process.exit(1); }
}
if (!args.backfill && !args.date) { console.error("Pass --date=YYYY-MM-DD (the price import's asOfDate) or --backfill."); process.exit(1); }
if (args.date && !isIsoDate(args.date)) { console.error(`--date must be zero-padded YYYY-MM-DD, got "${args.date}".`); process.exit(1); }

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const env = requireSanityEnv({ write: false });

// Full documents, so the confidentiality check sees every key that exists.
const shares = await sanityQuery(env, `*[_type == "unlistedShare" && !(_id in path("drafts.**"))]{ ..., "slug": slug.current, "logo": null }`);
const funds = await sanityQuery(env, `*[_type == "unlistedFundamentals" && !(_id in path("drafts.**"))]`);
assertNoConfidentialKeys(shares, "Sanity unlistedShare documents");
assertNoConfidentialKeys(funds, "Sanity unlistedFundamentals documents");

const { dates, ignored, counts } = importDates(shares, args.minRows);
if (ignored.length) console.log(`Ignoring dates with < ${args.minRows} rows (not a monthly import): ${ignored.map(([d, n]) => `${d} (${n})`).join(", ")}`);

let targets;
if (args.backfill) targets = latestPerMonth(dates);
else if (!dates.includes(args.date)) {
  console.error(`No price import with asOfDate ${args.date}. Imports: ${dates.map((d) => `${d} (${counts[d]})`).join(", ") || "none"}`);
  process.exit(1);
} else targets = [args.date];

const visible = shares.filter((s) => s.isActive !== false && s.needsReview !== true);
const fundByShare = new Map(funds.map((f) => [f.share?._ref, f]));

const previousSnapshot = (month) => {
  if (!existsSync(OUT_DIR)) return null;
  const prior = readdirSync(OUT_DIR).filter((f) => /^\d{4}-\d{2}\.json$/.test(f) && f.slice(0, 7) < month).sort();
  return prior.length ? JSON.parse(readFileSync(join(OUT_DIR, prior[prior.length - 1]), "utf8")) : null;
};

const yearOut = (y) => ({
  fyEnd: y.fyEnd, revenueCr: y.revenueCr ?? null, ebitdaCr: y.ebitdaCr ?? null, patCr: y.patCr ?? null,
  operatingCashFlowCr: y.ocfCr ?? null, netWorthCr: y.netWorthCr ?? null, totalDebtCr: y.totalDebtCr ?? null,
  cashCr: y.cashCr ?? null, sharesOutstanding: y.sharesOutstanding ?? null, auditor: y.auditor ?? null,
  auditQualified: y.auditQualified ?? null, auditQualificationNote: y.auditQualificationNote ?? null,
  source: y.source ?? null, sourceDate: y.sourceDate ?? null,
});

if (!args.dryRun) mkdirSync(OUT_DIR, { recursive: true });

for (const date of targets) {
  const month = monthOf(date);
  const cutoff = monthEnd(month);
  const prev = previousSnapshot(month);
  const prevBySlug = prev ? new Map(prev.companies.map((c) => [c.slug, c])) : null;

  const companies = [];
  for (const s of visible) {
    const price = retailPriceOn(s, date);
    const f = fundByShare.get(s._id) ?? null;
    // Only what was known by the end of this month.
    const years = (f?.years ?? []).filter((y) => isIsoDate(y.fyEnd) && (!y.importedAt || y.importedAt <= cutoff)).sort((a, b) => a.fyEnd.localeCompare(b.fyEnd));
    if (price === null && !years.length) continue;

    const { fy, metrics, notes } = computeMetrics(years, price, config);
    const drhp = drhpAsOf(f, cutoff);
    const rec = {
      slug: s.slug,
      name: s.company,
      cin: f?.cin ?? null,
      sector: f?.sector ?? s.sector ?? null,
      retailPriceINR: price,
      priceAsOfDate: price !== null ? date : null,
      priceSource: price !== null ? SOURCE_PRICE : null,
      fundamentalsAvailable: years.length > 0,
      latestFy: fy,
      years: years.map(yearOut),
      metrics,
      metricNotes: notes,
      scorecard: scorecard(metrics, notes, drhp, config),
      drhp,
      listedPeers: f?.listedPeers ?? [],
      notableInvestors: f?.notableInvestors ?? [],
    };
    rec.changesThisMonth = changesSince(prevBySlug ? prevBySlug.get(s.slug) ?? null : undefined, rec);
    companies.push(rec);
  }
  companies.sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const snapshot = {
    month,
    priceAsOfDate: date,
    changesComparedWith: prev ? prev.month : null,
    disclaimer:
      "Educational data, not a recommendation. Companies are listed alphabetically. Each scorecard factor is shown on its own " +
      "with its number and rule; factors are never combined into a score or ranking. Price momentum is not used: the retail " +
      "(indicative) price is used only to calculate market cap, P/E, P/B and EV/Sales.",
    notes: [
      "Money figures are ₹ crore; shares outstanding is an absolute count.",
      "Growth over 1 year is year-on-year; 3-year growth is an annualised CAGR. Margin trends are in percentage points.",
      "netCashCr: positive = net cash, negative = net debt. Cash conversion = operating cash flow / PAT.",
      "Valuation uses the latest FY's shares outstanding (see metrics.sharesAsOfFy); later bonus issues or splits are not reflected.",
      "null means not available; metricNotes and each scorecard factor's reason say why.",
      "changesThisMonth is null for the first snapshot (nothing to compare with).",
      "notableInvestors and listedPeers are context only and never scored.",
    ],
    scorecardThresholds: Object.fromEntries(Object.entries(config).filter(([k]) => !k.startsWith("_"))),
    totals: {
      companies: companies.length,
      withFundamentals: companies.filter((c) => c.fundamentalsAvailable).length,
      withRetailPrice: companies.filter((c) => c.retailPriceINR !== null).length,
      withChanges: companies.filter((c) => c.changesThisMonth?.length).length,
    },
    companies,
  };

  assertNoConfidentialKeys(snapshot, `snapshot ${month}`);
  const json = JSON.stringify(snapshot, null, 2) + "\n";
  assertNoConfidentialText(json, `snapshot ${month}`);

  console.log(`${month}: price ${date}; ${snapshot.totals.companies} companies, ${snapshot.totals.withFundamentals} with fundamentals, ` +
    `${snapshot.totals.withChanges} with changes; compared with ${snapshot.changesComparedWith ?? "nothing (first snapshot)"}`);
  if (!args.dryRun) writeFileSync(join(OUT_DIR, `${month}.json`), json);
}

if (!args.dryRun) {
  const months = readdirSync(OUT_DIR).filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).sort();
  if (months.length) {
    writeFileSync(join(OUT_DIR, "latest.json"), readFileSync(join(OUT_DIR, months[months.length - 1])));
    console.log(`latest.json → ${months[months.length - 1]}`);
  }
}
