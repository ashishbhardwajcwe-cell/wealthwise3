/**
 * AMFI India daily NAV feed + MFAPI.in historical returns.
 *
 * AMFI feed: https://www.amfiindia.com/spages/NAVAll.txt (current NAVs)
 * MFAPI:     https://api.mfapi.in/mf/{schemeCode}        (historical NAVs)
 *
 * Both free, no API key.
 */

const AMFI_FEED_URL = "https://www.amfiindia.com/spages/NAVAll.txt";
const MFAPI_BASE = "https://api.mfapi.in/mf";

/** 6h for current NAV (AMFI updates once a day). */
const NAV_REVALIDATE = 60 * 60 * 6;
/** 24h for historical NAVs (return numbers barely move day-to-day). */
const HISTORY_REVALIDATE = 60 * 60 * 24;

export interface MFCategory {
  slug: string;
  name: string;
  short: string;
}

export const MF_CATEGORIES: MFCategory[] = [
  { slug: "large-cap",  name: "Large Cap",  short: "Top 100 companies. Lower volatility, steady compounding." },
  { slug: "flexi-cap",  name: "Flexi Cap",  short: "Manager picks across market caps. Most popular." },
  { slug: "mid-cap",    name: "Mid Cap",    short: "Companies 101–250. Higher growth, higher volatility." },
  { slug: "small-cap",  name: "Small Cap",  short: "Beyond #250. Biggest upside, biggest drawdowns." },
  { slug: "elss",       name: "ELSS",       short: "80C tax-saver with 3-year lock-in." },
  { slug: "hybrid",     name: "Hybrid",     short: "Mix of equity + debt." },
  { slug: "debt",       name: "Debt",       short: "Fixed-income. Use for goals under 3 years." },
];

export interface TrackedFund {
  schemeCode: string;
  category: string;
  amc: string;
  name: string;
}

export const TRACKED_FUNDS: TrackedFund[] = [
  // Large Cap
  { schemeCode: "120586", category: "large-cap", amc: "ICICI Prudential", name: "Bluechip Fund" },
  { schemeCode: "118834", category: "large-cap", amc: "Mirae Asset",      name: "Large Cap Fund" },
  { schemeCode: "119598", category: "large-cap", amc: "SBI",              name: "Bluechip Fund" },
  { schemeCode: "118807", category: "large-cap", amc: "Axis",             name: "Bluechip Fund" },
  { schemeCode: "118780", category: "large-cap", amc: "Nippon India",     name: "Large Cap Fund" },
  { schemeCode: "118533", category: "large-cap", amc: "HDFC",             name: "Top 100 Fund" },

  // Flexi Cap
  { schemeCode: "122639", category: "flexi-cap", amc: "Parag Parikh",     name: "Flexi Cap Fund" },
  { schemeCode: "118472", category: "flexi-cap", amc: "Kotak",            name: "Flexicap Fund" },
  { schemeCode: "118989", category: "flexi-cap", amc: "HDFC",             name: "Flexi Cap Fund" },
  { schemeCode: "118566", category: "flexi-cap", amc: "DSP",              name: "Flexi Cap Fund" },

  // Mid Cap
  { schemeCode: "118473", category: "mid-cap",   amc: "Kotak",            name: "Emerging Equity" },
  { schemeCode: "120842", category: "mid-cap",   amc: "Axis",             name: "Midcap Fund" },
  { schemeCode: "120505", category: "mid-cap",   amc: "Motilal Oswal",    name: "Midcap Fund" },
  { schemeCode: "118552", category: "mid-cap",   amc: "Nippon India",     name: "Growth Fund" },

  // Small Cap
  { schemeCode: "118778", category: "small-cap", amc: "Nippon India",     name: "Small Cap Fund" },
  { schemeCode: "120828", category: "small-cap", amc: "Quant",            name: "Small Cap Fund" },
  { schemeCode: "118784", category: "small-cap", amc: "Axis",             name: "Small Cap Fund" },
  { schemeCode: "118468", category: "small-cap", amc: "HDFC",             name: "Small Cap Fund" },
  { schemeCode: "120527", category: "small-cap", amc: "SBI",              name: "Small Cap Fund" },

  // ELSS
  { schemeCode: "120721", category: "elss",      amc: "Axis",             name: "ELSS Tax Saver" },
  { schemeCode: "118469", category: "elss",      amc: "Quant",            name: "ELSS Tax Saver" },
  { schemeCode: "118534", category: "elss",      amc: "Nippon India",     name: "ELSS Tax Saver" },

  // Hybrid
  { schemeCode: "101099", category: "hybrid",    amc: "ICICI Prudential", name: "Equity & Debt Fund" },
  { schemeCode: "118565", category: "hybrid",    amc: "HDFC",             name: "Hybrid Equity Fund" },
  { schemeCode: "118567", category: "hybrid",    amc: "SBI",              name: "Equity Hybrid Fund" },

  // Debt
  { schemeCode: "101061", category: "debt",      amc: "HDFC",             name: "Liquid Fund" },
  { schemeCode: "118548", category: "debt",      amc: "ICICI Prudential", name: "Liquid Fund" },
];

