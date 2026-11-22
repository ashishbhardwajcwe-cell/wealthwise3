/**
 * Pure logic for unlisted-share FUNDAMENTALS: CSV validation, metrics,
 * scorecard, valuation and month-on-month change detection. No network, no I/O.
 *
 * Used by:
 *   scripts/import-unlisted-fundamentals.mjs  (CSV → Sanity)
 *   scripts/unlisted-snapshot.mjs              (Sanity → data/unlisted-snapshots)
 *   scripts/check-confidential.mjs             (repo guard)
 * Tested by scripts/unlisted-fundamentals.test.mjs.
 *
 * Principles (do not erode):
 *  - Price momentum is never an input. The RETAIL price is used only to turn
 *    fundamentals into valuation multiples.
 *  - Scorecard factors are shown individually. Nothing here sums, weights or
 *    ranks them — it is not a buy signal.
 *  - Missing data is null + a reason ("not available"), never 0 or a guess.
 *  - CONFIDENTIALITY: only the retail price exists in this pipeline. Any key or
 *    column that looks like a dealer/cost/buy price aborts the run.
 */

// ───────────────────────── confidentiality ─────────────────────────

/** Keys/columns that must never appear anywhere in this pipeline. */
export const CONFIDENTIAL_KEY_RE = /dealer|cost|buy|purchase|wholesale|margin_?price|landed|partner_?price/i;
/** Free-text scan for written files. */
export const CONFIDENTIAL_TEXT_RE = /dealer/i;

/** Recursively throw if any object key looks confidential. Prints the path, never the value. */
export function assertNoConfidentialKeys(value, where = "input", path = "") {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoConfidentialKeys(v, where, `${path}[${i}]`));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (CONFIDENTIAL_KEY_RE.test(k)) {
        throw new Error(`CONFIDENTIAL field "${path}.${k}" found in ${where}. Aborting; nothing written.`);
      }
      assertNoConfidentialKeys(v, where, `${path}.${k}`);
    }
  }
}

export function assertNoConfidentialText(text, where) {
  if (CONFIDENTIAL_TEXT_RE.test(text)) {
    throw new Error(`Confidential term found in ${where}. Aborting; nothing written.`);
  }
}

// ───────────────────────── dates ─────────────────────────

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isIsoDate = (s) =>
  typeof s === "string" && ISO_RE.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
