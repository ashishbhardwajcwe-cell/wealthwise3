/**
 * fetch-apmi-pms.mjs — Pull the full PMS universe from APMI's official IA Performance
 * endpoint and write scripts/pms-data.csv, sourced from APMI (not any aggregator).
 *
 * Data source: APMI (apmiindia.org) — the free, SEBI-mandated monthly disclosure.
 * It replays the exact POST the IA Performance page makes (action=loadIAReport),
 * once per strategy type × service type, parses the returned HTML table, and writes CSV.
 *
 * Node 18+ only (uses global fetch). No dependencies. Run from anywhere:
 *    node fetch-apmi-pms.mjs 6 2026            # month=6, year=2026  → writes pms-data.csv
 *    node fetch-apmi-pms.mjs 6 2026 --probe    # DIAGNOSTIC: fetch one combo, print sample, write nothing
 *    node fetch-apmi-pms.mjs 6 2026 --out ../wealthwise3/scripts/pms-data.csv
 *
 * IMPORTANT: run with --probe FIRST and send the output back, so the parser can be
 * verified against APMI's real HTML before trusting the numbers.
 */

const ENDPOINT = "https://www.apmiindia.org/apmi/welcomeiaperformance.htm?action=loadIAReport";
const REFERER  = "https://www.apmiindia.org/apmi/welcomeiaperformance.htm?action=PMSmenu";