/** Curated gold + silver ETFs. Same data infrastructure as regular MFs
 *  since AMFI publishes ETF NAVs in the same daily feed. Displayed in
 *  their own table on the gold/silver page. */
export const TRACKED_METAL_ETFS: TrackedFund[] = [
  // Gold ETFs
  { schemeCode: "118819", category: "gold-etf",   amc: "Nippon India",     name: "Gold BeES" },
  { schemeCode: "118566", category: "gold-etf",   amc: "HDFC",             name: "Gold ETF" },
  { schemeCode: "120829", category: "gold-etf",   amc: "ICICI Prudential", name: "Gold ETF" },
  { schemeCode: "118469", category: "gold-etf",   amc: "Kotak",            name: "Gold ETF" },
  { schemeCode: "118550", category: "gold-etf",   amc: "Aditya Birla SL",  name: "Gold ETF" },
  { schemeCode: "118468", category: "gold-etf",   amc: "SBI",              name: "Gold ETF" },

  // Silver ETFs (launched 2022)
  { schemeCode: "152716", category: "silver-etf", amc: "ICICI Prudential", name: "Silver ETF" },
  { schemeCode: "152714", category: "silver-etf", amc: "Nippon India",     name: "Silver BeES" },
  { schemeCode: "152715", category: "silver-etf", amc: "Aditya Birla SL",  name: "Silver ETF" },
  { schemeCode: "152717", category: "silver-etf", amc: "HDFC",             name: "Silver ETF" },
];

export interface MFLiveRow {
  schemeCode: string;
  category: string;
  amc: string;
  name: string;
  nav: number | null;
  asOf: string | null;
  /** Trailing-period return. For 6M this is a simple percent change
   *  (not annualised — the period is shorter than a year). For 1Y/3Y/5Y
   *  it's annualised CAGR. Null if data missing. */
  return6m: number | null;
  return1y: number | null;
  return3y: number | null;
  return5y: number | null;
  /** CRISIL rating 1–5 (via Kuvera). Null when unavailable. */
  crisilRating: number | null;
  /** Total expense ratio as a percent, e.g. 0.63 (via Kuvera). Null when unavailable. */
  expenseRatio: number | null;
  /** Last ~30 days of NAVs in chronological order (oldest first). */
  sparkline30d: number[];
  found: boolean;
}

/** Fetch AMFI + MFAPI in parallel, compute returns, return enriched rows. */
export async function getTrackedMFNAVs(funds: TrackedFund[] = TRACKED_FUNDS): Promise<MFLiveRow[]> {
  const [navMap, returnsMap] = await Promise.all([
    fetchAMFINavMap(),
    fetchReturnsMap(funds.map((f) => f.schemeCode)),
  ]);

  // The AMFI feed gives us each scheme's ISIN for free; use it to pull CRISIL
  // rating + expense ratio from the (free) Kuvera proxy. Strictly best-effort —
  // any miss leaves those fields null and the table renders unchanged.
  const isinByCode = new Map<string, string>();
  for (const f of funds) {
    const isin = navMap.get(f.schemeCode)?.isin;
    if (isin) isinByCode.set(f.schemeCode, isin);
  }
  const enrichMap = await fetchEnrichmentMap([...new Set(isinByCode.values())]);

  return funds.map((f): MFLiveRow => {
    const navHit = navMap.get(f.schemeCode);
    const ret = returnsMap.get(f.schemeCode);
    const isin = isinByCode.get(f.schemeCode);
    const enrich = isin ? enrichMap.get(isin) : undefined;
    return {
      schemeCode: f.schemeCode,
      category: f.category,
      amc: f.amc,
      name: f.name,
      nav: navHit?.nav ?? ret?.currentNav ?? null,
      asOf: navHit?.asOf ?? ret?.currentDate ?? null,
      return6m: ret?.return6m ?? null,
      return1y: ret?.return1y ?? null,
      return3y: ret?.return3y ?? null,
      return5y: ret?.return5y ?? null,
      crisilRating: enrich?.crisilRating ?? null,
      expenseRatio: enrich?.expenseRatio ?? null,
      sparkline30d: ret?.sparkline30d ?? [],
      found: !!(navHit || ret),
    };
  });
}