export const monthOf = (iso) => iso.slice(0, 7);
const days = (a, b) => (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000;
export const monthEnd = (month) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

// ───────────────────────── CSV template + validation ─────────────────────────

/** Template columns → internal field. Headers are matched tolerantly
 *  (case, spaces, punctuation ignored), never by position. */
export const COLUMNS = {
  slug: "slug",
  cin: "cin",
  fy_end: "fyEnd",
  revenue_cr: "revenueCr",
  ebitda_cr: "ebitdaCr",
  pat_cr: "patCr",
  operating_cash_flow_cr: "ocfCr",
  net_worth_cr: "netWorthCr",
  total_debt_cr: "totalDebtCr",
  cash_cr: "cashCr",
  shares_outstanding: "sharesOutstanding",
  auditor: "auditor",
  audit_qualified: "auditQualified",
  audit_qualification_note: "auditQualificationNote",
  source: "source",
  source_date: "sourceDate",
  sector: "sector",
  drhp_status: "drhpStatus",
  drhp_filed_date: "drhpFiledDate",
  drhp_approved_date: "drhpApprovedDate",
  listed_peers: "listedPeers",
  notable_investors: "notableInvestors",
};
const normHeader = (h) => String(h).toLowerCase().replace(/[^a-z0-9]/g, "");
const HEADER_LOOKUP = new Map(Object.entries(COLUMNS).map(([col, f]) => [normHeader(col), f]));

export const YEAR_NUMBER_FIELDS = ["revenueCr", "ebitdaCr", "patCr", "ocfCr", "netWorthCr", "totalDebtCr", "cashCr", "sharesOutstanding"];
const NON_NEGATIVE = new Set(["revenueCr", "totalDebtCr", "cashCr"]);
const YEAR_FIELDS = [...YEAR_NUMBER_FIELDS, "auditor", "auditQualified", "auditQualificationNote", "source", "sourceDate"];
const COMPANY_FIELDS = ["sector", "drhpStatus", "drhpFiledDate", "drhpApprovedDate", "listedPeers", "notableInvestors"];

export const SOURCES = { mca: "MCA", tofler: "Tofler", drhp: "DRHP", annualreport: "Annual report" };
export const DRHP_STATUSES = ["none", "filed", "approved"];
export const CIN_RE = /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Map header row → field names. Throws on confidential, price or unknown columns. */
export function mapHeaders(headers) {
  const fields = [];
  const seen = new Set();
  for (const h of headers) {
    const raw = String(h).trim();
    if (CONFIDENTIAL_KEY_RE.test(raw)) throw new Error(`CONFIDENTIAL column "${raw}" in CSV. Aborting; nothing imported.`);
    if (/price/i.test(raw)) throw new Error(`Column "${raw}": prices never come from this CSV (the retail price is read from Sanity).`);
    const f = HEADER_LOOKUP.get(normHeader(raw));
    if (!f) throw new Error(`Unknown column "${raw}". Use the header from _templates/unlisted-fundamentals.csv.`);
    if (seen.has(f)) throw new Error(`Duplicate column "${raw}".`);
    seen.add(f);
    fields.push(f);
  }
  for (const required of ["slug", "cin", "fyEnd", "source", "sourceDate"]) {
    if (!seen.has(required)) throw new Error(`Missing column for "${required}".`);
  }
  return fields;
}

const parseNumber = (v, field) => {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const cleaned = s.replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) throw new Error(`${field}: "${s}" is not a number (₹ crore, no units)`);
  const n = Number(cleaned);
  if (NON_NEGATIVE.has(field) && n < 0) throw new Error(`${field}: must not be negative`);
  if (field === "sharesOutstanding" && (n <= 0 || !Number.isInteger(n))) throw new Error(`shares_outstanding: must be a positive whole number (absolute count, not crore)`);
  return n;
};
const parseList = (v) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s.split(";").map((x) => x.trim()).filter(Boolean);
};

/**
 * Validate parsed CSV rows (arrays, header first). Returns
 * { companies: [{ slug, cin, company: {...}, years: [...] }] } keyed by identity.
 * Throws an Error listing EVERY problem found, with row numbers.
 */
