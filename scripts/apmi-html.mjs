/**
 * Parser for the HTML table APMI's IA Performance endpoint returns
 * (welcomeiaperformance.htm?action=loadIAReport), shared by
 * scripts/fetch-apmi-pms.mjs (writes the monthly CSV) and
 * scripts/verify-pms-vs-apmi.mjs (checks the live data against APMI).
 *
 * Columns are found by their HEADER LABEL, never by position. APMI's table
 * carries a "9 Months" column that is currently commented out in the HTML
 * (`<!-- <th>9 Months</th> -->`) and absent from the data rows. The old
 * positional reader assumed exactly that layout — the day APMI re-enables the
 * column, every figure from 1Y onwards would have slid one column to the left
 * without a single error. HTML comments are stripped before parsing, and a
 * header we can't map stops the run instead of producing a shifted CSV.
 */

const ENDPOINT = "https://www.apmiindia.org/apmi/welcomeiaperformance.htm?action=loadIAReport";
const REFERER = "https://www.apmiindia.org/apmi/welcomeiaperformance.htm?action=PMSmenu";
/** The strategy × service-type combinations that together make up the universe. */
export const STRATEGIES = ["Equity", "Debt", "Hybrid", "Multi Asset"];
export const SERVICE_TYPES = ["D", "N"];

/** POST one combo to APMI and return the raw HTML. */
export async function fetchIaReport(strategyname, servicetype, { month, year, asOnDate }) {
  const body = new URLSearchParams();
  body.append("strategyname", strategyname); body.append("servicetype", servicetype);
  body.append("", ""); body.append("", "");
  body.append("fromMonth", String(Number(month))); body.append("fromYears", String(year)); body.append("asOnDate", asOnDate);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", Accept: "text/html,*/*",
      Origin: "https://www.apmiindia.org", Referer: REFERER,
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${strategyname}/${servicetype}`);
  return res.text();
}

const COLUMNS = {
  provider: /^pms provider/i,
  ia: /^ia name/i,
  aumCr: /^aum/i,
  m1: /^1 month/i,
  m3: /^3 months?/i,
  m6: /^6 months?/i,
  y1: /^1 year/i,
  y2: /^2 years?/i,
  y3: /^3 years?/i,
  y4: /^4 years?/i,
  y5: /^5 years?/i,
  si: /^since\s*inception/i,
};
export const RETURN_KEYS = ["m1", "m3", "m6", "y1", "y2", "y3", "y4", "y5", "si"];

const stripTags = (s) =>
  s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&#8377;|₹/g, "").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();

/** APMI prefixes some names with a breadcrumb ending in "-->". */
export const cleanName = (s) => {
  if (!s) return "";
  const t = s.includes("-->") ? s.slice(s.lastIndexOf("-->") + 3) : s;
  return t.replace(/\s+/g, " ").trim();
};

/** "12.34" → "12.34"; NA / ND / "-" / blank → "" (no figure). Kept as text for the CSV. */
export const cellValue = (v) => {
  const t = String(v ?? "").replace(/[₹,%\s]/g, "");
  if (t === "" || /^(NA|ND|-+)$/i.test(t)) return "";
  return t;
};

/**
 * Parse one loadIAReport response.
 * Returns { records, header, errors }. `errors` non-empty means the table
 * could not be read safely and the caller must stop.
 */
export function parseIaReportHtml(html) {
  const clean = String(html ?? "").replace(/<!--[\s\S]*?-->/g, "");
  const rows = [];
  for (const m of clean.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...m[1].matchAll(/<t([dh])[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => ({ th: c[1].toLowerCase() === "h", text: stripTags(c[2]) }));
    if (cells.length) rows.push(cells);
  }
  const headerRow = rows.find((r) => r.some((c) => COLUMNS.provider.test(c.text)));
  if (!headerRow) return { records: [], header: [], errors: rows.length ? ["no header row with \"PMS Provider Name\""] : [] };

  const header = headerRow.map((c) => c.text);
  const errors = [];
  const idx = {};
  for (const [key, re] of Object.entries(COLUMNS)) {
    const hits = header.map((h, i) => (re.test(h) ? i : -1)).filter((i) => i >= 0);
    if (hits.length !== 1) errors.push(`column ${key} matched ${hits.length} header cells (${re}) in: ${header.join(" | ")}`);
    else idx[key] = hits[0];
  }
  if (errors.length) return { records: [], header, errors };

  const records = [];
  for (const r of rows) {
    if (r === headerRow || r.every((c) => c.th)) continue;
    if (r.length !== header.length) {
      if (r.length > 2) errors.push(`row has ${r.length} cells, header has ${header.length}: ${r.slice(0, 2).map((c) => c.text).join(" — ")}`);
      continue;
    }
    const get = (k) => r[idx[k]].text;
    const provider = cleanName(get("provider"));
    const ia = cleanName(get("ia"));
    if (!provider || !ia) continue;
    const rec = { provider, ia, aumCr: cellValue(get("aumCr")) };
    for (const k of RETURN_KEYS) rec[k] = cellValue(get(k));
    records.push(rec);
  }
  return { records, header, errors };
}