/** AMFI daily feed parser. Columns: Scheme Code;ISIN Growth;ISIN Reinvest;Name;NAV;Date */
async function fetchAMFINavMap(): Promise<Map<string, { nav: number; asOf: string; isin?: string }>> {
  const out = new Map<string, { nav: number; asOf: string; isin?: string }>();
  try {
    const res = await fetch(AMFI_FEED_URL, {
      next: { revalidate: NAV_REVALIDATE, tags: ["amfi:nav"] },
      headers: { Accept: "text/plain" },
    });
    if (!res.ok) return out;
    const text = await res.text();
    for (const line of text.split(/\r?\n/)) {
      const parts = line.split(";");
      if (parts.length < 6) continue;
      const code = parts[0].trim();
      if (!/^\d+$/.test(code)) continue;
      // parts[1] is the Growth (or Div-Payout) ISIN; Indian MF ISINs start "INF".
      const isinRaw = parts[1]?.trim();
      const isin = isinRaw && /^INF/i.test(isinRaw) ? isinRaw : undefined;
      const navStr = parts[4]?.trim();
      const date = parts[5]?.trim();
      if (!navStr || navStr === "N.A." || !date) continue;
      const nav = parseFloat(navStr);
      if (Number.isNaN(nav)) continue;
      out.set(code, { nav, asOf: date, isin });
    }
  } catch (err) {
    console.warn("AMFI fetch failed:", err);
  }
  return out;
}

// ─── Kuvera enrichment (CRISIL rating + expense ratio) ──────────────
// Free, unofficial proxy (mf.captnemo.in) over Kuvera, keyed by ISIN.
// Strictly best-effort: failures / timeouts / missing fields → null, never
// throw, so the table always renders even if the proxy is unavailable.

const KUVERA_PROXY_BASE = "https://mf.captnemo.in/kuvera";

export interface MFEnrichment {
  crisilRating: number | null;
  expenseRatio: number | null;
}

async function fetchEnrichmentMap(isins: string[]): Promise<Map<string, MFEnrichment>> {
  const out = new Map<string, MFEnrichment>();
  if (isins.length === 0) return out;
  const results = await Promise.allSettled(isins.map((i) => fetchKuveraEnrichment(i)));
  results.forEach((r, idx) => {
    if (r.status === "fulfilled" && r.value) out.set(isins[idx], r.value);
  });
  return out;
}

async function fetchKuveraEnrichment(isin: string): Promise<MFEnrichment | null> {
  try {
    const res = await fetch(`${KUVERA_PROXY_BASE}/${encodeURIComponent(isin)}`, {
      next: { revalidate: HISTORY_REVALIDATE, tags: ["kuvera", `kuvera:${isin}`] },
      headers: {
        Accept: "application/json",
        // Some proxies reject the default server UA — present a browser-like one.
        "User-Agent": "Mozilla/5.0 (compatible; PlanMyCashflows/1.0; +https://planmycashflows.com)",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    // Kuvera returns either a single object or a one-element array.
    const fund = (Array.isArray(body) ? body[0] : body) as Record<string, unknown> | undefined;
    if (!fund || typeof fund !== "object") return null;
    const crisilRating = pickNumber(fund.crisil_rating ?? fund.fund_rating);
    const expenseRatio = pickNumber(fund.expense_ratio);
    if (crisilRating == null && expenseRatio == null) return null;
    return { crisilRating, expenseRatio };
  } catch {
    return null;
  }
}

/** Coerce a number | numeric-string into a finite number, else null. */
function pickNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

interface SchemeReturns {
  currentNav: number;
  currentDate: string;
  return6m: number | null;
  return1y: number | null;
  return3y: number | null;
  return5y: number | null;
  /** Oldest-first NAV history, ~30 points. */
  sparkline30d: number[];
}

async function fetchReturnsMap(codes: string[]): Promise<Map<string, SchemeReturns>> {
  const out = new Map<string, SchemeReturns>();
  const results = await Promise.allSettled(codes.map((c) => fetchSchemeReturns(c)));
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) out.set(codes[i], r.value);
  });
  return out;
}