export function validateFundamentalsCsv(rows) {
  if (!rows.length) throw new Error("CSV is empty.");
  const fields = mapHeaders(rows[0]);
  const errors = [];
  const byKey = new Map();

  rows.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const r = {};
    fields.forEach((f, j) => { r[f] = String(cells[j] ?? "").trim(); });
    const err = (m) => errors.push(`row ${line}: ${m}`);

    const slug = r.slug || null;
    const cin = r.cin ? r.cin.toUpperCase() : null;
    if (!slug && !cin) return err("needs slug or cin (companies are never matched by name)");
    if (slug && !SLUG_RE.test(slug)) err(`slug "${slug}" is not a valid slug`);
    if (cin && !CIN_RE.test(cin)) err(`cin "${cin}" is not a valid 21-character CIN`);

    // ── company-level fields (blank = leave unchanged) ──
    const company = {};
    if (r.sector) company.sector = r.sector;
    if (r.drhpStatus) {
      const st = r.drhpStatus.toLowerCase();
      if (!DRHP_STATUSES.includes(st)) err(`drhp_status "${r.drhpStatus}" must be none/filed/approved`);
      company.drhpStatus = st;
    }
    for (const f of ["drhpFiledDate", "drhpApprovedDate"]) {
      if (r[f]) { if (!isIsoDate(r[f])) err(`${f}: "${r[f]}" must be zero-padded YYYY-MM-DD`); company[f] = r[f]; }
    }
    if (company.drhpStatus === "filed" && !company.drhpFiledDate) err("drhp_status filed needs drhp_filed_date");
    if (company.drhpStatus === "approved" && (!company.drhpFiledDate || !company.drhpApprovedDate)) err("drhp_status approved needs drhp_filed_date and drhp_approved_date");
    if (company.drhpFiledDate && company.drhpApprovedDate && company.drhpApprovedDate < company.drhpFiledDate) err("drhp_approved_date is before drhp_filed_date");
    if (company.drhpStatus === "none" && (company.drhpFiledDate || company.drhpApprovedDate)) err("drhp_status none cannot carry DRHP dates");
    const peers = parseList(r.listedPeers);
    if (peers) company.listedPeers = peers.map((p) => p.toUpperCase());
    const investors = parseList(r.notableInvestors);
    if (investors) company.notableInvestors = investors;

    // ── FY row ──
    let year = null;
    const hasYearData = YEAR_FIELDS.some((f) => r[f]);
    if (!r.fyEnd) {
      if (hasYearData) err("financial figures need fy_end");
    } else {
      if (!isIsoDate(r.fyEnd)) err(`fy_end "${r.fyEnd}" must be zero-padded YYYY-MM-DD`);
      year = { fyEnd: r.fyEnd };
      for (const f of YEAR_NUMBER_FIELDS) {
        try { year[f] = parseNumber(r[f], f); } catch (e) { err(e.message); }
      }
      if (YEAR_NUMBER_FIELDS.every((f) => year[f] === null || year[f] === undefined)) err("FY row has no figures");
      year.auditor = r.auditor || null;
      const q = (r.auditQualified || "").toLowerCase();
      if (q && !["yes", "no"].includes(q)) err(`audit_qualified "${r.auditQualified}" must be yes/no`);
      year.auditQualified = q === "yes" ? true : q === "no" ? false : null;
      year.auditQualificationNote = r.auditQualificationNote || null;
      if (year.auditQualified === true && !year.auditQualificationNote) err("audit_qualified yes needs audit_qualification_note");
      const src = SOURCES[normHeader(r.source || "")];
      if (!src) err(`source "${r.source}" must be MCA, Tofler, DRHP or Annual report`);
      year.source = src ?? null;
      if (!r.sourceDate) err("source_date is required for every FY row");
      else if (!isIsoDate(r.sourceDate)) err(`source_date "${r.sourceDate}" must be zero-padded YYYY-MM-DD`);
      else if (isIsoDate(r.fyEnd) && r.sourceDate < r.fyEnd) err("source_date is before fy_end");
      year.sourceDate = r.sourceDate || null;
    }
    if (!year && !Object.keys(company).length) return err("row has nothing to import");

    // ── group by identity ──
    const key = slug ? `slug:${slug}` : `cin:${cin}`;
    const g = byKey.get(key) ?? { slug, cin, company: {}, years: [], lines: [] };
    if (cin && g.cin && g.cin !== cin) err(`conflicting cin for ${key}`);
    g.cin = g.cin ?? cin;
    for (const [f, v] of Object.entries(company)) {
      if (g.company[f] !== undefined && JSON.stringify(g.company[f]) !== JSON.stringify(v)) err(`conflicting ${f} for ${key}`);
      g.company[f] = v;
    }
    if (year) {
      if (g.years.some((y) => y.fyEnd === year.fyEnd)) err(`duplicate fy_end ${year.fyEnd} for ${key}`);
      g.years.push(year);
    }
    g.lines.push(line);
    byKey.set(key, g);
  });

  if (errors.length) throw new Error(`CSV failed validation (${errors.length} problem${errors.length > 1 ? "s" : ""}):\n  ${errors.join("\n  ")}`);
  return { companies: [...byKey.values()] };
}

/** Sanity document id for a company's fundamentals, derived from the share's _id. */
export const fundamentalsDocId = (shareId) => `unlistedFundamentals-${String(shareId).replace(/[^A-Za-z0-9_-]/g, "-")}`;

const sameYear = (a, b) => YEAR_FIELDS.every((f) => (a[f] ?? null) === (b[f] ?? null));

/**
 * Merge validated CSV data into an existing fundamentals doc (or a new one).
 * Returns { doc, added, unchanged, restated: [{fyEnd, fields}], companyChanges }.
 * Restatements are applied only when allowRestatement is true — otherwise the
 * caller must refuse the import.
 */