// ---- args ----
const args = process.argv.slice(2);
const month = args[0] || "6";
const year  = args[1] || "2026";
const probe = args.includes("--probe");
const outIdx = args.indexOf("--out");
const OUT = outIdx !== -1 ? args[outIdx + 1] : "pms-data.csv";
const asOnDate = `${year}-${Number(month)}-30`;              // e.g. 2026-6-30 (APMI uses month-end)
const monthName = ["", "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(month)] || month;
const SOURCE = `APMI monthly report ${monthName} ${year}`;

// APMI's four strategy tabs × two service types. servicetype: D = Discretionary, N = Non-Discretionary.
const STRATEGIES = ["Equity", "Debt", "Hybrid", "Multi Asset"];
const SERVICE_TYPES = ["D", "N"];

// ---- category mapping: APMI/industry labels -> your allowed Sanity values ----
// Allowed in your schema: Multicap, Largecap, Midcap, Smallcap, Thematic, Quant, Hybrid
function mapCategory(strategyName) {
  const s = (strategyName || "").toLowerCase();
  if (s.includes("debt")) return "Hybrid";        // no debt category in your set; closest bucket (adjust later if you add one)
  if (s.includes("hybrid") || s.includes("multi asset") || s.includes("multiasset")) return "Hybrid";
  return "";  // equity rows: category left blank here (APMI's per-IA category isn't in this table); fill later if desired
}

async function fetchCombo(strategyname, servicetype) {
  const body = new URLSearchParams();
  body.append("strategyname", strategyname);
  body.append("servicetype", servicetype);
  body.append("", "");           // the two empty filter fields (provider / IA)
  body.append("", "");
  body.append("fromMonth", String(Number(month)));
  body.append("fromYears", String(year));
  body.append("asOnDate", asOnDate);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "text/html,application/xhtml+xml,*/*",
      "Origin": "https://www.apmiindia.org",
      "Referer": REFERER,
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${strategyname}/${servicetype}`);
  return await res.text();
}

// ---- very small HTML table parser (no deps) ----
function stripTags(s) {
  return s.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
          .replace(/&#8377;|₹/g, "").replace(/&[a-z]+;/gi, " ").trim();
}

function cleanIaName(s) {
  if (!s) return "";
  // APMI cells look like:  NAME--><newline+spaces>NAME  → drop everything up to and incl. "-->"
  let t = s.includes("-->") ? s.slice(s.lastIndexOf("-->") + 3) : s;
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function parseRows(html) {
  // grab every <tr>…</tr>, then the <td> cells inside
  const rows = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html)) !== null) {
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    const cells = [];
    let c;
    while ((c = cellRe.exec(m[1])) !== null) cells.push(stripTags(c[1]));
    if (cells.length) rows.push(cells);
  }
  return rows;
}

// numeric cleaner: "12.5%" / "₹1,234" / "NA" / "" -> "12.5" / "1234" / "" 
function num(v) {
  if (v == null) return "";
  const t = String(v).replace(/[₹,%\s]/g, "");
  if (t === "" || /^NA$|^ND$|^-+$/i.test(t)) return "";
  return t;
}

// Expected APMI column order (from your screenshots):
// [PMS Provider Name, IA Name, AUM (in INR Cr.), 1 Month, 3 Months, 6 Months, 1 Year, 2 Years, 3 Years, 4 Years, 5 Years, Since Inception]
function rowToRecord(cells) {
  if (cells.length < 13) return null;                 // header/subtotal/short rows -> skip
  // APMI order: Provider, IA, AUM, 1M, 3M, 6M, 9M, 1Y, 2Y, 3Y, 4Y, 5Y, SI
  const [provider, ia, aum, m1, m3, m6, m9, y1, y2, y3, y4, y5, si] = cells;
  if (!provider || !ia || /PMS Provider Name/i.test(provider)) return null; // skip header row
  return { provider: cleanIaName(provider), ia: cleanIaName(ia),
    aumCr: num(aum), m1: num(m1), m3: num(m3), m6: num(m6), m9: num(m9),
    y1: num(y1), y2: num(y2), y3: num(y3), y4: num(y4), y5: num(y5), si: num(si) };
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  if (probe) {
    console.log(`PROBE: fetching Equity / D for ${monthName} ${year} …`);
    const html = await fetchCombo("Equity", "D");
    console.log("Response length:", html.length);
    const rows = parseRows(html);
    console.log("Parsed <tr> rows:", rows.length);
    console.log("\n=== FIRST 3 RAW ROWS (cells) ===");
    rows.slice(0, 6).forEach((r, i) => console.log(i, JSON.stringify(r)));
    console.log("\n=== FIRST 5 RECORDS (mapped) ===");
    let shown = 0;
    for (const r of rows) { const rec = rowToRecord(r); if (rec) { console.log(JSON.stringify(rec)); if (++shown >= 5) break; } }
    console.log("\nIf the records above show provider, IA and the period numbers correctly, we're good — re-run without --probe.");
    return;
  }

  const header = ["strategyName","manager","category","aumCr","minInvestmentL",
    "returns1m","returns3m","returns6m","returns9m","returns1y","returns2y","returns3y","returns4y","returns5y",
    "sinceInception","feesFixed","feesPerformance","feesHurdle","asOfDate","source","notes"];
  const lines = [header.join(",")];
  const seen = new Set();
  let total = 0;

  for (const st of STRATEGIES) {
    for (const svc of SERVICE_TYPES) {
      let html;
      try { html = await fetchCombo(st, svc); }
      catch (e) { console.error(`  ! ${st}/${svc}: ${e.message}`); continue; }
      const recs = parseRows(html).map(rowToRecord).filter(Boolean);
      let added = 0;
      for (const r of recs) {
        const key = `${r.provider}|||${r.ia}`;
        if (seen.has(key)) continue;         // de-dupe across combos
        seen.add(key);
        const row = [ r.ia, r.provider, mapCategory(st + " " + r.ia), r.aumCr, "50",
          r.m1, r.m3, r.m6, r.m9, r.y1, r.y2, r.y3, r.y4, r.y5, r.si, "", "", "",
          asOnDate, SOURCE, "" ];
        lines.push(row.map(csvEscape).join(","));
        added++; total++;
      }
      console.log(`  ${st} / ${svc}: ${added} strategies`);
    }
  }

  const { writeFileSync } = await import("node:fs");
  writeFileSync(OUT, lines.join("\n") + "\n", "utf8");
  console.log(`\n✓ Wrote ${total} strategies to ${OUT}  (as on ${asOnDate}, source: ${SOURCE})`);
  console.log(`Next: review the file, then run  npm run import:pms -- scripts/pms-data.csv`);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