interface MFAPIResponse {
  meta?: unknown;
  data?: Array<{ date: string; nav: string }>;
  status?: string;
}

async function fetchSchemeReturns(schemeCode: string): Promise<SchemeReturns | null> {
  try {
    const res = await fetch(`${MFAPI_BASE}/${schemeCode}`, {
      next: { revalidate: HISTORY_REVALIDATE, tags: ["mfapi", `mfapi:${schemeCode}`] },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body: MFAPIResponse = await res.json();
    if (!body.data || body.data.length === 0) return null;
    // MFAPI returns newest-first; first row is latest.
    const latest = body.data[0];
    const currentNav = parseFloat(latest.nav);
    if (Number.isNaN(currentNav)) return null;
    const currentTs = parseMFAPIDate(latest.date);
    if (!currentTs) return null;

    return {
      currentNav,
      currentDate: latest.date,
      return6m: computeSimpleReturn(body.data, currentTs, currentNav, 183),
      return1y: computeCAGR(body.data, currentTs, currentNav, 365),
      return3y: computeCAGR(body.data, currentTs, currentNav, 3 * 365),
      return5y: computeCAGR(body.data, currentTs, currentNav, 5 * 365),
      sparkline30d: extractSparkline(body.data, 30),
    };
  } catch {
    return null;
  }
}

/** Take the first `n` MFAPI rows (newest-first) and return their NAVs
 *  in oldest-first chronological order so the sparkline reads left-to-right. */
function extractSparkline(
  data: Array<{ date: string; nav: string }>,
  n: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < Math.min(n, data.length); i++) {
    const v = parseFloat(data[i].nav);
    if (!Number.isNaN(v) && v > 0) out.push(v);
  }
  return out.reverse();
}

/** MFAPI returns dates as "DD-MM-YYYY". Return epoch ms or null. */
function parseMFAPIDate(s: string): number | null {
  const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/** Walk the (newest-first) NAV array and find the closest entry to `daysBack` ago. */
function findPastNav(
  data: Array<{ date: string; nav: string }>,
  targetTs: number,
): { nav: number; ts: number } | null {
  for (const row of data) {
    const ts = parseMFAPIDate(row.date);
    if (!ts) continue;
    if (ts <= targetTs) {
      const nav = parseFloat(row.nav);
      if (!Number.isNaN(nav) && nav > 0) return { nav, ts };
      // keep walking — the first valid one wins
    }
  }
  return null;
}

/** Annualised CAGR over `daysBack` days. */
function computeCAGR(
  data: Array<{ date: string; nav: string }>,
  currentTs: number,
  currentNav: number,
  daysBack: number,
): number | null {
  const past = findPastNav(data, currentTs - daysBack * 24 * 60 * 60 * 1000);
  if (!past) return null;
  const years = (currentTs - past.ts) / (365.25 * 24 * 60 * 60 * 1000);
  if (years <= 0.1) return null;
  return (Math.pow(currentNav / past.nav, 1 / years) - 1) * 100;
}

/** Simple (non-annualised) percent change over a sub-year window. */
function computeSimpleReturn(
  data: Array<{ date: string; nav: string }>,
  currentTs: number,
  currentNav: number,
  daysBack: number,
): number | null {
  const past = findPastNav(data, currentTs - daysBack * 24 * 60 * 60 * 1000);
  if (!past) return null;
  return (currentNav / past.nav - 1) * 100;
}