export function mergeFundamentals(existing, share, incoming, { today, allowRestatement = false }) {
  const doc = existing
    ? Object.fromEntries(Object.entries(existing).filter(([k]) => !["_rev", "_createdAt", "_updatedAt"].includes(k)))
    : { _id: fundamentalsDocId(share._id), _type: "unlistedFundamentals" };
  doc.share = { _type: "reference", _ref: share._id, _weak: true };
  doc.slug = share.slug;
  doc.company = share.company;
  if (incoming.cin) {
    if (doc.cin && doc.cin !== incoming.cin) throw new Error(`${share.slug}: CIN ${incoming.cin} differs from stored ${doc.cin}. CIN is identity; fix it in Studio if the stored one is wrong.`);
    doc.cin = incoming.cin;
  }
  const companyChanges = [];
  for (const f of COMPANY_FIELDS) {
    if (incoming.company[f] === undefined) continue;
    if (JSON.stringify(doc[f] ?? null) !== JSON.stringify(incoming.company[f])) {
      companyChanges.push({ field: f, from: doc[f] ?? null, to: incoming.company[f] });
      doc[f] = incoming.company[f];
    }
  }
  // An explicit "none" withdraws the DRHP: clear its dates so drhpAsOf agrees.
  if (incoming.company.drhpStatus === "none") {
    for (const f of ["drhpFiledDate", "drhpApprovedDate"]) {
      if (doc[f]) { companyChanges.push({ field: f, from: doc[f], to: null }); doc[f] = null; }
    }
  }
  const years = [...(doc.years ?? [])];
  const added = [], unchanged = [], restated = [];
  for (const y of incoming.years) {
    const i = years.findIndex((e) => e.fyEnd === y.fyEnd);
    if (i === -1) {
      years.push({ _key: y.fyEnd, _type: "fundamentalsYear", ...y, importedAt: today });
      added.push(y.fyEnd);
    } else if (sameYear(years[i], y)) {
      unchanged.push(y.fyEnd);
    } else {
      const fields = YEAR_FIELDS.filter((f) => (years[i][f] ?? null) !== (y[f] ?? null));
      restated.push({ fyEnd: y.fyEnd, fields });
      if (allowRestatement) years[i] = { ...years[i], ...y, restatedAt: today };
    }
  }
  years.sort((a, b) => a.fyEnd.localeCompare(b.fyEnd));
  doc.years = years;
  return { doc, added, unchanged, restated, companyChanges };
}

// ───────────────────────── metrics ─────────────────────────

const r2 = (n) => (n === null || n === undefined || !Number.isFinite(n) ? null : Math.round(n * 100) / 100);
const has = (v) => typeof v === "number" && Number.isFinite(v);

function findYearBefore(years, ref, nYears) {
  const target = nYears * 365.25;
  return years.find((y) => Math.abs(days(y.fyEnd, ref.fyEnd) - target) <= 40) ?? null;
}

/**
 * Metrics from a company's FY figures (latest FY) and the month's RETAIL price.
 * Returns { fy, metrics, notes } — every null metric has a reason in notes.
 */
