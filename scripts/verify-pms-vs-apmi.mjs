#!/usr/bin/env node
/**
 * Check every PMS strategy on the portal against APMI's own table, after the
 * monthly import.
 *
 *   node scripts/verify-pms-vs-apmi.mjs 10 2026
 *
 * Reads APMI live (same request as scripts/fetch-apmi-pms.mjs, columns mapped
 * by header label) and the published pmsStrategy documents in Sanity (public
 * read, no token). Writes nothing. Reports:
 *
 *   MISSING    APMI publishes a figure for a window, the portal shows none.
 *              This is the "1M/3M/6M blank on the site but on APMI" case.
 *   MISMATCH   both have a figure and they differ.
 *   NOT ON PORTAL  APMI lists the strategy, no document carries its exact name
 *              — a late filer added after the fetch, or a rename that needs a
 *              pin in scripts/pms-pins.json.
 *   STALE      a document APMI did not report this month. It still renders with
 *              an older as-on date (and its alpha is computed against the
 *              CURRENT benchmark), so review it.
 *
 * A blank shown on the portal where APMI itself says NA is correct and is not
 * reported: young strategies have no 6M/1Y figure yet.
 *
 * Exit code 1 when anything is MISSING, MISMATCHED or NOT ON PORTAL.
 */

import { requireSanityEnv, sanityQuery, monthEndIso, lastDayOfMonth } from "./import-shared.mjs";
import { parseIaReportHtml, fetchIaReport, STRATEGIES, SERVICE_TYPES, RETURN_KEYS } from "./apmi-html.mjs";

const [month, year] = process.argv.slice(2);
if (!(Number(month) >= 1 && Number(month) <= 12) || !/^\d{4}$/.test(String(year))) {
  console.error("Usage: node scripts/verify-pms-vs-apmi.mjs <month> <year>   e.g. 10 2026");
  process.exit(1);
}
const asOf = monthEndIso(year, month);
const asOnDate = `${year}-${Number(month)}-${lastDayOfMonth(year, month)}`;
const LABEL = { m1: "1M", m3: "3M", m6: "6M", y1: "1Y", y2: "2Y", y3: "3Y", y4: "4Y", y5: "5Y", si: "SI" };
const key = (manager, name) => `${manager}|||${name}`;

/* ---------- APMI ---------- */
const apmi = new Map();
for (const st of STRATEGIES) for (const svc of SERVICE_TYPES) {
  const { records, errors } = parseIaReportHtml(await fetchIaReport(st, svc, { month, year, asOnDate }));
  if (errors.length) {
    console.error(`APMI ${st}/${svc} could not be read safely:\n  ${errors.slice(0, 5).join("\n  ")}`);
    process.exit(1);
  }
  for (const r of records) if (!apmi.has(key(r.provider, r.ia))) apmi.set(key(r.provider, r.ia), r);
}

/* ---------- portal (Sanity) ---------- */
const env = requireSanityEnv({ write: false });
const docs = await sanityQuery(env, `*[_type=="pmsStrategy" && !(_id in path("drafts.**"))]{_id, manager, strategyName, asOfDate, returns}`);
const docsByKey = new Map(docs.map((d) => [key(d.manager, d.strategyName), d]));
const sanityValue = (d, k) => {
  const v = k === "si" ? d.returns?.sinceInception : d.returns?.[k];
  return typeof v === "number" ? v : null;
};

const missing = [], mismatch = [], notOnPortal = [];
const missingByWindow = {};
for (const [k, a] of apmi) {
  const d = docsByKey.get(k);
  if (!d) { notOnPortal.push(a); continue; }
  for (const w of RETURN_KEYS) {
    const av = a[w] === "" ? null : Number(a[w]);
    const sv = sanityValue(d, w);
    if (av !== null && sv === null) { missing.push({ a, w, av }); missingByWindow[LABEL[w]] = (missingByWindow[LABEL[w]] ?? 0) + 1; }
    else if (av !== null && Math.abs(av - sv) > 0.005) mismatch.push({ a, w, av, sv });
  }
}
const stale = docs.filter((d) => !apmi.has(key(d.manager, d.strategyName)));
const staleByDate = {};
for (const d of stale) staleByDate[d.asOfDate] = (staleByDate[d.asOfDate] ?? 0) + 1;

/* ---------- report ---------- */
const name = (a) => `${a.provider} — ${a.ia}`;
console.log(`APMI ${asOf}: ${apmi.size} strategies · portal: ${docs.length} documents`);
console.log(`  matched by exact name   ${apmi.size - notOnPortal.length}`);
console.log(`  MISSING figures         ${missing.length}${missing.length ? `  ${JSON.stringify(missingByWindow)}` : ""}`);
console.log(`  MISMATCHED figures      ${mismatch.length}`);
console.log(`  NOT ON PORTAL           ${notOnPortal.length}`);
console.log(`  STALE documents         ${stale.length}  ${JSON.stringify(staleByDate)}`);

if (missing.length) {
  console.log("\nMISSING — APMI has a figure, the portal shows none:");
  for (const m of missing.slice(0, 40)) console.log(`  • ${name(m.a)}  ${LABEL[m.w]} = ${m.av}`);
}
if (mismatch.length) {
  console.log("\nMISMATCH — APMI vs portal:");
  for (const m of mismatch.slice(0, 40)) console.log(`  • ${name(m.a)}  ${LABEL[m.w]}: APMI ${m.av} · portal ${m.sv}`);
}
if (notOnPortal.length) {
  console.log("\nNOT ON PORTAL — re-fetch and re-import; a rename needs a pin (scripts/pms-pins.json):");
  for (const a of notOnPortal) console.log(`  • ${name(a)}`);
}
if (stale.length) {
  console.log(`\nSTALE — not in APMI's ${asOf} table (first 15; full list with --stale):`);
  for (const d of (process.argv.includes("--stale") ? stale : stale.slice(0, 15))) console.log(`  • [${d.asOfDate}] ${d.manager} — ${d.strategyName}`);
}
const bad = missing.length + mismatch.length + notOnPortal.length;
console.log(bad ? `\n✗ ${bad} problem(s) — the portal does not match APMI.` : "\n✓ Every APMI figure is on the portal.");
process.exit(bad ? 1 : 0);
