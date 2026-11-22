#!/usr/bin/env node
/**
 * Monthly unlisted-shares snapshot for the newsletter.
 *
 *   npm run unlisted:snapshot -- --date=YYYY-MM-DD     one month (that import's asOfDate)
 *   npm run unlisted:snapshot -- --backfill            every past month with an import
 *   add --dry-run to print the summary and write nothing
 *
 * Read-only against Sanity. Writes, per month:
 *   data/unlisted-snapshots/YYYY-MM.json
 *   data/unlisted-snapshots/YYYY-MM.csv
 *   data/unlisted-snapshots/latest.json   (always the NEWEST month on disk)
 *
 * Imports are identified by asOfDate (a date carried in ≥20 documents'
 * priceHistory), never by company name. The month's "previous" figures come
 * from the latest import in an EARLIER calendar month.
 *
 * Only site-visible companies (isActive, not needsReview) are included.
 *
 * CONFIDENTIALITY: RETAIL/indicative price only. The run aborts before writing
 * if any confidential-looking key appears in the Sanity documents or the rows.
 *
 * Enquiry counts: per company, per IST calendar month, from Supabase
 * public.leads (source = 'unlisted-page') via the count-only RPC
 * public.unlisted_enquiry_counts() — no names, emails or phones are ever read.
 * Needs NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local;
 * without them (or before the RPC exists) enquiries are written as null and
 * the file says so.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadDotEnvLocal, requireSanityEnv, sanityQuery } from "./import-shared.mjs";
import {
  DEFAULT_MIN_ROWS, SOURCE, assertNoConfidentialKeys, buildRows, importDates, isIsoDate,
  istMonthWindow, latestPerMonth, monthOf, previousImportDate, toCsv, validateRows,
} from "./unlisted-snapshot-lib.mjs";

const OUT_DIR = join(process.cwd(), "data", "unlisted-snapshots");

// ---------- args ----------
const args = { date: null, backfill: false, dryRun: false, minRows: DEFAULT_MIN_ROWS };
for (const a of process.argv.slice(2)) {
  if (a.startsWith("--date=")) args.date = a.slice(7);
  else if (a === "--backfill") args.backfill = true;
  else if (a === "--dry-run") args.dryRun = true;
  else if (a.startsWith("--min-rows=")) args.minRows = Number(a.slice(11));
  else if (a === "--help" || a === "-h") { console.log("See the header of scripts/unlisted-snapshot.mjs."); process.exit(0); }
  else { console.error(`Unknown flag ${a}`); process.exit(1); }
}
if (!args.backfill && !args.date) { console.error("Pass --date=YYYY-MM-DD (the import's asOfDate) or --backfill."); process.exit(1); }
if (args.date && !isIsoDate(args.date)) { console.error(`--date must be zero-padded YYYY-MM-DD, got "${args.date}".`); process.exit(1); }

loadDotEnvLocal();
const env = requireSanityEnv({ write: false });

// ---------- read Sanity (full documents, so the confidentiality check sees every key) ----------
const raw = await sanityQuery(env, `*[_type == "unlistedShare" && !(_id in path("drafts.**"))]{ ..., "slug": slug.current, "logo": null }`);
assertNoConfidentialKeys(raw, "Sanity unlistedShare documents");

const { dates, ignored, counts } = importDates(raw, args.minRows);
if (ignored.length) {
  console.log(`Ignoring dates with fewer than ${args.minRows} rows (not a monthly import): ${ignored.map(([d, n]) => `${d} (${n})`).join(", ")}`);
}

let targets;
if (args.backfill) targets = latestPerMonth(dates);
else {
  if (!dates.includes(args.date)) {
    console.error(`No import with asOfDate ${args.date}. Imports found: ${dates.map((d) => `${d} (${counts[d]})`).join(", ") || "none"}`);
    process.exit(1);
  }
  targets = [args.date];
}

const visible = raw.filter((d) => d.isActive !== false && d.needsReview !== true);

// ---------- enquiries (counts only) ----------
// public.leads went live in production in Nov 2026; earlier months have no
// enquiry data, and reporting 0 for them would be false.
const ENQUIRIES_FROM_MONTH = "2026-11";

async function enquiryCounts(month) {
  if (month < ENQUIRIES_FROM_MONTH) return { map: null, note: `enquiry capture started ${ENQUIRIES_FROM_MONTH}` };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { map: null, note: "Supabase env vars not set; enquiries unavailable" };
  const { start, end } = istMonthWindow(month);
  try {
    const res = await fetch(`${url}/rest/v1/rpc/unlisted_enquiry_counts`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_start: start, p_end: end }),
    });
    if (!res.ok) return { map: null, note: `enquiry count RPC unavailable (HTTP ${res.status})` };
    const data = await res.json();
    const map = new Map();
    for (const r of data) {
      const k = String(r.strategy ?? "").trim().toLowerCase();
      map.set(k, (map.get(k) ?? 0) + Number(r.n || 0));
    }
    return { map, note: null, window: { start, end } };
  } catch (err) {
    return { map: null, note: `enquiry count request failed (${err?.code ?? err?.name ?? "error"})` };
  }
}

// ---------- build + write ----------
if (!args.dryRun) mkdirSync(OUT_DIR, { recursive: true });

for (const date of targets) {
  const month = monthOf(date);
  const prevDate = previousImportDate(dates, date);
  const enq = await enquiryCounts(month);
  const rows = validateRows(buildRows(visible, date, prevDate, enq.map));

  let unmatched = null;
  if (enq.map) {
    const names = new Set(rows.map((r) => String(r.name).trim().toLowerCase()));
    unmatched = [...enq.map.entries()].filter(([k]) => !names.has(k)).reduce((s, [, n]) => s + n, 0);
  }

  const snapshot = {
    month,
    asOfDate: date,
    previousAsOfDate: prevDate,
    source: SOURCE,
    priceBasis: "Retail/indicative price per share, INR. Indicative only, not an offer.",
    notes: [
      "pctChange is absolute change vs previousAsOfDate, not annualised.",
      `pctChange outside ${-95}%..+300% is withheld (null) and flagged "implausible".`,
      "lotSize is the current minimum lot; minInvestmentINR = retail price x lotSize.",
      "listing: new / dropped / continuing vs previousAsOfDate (null for the first snapshot).",
    ],
    enquiries: enq.map
      ? { available: true, basis: "Enquiry-form submissions per company, IST calendar month. Counts only.", window: enq.window, unmatched }
      : { available: false, reason: enq.note },
    totals: {
      companies: rows.filter((r) => r.retailPriceINR !== null).length,
      new: rows.filter((r) => r.listing === "new").length,
      dropped: rows.filter((r) => r.listing === "dropped").length,
      withChange: rows.filter((r) => r.pctChange !== null).length,
      implausibleWithheld: rows.filter((r) => r.pctChangeFlag === "implausible").length,
    },
    rows,
  };

  const json = JSON.stringify(snapshot, null, 2) + "\n";
  const csv = toCsv(rows);
  // Belt and braces: scan the serialised output, not just the object keys.
  for (const [label, text] of [["json", json], ["csv", csv]]) {
    if (/dealer/i.test(text)) throw new Error(`Confidential term found in ${month}.${label}. Aborting; nothing written.`);
  }

  console.log(
    `${month}: asOfDate ${date}, previous ${prevDate ?? "none"} — ${snapshot.totals.companies} priced, ` +
    `${snapshot.totals.new} new, ${snapshot.totals.dropped} dropped, ${snapshot.totals.implausibleWithheld} implausible withheld; ` +
    `enquiries ${enq.map ? `available (unmatched ${unmatched})` : `unavailable: ${enq.note}`}`,
  );
  if (args.dryRun) continue;
  writeFileSync(join(OUT_DIR, `${month}.json`), json);
  writeFileSync(join(OUT_DIR, `${month}.csv`), csv);
}

// latest.json = newest month on disk, whatever order the runs happened in.
if (!args.dryRun) {
  const months = readdirSync(OUT_DIR).filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).sort();
  if (months.length) {
    const newest = months[months.length - 1];
    writeFileSync(join(OUT_DIR, "latest.json"), readFileSync(join(OUT_DIR, newest)));
    console.log(`latest.json → ${newest}`);
  }
}