export function computeMetrics(yearsIn, retailPriceINR, config) {
  const years = [...yearsIn].sort((a, b) => a.fyEnd.localeCompare(b.fyEnd));
  const m = {};
  const notes = {};
  const na = (k, why) => { m[k] = null; notes[k] = why; };
  if (!years.length) return { fy: null, metrics: m, notes: { all: "not available: no fundamentals on file" } };

  const L = years[years.length - 1];
  const P1 = findYearBefore(years, L, 1);
  const P3 = findYearBefore(years, L, 3);
  const { min: gMin, max: gMax } = config.implausibleGrowthPct;
  const growth = (k, v) => {
    if (v === null) return;
    if (v < gMin || v > gMax) na(k, `withheld: ${r2(v)}% is outside the ${gMin}%..+${gMax}% plausibility range`);
    else m[k] = r2(v);
  };

  // Growth
  if (P1 && has(L.revenueCr) && has(P1.revenueCr) && P1.revenueCr > 0) growth("revenueGrowthYoYPct", (L.revenueCr / P1.revenueCr - 1) * 100);
  else na("revenueGrowthYoYPct", "not available: needs revenue for the latest FY and the FY before");
  if (P3 && has(L.revenueCr) && has(P3.revenueCr) && P3.revenueCr > 0 && L.revenueCr > 0) growth("revenueCagr3yPct", (Math.pow(L.revenueCr / P3.revenueCr, 1 / 3) - 1) * 100);
  else na("revenueCagr3yPct", "not available: needs revenue for the latest FY and 3 FYs earlier");

  // Margins per FY, and trend over up to 3 years
  const margin = (y, f) => (has(y[f]) && has(y.revenueCr) && y.revenueCr > 0 ? (y[f] / y.revenueCr) * 100 : null);
  m.ebitdaMarginPct = r2(margin(L, "ebitdaCr"));
  if (m.ebitdaMarginPct === null) notes.ebitdaMarginPct = "not available: needs EBITDA and revenue";
  m.patMarginPct = r2(margin(L, "patCr"));
  if (m.patMarginPct === null) notes.patMarginPct = "not available: needs PAT and revenue";
  for (const [k, f] of [["ebitdaMarginChangePp", "ebitdaCr"], ["patMarginChangePp", "patCr"]]) {
    const b = [P3, findYearBefore(years, L, 2), P1].find((y) => y && margin(y, f) !== null);
    if (b && margin(L, f) !== null) { m[k] = r2(margin(L, f) - margin(b, f)); m[`${k}FromFy`] = b.fyEnd; }
    else na(k, "not available: needs margins for at least two FYs");
  }
  m.marginHistory = years.map((y) => ({ fyEnd: y.fyEnd, ebitdaMarginPct: r2(margin(y, "ebitdaCr")), patMarginPct: r2(margin(y, "patCr")) }));

  // Returns, leverage, cash
  m.lossMaking = has(L.patCr) ? L.patCr <= 0 : null;
  const avgNw = has(L.netWorthCr) ? (P1 && has(P1.netWorthCr) ? (L.netWorthCr + P1.netWorthCr) / 2 : L.netWorthCr) : null;
  if (has(L.patCr) && avgNw !== null && avgNw > 0) m.roePct = r2((L.patCr / avgNw) * 100);
  else na("roePct", avgNw !== null && avgNw <= 0 ? "not meaningful: net worth is zero or negative" : "not available: needs PAT and net worth");
  m.negativeNetWorth = has(L.netWorthCr) ? L.netWorthCr <= 0 : null;
  if (has(L.totalDebtCr) && has(L.netWorthCr) && L.netWorthCr > 0) m.debtToEquity = r2(L.totalDebtCr / L.netWorthCr);
  else na("debtToEquity", has(L.netWorthCr) && L.netWorthCr <= 0 ? "not meaningful: net worth is zero or negative" : "not available: needs total debt and net worth");
  if (has(L.cashCr) && has(L.totalDebtCr)) m.netCashCr = r2(L.cashCr - L.totalDebtCr); // positive = net cash, negative = net debt
  else na("netCashCr", "not available: needs cash and total debt");

  if (has(L.ocfCr) && has(L.patCr) && L.patCr > 0) m.cashConversion = r2(L.ocfCr / L.patCr);
  else na("cashConversion", has(L.patCr) && L.patCr <= 0 ? "not meaningful: PAT is zero or negative" : "not available: needs operating cash flow and PAT");
  const last3 = years.slice(-3);
  if (last3.length === 3 && last3.every((y) => has(y.ocfCr) && has(y.patCr))) {
    const sp = last3.reduce((s, y) => s + y.patCr, 0);
    if (sp > 0) m.cashConversion3y = r2(last3.reduce((s, y) => s + y.ocfCr, 0) / sp);
    else na("cashConversion3y", "not meaningful: cumulative 3-yr PAT is zero or negative");
  } else na("cashConversion3y", "not available: needs operating cash flow and PAT for 3 FYs");

  // Valuation at the RETAIL price (₹ crore = ₹ / 1e7)
  if (has(retailPriceINR) && has(L.sharesOutstanding)) {
    const mcap = (retailPriceINR * L.sharesOutstanding) / 1e7;
    m.marketCapCr = r2(mcap);
    if (has(L.patCr) && L.patCr > 0) m.pe = r2(mcap / L.patCr);
    else na("pe", has(L.patCr) ? "not meaningful: loss-making (PAT ≤ 0)" : "not available: needs PAT");
    if (has(L.netWorthCr) && L.netWorthCr > 0) m.pb = r2(mcap / L.netWorthCr);
    else na("pb", has(L.netWorthCr) ? "not meaningful: net worth is zero or negative" : "not available: needs net worth");
    if (has(L.totalDebtCr) && has(L.cashCr)) {
      const ev = mcap + L.totalDebtCr - L.cashCr;
      m.enterpriseValueCr = r2(ev);
      if (has(L.revenueCr) && L.revenueCr > 0) m.evSales = r2(ev / L.revenueCr);
      else na("evSales", "not available: needs revenue");
    } else { na("enterpriseValueCr", "not available: needs total debt and cash"); na("evSales", "not available: needs total debt and cash"); }
  } else {
    const why = has(retailPriceINR) ? "not available: needs shares outstanding" : "not available: no retail price on this import";
    for (const k of ["marketCapCr", "pe", "pb", "enterpriseValueCr", "evSales"]) na(k, why);
  }
  m.sharesAsOfFy = has(L.sharesOutstanding) ? L.fyEnd : null;

  // Governance inputs
  m.auditQualifiedLatestFy = L.auditQualified ?? null;
  m.auditorChangedLatestFy = P1 && L.auditor && P1.auditor ? normAuditor(L.auditor) !== normAuditor(P1.auditor) : null;

  return { fy: L.fyEnd, metrics: m, notes };
}

const normAuditor = (s) => String(s).toLowerCase().replace(/&/g, "and").replace(/\b(llp|chartered accountants|co)\b|[^a-z0-9]/g, "");

/** DRHP status as of a date, derived from the dates (so snapshots are reproducible). */
export function drhpAsOf(f, date) {
  if (!f || !f.drhpStatus) return { status: null, filedDate: null, approvedDate: null };
  const filed = f.drhpFiledDate && f.drhpFiledDate <= date ? f.drhpFiledDate : null;
  const approved = f.drhpApprovedDate && f.drhpApprovedDate <= date ? f.drhpApprovedDate : null;
  const status = approved ? "approved" : filed ? "filed" : "none";
  return { status, filedDate: filed, approvedDate: approved };
}

// ───────────────────────── scorecard ─────────────────────────

const fmt = (v, unit) => (v === null || v === undefined ? "not available" : `${v}${unit}`);
const higher = (v, green, amber) => (v >= green ? "green" : v >= amber ? "amber" : "red");
const lower = (v, green, amber) => (v <= green ? "green" : v <= amber ? "amber" : "red");
const capAmber = (s) => (s === "green" ? "amber" : s);
const NA = (factor, label, reason, rule) => ({ factor, label, status: "not_available", value: null, display: "not available", reason, rule });

/** Seven independent factors. Never combined into a score. */
export function scorecard(metrics, notes, drhp, config) {
  const out = [];
  const m = metrics;

  // Growth quality
  {
    const c = config.growthQuality;
    const useFallback = m[c.metric] === null || m[c.metric] === undefined;
    const key = useFallback ? c.fallbackMetric : c.metric;
    const v = m[key];
    const rule = `${key === c.metric ? "Revenue 3-yr CAGR" : "Revenue YoY growth (3-yr CAGR not available)"}: green ≥ ${c.greenMin}%, amber ≥ ${c.amberMin}%, else red` +
      (c.capAtAmberIfLossMaking ? "; capped at amber if the latest FY is loss-making" : "");
    if (v === null || v === undefined) out.push(NA("growthQuality", c.label, notes[key] ?? notes[c.metric], rule));
    else {
      let s = higher(v, c.greenMin, c.amberMin);
      if (c.capAtAmberIfLossMaking && m.lossMaking) s = capAmber(s);
      out.push({ factor: "growthQuality", label: c.label, status: s, value: v, display: fmt(v, "%"), metric: key, rule });
    }
  }
  // Profitability trend
  {
    const c = config.profitabilityTrend;
    const v = m[c.metric];
    const rule = `EBITDA margin change over up to 3 FYs: green ≥ +${c.greenMin}pp, amber ≥ ${c.amberMin}pp, else red` +
      (c.capAtAmberIfLossMaking ? "; capped at amber if the latest FY is loss-making" : "");
    if (v === null || v === undefined) out.push(NA("profitabilityTrend", c.label, notes[c.metric], rule));
    else {
      let s = higher(v, c.greenMin, c.amberMin);
      if (c.capAtAmberIfLossMaking && m.lossMaking) s = capAmber(s);
      out.push({ factor: "profitabilityTrend", label: c.label, status: s, value: v, display: `${v > 0 ? "+" : ""}${v}pp (since FY ending ${m.ebitdaMarginChangePpFromFy})`, metric: c.metric, rule });
    }
  }
  // Balance sheet
  {
    const c = config.balanceSheet;
    const rule = `Debt/equity: green ≤ ${c.greenMax}, amber ≤ ${c.amberMax}, else red` +
      (c.greenIfNetCash ? "; green if net cash" : "") + (c.redIfNegativeNetWorth ? "; red if net worth ≤ 0" : "");
    if (c.redIfNegativeNetWorth && m.negativeNetWorth) out.push({ factor: "balanceSheet", label: c.label, status: "red", value: null, display: "net worth ≤ 0", rule });
    else if (c.greenIfNetCash && has(m.netCashCr) && m.netCashCr >= 0) out.push({ factor: "balanceSheet", label: c.label, status: "green", value: m.netCashCr, display: `net cash ₹${m.netCashCr} cr${has(m.debtToEquity) ? `, D/E ${m.debtToEquity}` : ""}`, metric: "netCashCr", rule });
    else if (!has(m.debtToEquity)) out.push(NA("balanceSheet", c.label, notes.debtToEquity, rule));
    else out.push({ factor: "balanceSheet", label: c.label, status: lower(m.debtToEquity, c.greenMax, c.amberMax), value: m.debtToEquity, display: `D/E ${m.debtToEquity}${has(m.netCashCr) ? `, net debt ₹${-m.netCashCr} cr` : ""}`, metric: "debtToEquity", rule });
  }
  // Cash conversion
  {
    const c = config.cashConversion;
    const key = has(m[c.metric]) ? c.metric : c.fallbackMetric;
    const v = m[key];
    const rule = `${key === c.metric ? "3-yr operating cash flow / PAT" : "Latest-FY operating cash flow / PAT (3-yr not available)"}: green ≥ ${c.greenMin}x, amber ≥ ${c.amberMin}x, else red`;
    if (!has(v)) out.push(NA("cashConversion", c.label, notes[c.metric] ?? notes[c.fallbackMetric], rule));
    else out.push({ factor: "cashConversion", label: c.label, status: higher(v, c.greenMin, c.amberMin), value: v, display: `${v}x`, metric: key, rule });
  }
  // Governance
  {
    const c = config.governance;
    const rule = "Red if the latest FY's audit report is qualified; amber if the auditor changed in the latest FY; otherwise green";
    const q = m.auditQualifiedLatestFy;
    const ch = m.auditorChangedLatestFy;
    if (q == null && ch == null) out.push(NA("governance", c.label, "not available: needs audit qualification and auditor names", rule));
    else if (c.redIfQualifiedLatestFy && q === true) out.push({ factor: "governance", label: c.label, status: "red", value: "qualified", display: "audit report qualified (latest FY)", rule });
    else if (c.amberIfAuditorChangedLatestFy && ch === true) out.push({ factor: "governance", label: c.label, status: "amber", value: "auditor changed", display: "auditor changed in latest FY", rule });
    else if (q == null) out.push(NA("governance", c.label, "not available: audit qualification not recorded for the latest FY", rule));
    else out.push({ factor: "governance", label: c.label, status: "green", value: "clean", display: ch == null ? "unqualified (auditor history not available)" : "unqualified, same auditor", rule });
  }
  // Valuation at retail price
  {
    const c = config.valuation;
    const rule = `P/E at retail price: green ≤ ${c.greenMax}, amber ≤ ${c.amberMax}, else red; if P/E is not meaningful, EV/Sales: green ≤ ${c.fallbackGreenMax}, amber ≤ ${c.fallbackAmberMax}, else red`;
    if (has(m.pe)) out.push({ factor: "valuation", label: c.label, status: lower(m.pe, c.greenMax, c.amberMax), value: m.pe, display: `P/E ${m.pe}`, metric: "pe", rule });
    else if (has(m.evSales)) out.push({ factor: "valuation", label: c.label, status: lower(m.evSales, c.fallbackGreenMax, c.fallbackAmberMax), value: m.evSales, display: `EV/Sales ${m.evSales} (P/E ${notes.pe ?? "not available"})`, metric: "evSales", rule });
    else out.push(NA("valuation", c.label, notes.pe ?? notes.evSales, rule));
  }
  // IPO visibility
  {
    const c = config.ipoVisibility;
    const rule = `DRHP approved: ${c.approved}; DRHP filed: ${c.filed}; no DRHP: ${c.none}`;
    if (!drhp?.status) out.push(NA("ipoVisibility", c.label, "not available: DRHP status not recorded", rule));
    else out.push({
      factor: "ipoVisibility", label: c.label, status: c[drhp.status], value: drhp.status,
      display: drhp.status === "approved" ? `DRHP approved ${drhp.approvedDate}` : drhp.status === "filed" ? `DRHP filed ${drhp.filedDate}` : "no DRHP filed", rule,
    });
  }
  return out;
}

// ───────────────────────── what changed this month ─────────────────────────

/**
 * Compare this month's company record with last month's snapshot record.
 * prev === undefined → no baseline (first snapshot): returns null.
 */
export function changesSince(prev, cur) {
  if (prev === undefined) return null;
  const changes = [];
  const prevFys = new Set((prev?.years ?? []).map((y) => y.fyEnd));
  const years = cur.years ?? [];
  if (!prevFys.size && years.length) {
    // First time this company has fundamentals: one entry, not every past FY.
    changes.push({ type: "fundamentals_added", fyEnds: years.map((y) => y.fyEnd) });
    const L = years[years.length - 1];
    if (L.auditQualified === true) changes.push({ type: "qualification_added", fyEnd: L.fyEnd, note: L.auditQualificationNote });
  } else years.forEach((y, i) => {
    const before = i > 0 ? years[i - 1] : null;
    if (!prevFys.has(y.fyEnd)) {
      changes.push({ type: "results_filed", fyEnd: y.fyEnd, source: y.source, sourceDate: y.sourceDate });
      if (before?.auditor && y.auditor && normAuditor(before.auditor) !== normAuditor(y.auditor)) {
        changes.push({ type: "auditor_change", fyEnd: y.fyEnd, from: before.auditor, to: y.auditor });
      }
      if (y.auditQualified === true) changes.push({ type: "qualification_added", fyEnd: y.fyEnd, note: y.auditQualificationNote });
    } else {
      const p = prev.years.find((x) => x.fyEnd === y.fyEnd);
      if (p && p.auditQualified !== true && y.auditQualified === true) changes.push({ type: "qualification_added", fyEnd: y.fyEnd, note: y.auditQualificationNote });
    }
  });
  const pd = prev?.drhp?.status ?? null;
  const cd = cur.drhp?.status ?? null;
  if (cd !== pd) {
    if (cd === "filed") changes.push({ type: "drhp_filed", date: cur.drhp.filedDate });
    if (cd === "approved") {
      if (pd !== "filed" && cur.drhp.filedDate) changes.push({ type: "drhp_filed", date: cur.drhp.filedDate });
      changes.push({ type: "drhp_approved", date: cur.drhp.approvedDate });
    }
  }
  return changes;
}

// ───────────────────────── import dates (price) ─────────────────────────

/** Distinct price-import dates carried by at least minRows documents' priceHistory. */
export function importDates(docs, minRows = 20) {
  const counts = new Map();
  for (const d of docs) {
    for (const x of new Set((d.priceHistory ?? []).map((h) => h?.d).filter(isIsoDate))) counts.set(x, (counts.get(x) ?? 0) + 1);
  }
  const all = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  return { dates: all.filter(([, n]) => n >= minRows).map(([d]) => d), ignored: all.filter(([, n]) => n < minRows), counts: Object.fromEntries(all) };
}

export function latestPerMonth(dates) {
  const byMonth = new Map();
  for (const d of [...dates].sort()) byMonth.set(monthOf(d), d);
  return [...byMonth.values()];
}

export function retailPriceOn(share, date) {
  const h = (share.priceHistory ?? []).find((x) => x?.d === date);
  return h && has(h.p) && h.p > 0 ? h.p : null;
}
