/**
 * Mutual fund + ETF data layer.
 *
 * Sources (all free, no API key):
 *   AMFI feed  https://www.amfiindia.com/spages/NAVAll.txt
 *              — official daily NAVs for every Indian scheme, WITH the SEBI
 *                category section headers and AMC names. Funds and metal
 *                ETFs are DISCOVERED from this feed by category + AMC, so
 *                there are no hardcoded scheme codes to go stale or collide.
 *   MFAPI      https://api.mfapi.in/mf/{schemeCode}
 *              — historical NAVs (returns + sparkline), keyed by AMFI code.
 *   Kuvera     https://mf.captnemo.in/kuvera/{isin}
 *              — CRISIL rating, expense ratio, and 1/3/5Y returns used as a
 *                fallback when MFAPI is unreachable.
 */

const AMFI_FEED_URL = "https://www.amfiindia.com/spages/NAVAll.txt";
const MFAPI_BASE = "https://api.mfapi.in/mf";
const KUVERA_PROXY_BASE = "https://mf.captnemo.in/kuvera";

/** 6h for current NAV (AMFI updates once a day). */
const NAV_REVALIDATE = 60 * 60 * 6;
/** 24h for historical NAVs (return numbers barely move day-to-day). */
const HISTORY_REVALIDATE = 60 * 60 * 24;

/** Some upstream hosts (Cloudflare in front of MFAPI, the Kuvera proxy)
 *  reject requests without a browser-like User-Agent. */
const BROWSER_UA =
  "Mozilla/5.0 (compatible; PlanMyCashflows/1.0; +https://planmycashflows.com)";

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Fund universe ──────────────────────────────────────────────────

export interface MFCategory {
  slug: string;
  name: string;
  short: string;
}

/** SEBI categories we track, with per-category caps that together build the
 *  "top 100" list. `match` runs against the AMFI section header, e.g.
 *  "Open Ended Schemes(Equity Scheme - Large Cap Fund)". Order = priority. */
const CATEGORY_RULES: Array<MFCategory & { cap: number; match: (section: string) => boolean }> = [
  { slug: "large-cap",     name: "Large Cap",         short: "Top 100 companies. Lower volatility, steady compounding.", cap: 12, match: (s) => /Large Cap Fund/i.test(s) && !/Large & Mid/i.test(s) },
  { slug: "large-mid-cap", name: "Large & Mid Cap",   short: "Top 250 blend — one notch more aggressive than large cap.", cap: 8,  match: (s) => /Large & Mid Cap/i.test(s) },
  { slug: "flexi-cap",     name: "Flexi Cap",         short: "Manager picks across market caps. Most popular.",           cap: 10, match: (s) => /Flexi Cap/i.test(s) },
  { slug: "multi-cap",     name: "Multi Cap",         short: "Mandated 25% each in large, mid and small caps.",           cap: 8,  match: (s) => /Multi Cap/i.test(s) },
  { slug: "mid-cap",       name: "Mid Cap",           short: "Companies 101–250. Higher growth, higher volatility.",      cap: 12, match: (s) => /Mid Cap Fund/i.test(s) && !/Large & Mid|Small/i.test(s) },
  { slug: "small-cap",     name: "Small Cap",         short: "Beyond #250. Biggest upside, biggest drawdowns.",           cap: 12, match: (s) => /Small Cap Fund/i.test(s) },
  { slug: "elss",          name: "ELSS",              short: "80C tax-saver with 3-year lock-in.",                        cap: 10, match: (s) => /ELSS/i.test(s) },
  { slug: "value",         name: "Value / Contra",    short: "Buys out-of-favour businesses below intrinsic value.",      cap: 6,  match: (s) => /Value Fund|Contra/i.test(s) },
  { slug: "focused",       name: "Focused",           short: "Concentrated ~25-stock portfolios.",                        cap: 6,  match: (s) => /Focus?sed Fund/i.test(s) },
  { slug: "hybrid",        name: "Aggressive Hybrid", short: "~65–80% equity + debt cushion.",                            cap: 8,  match: (s) => /Aggressive Hybrid/i.test(s) },
  { slug: "baf",           name: "Balanced Advantage",short: "Dynamically shifts between equity and debt.",               cap: 6,  match: (s) => /Balanced Advantage|Dynamic Asset Allocation/i.test(s) },
  { slug: "index",         name: "Index",             short: "Passive Nifty 50 / Sensex trackers at rock-bottom cost.",   cap: 8,  match: (s) => /Index Fund/i.test(s) },
  { slug: "liquid",        name: "Liquid",            short: "Parking for cash and goals under a year.",                  cap: 4,  match: (s) => /Liquid Fund/i.test(s) },
];

export const MF_CATEGORIES: MFCategory[] = CATEGORY_RULES.map(({ slug, name, short }) => ({ slug, name, short }));

/** Overall size of the "top funds" list. */
const TOP_FUND_LIMIT = 100;

/** AMCs eligible for the top-funds list, in rough AUM order (the feed has
 *  no AUM, so the industry's largest houses first is the ranking proxy).
 *  `match` runs against the AMC line in the feed (e.g. "SBI Mutual Fund"). */
const AMC_WHITELIST: Array<{ match: RegExp; short: string }> = [
  { match: /^SBI\b/i,              short: "SBI" },
  { match: /^ICICI Prudential/i,   short: "ICICI Prudential" },
  { match: /^HDFC\b/i,             short: "HDFC" },
  { match: /^Nippon India/i,       short: "Nippon India" },
  { match: /^Kotak/i,              short: "Kotak" },
  { match: /^Aditya Birla/i,       short: "Aditya Birla SL" },
  { match: /^UTI\b/i,              short: "UTI" },
  { match: /^Axis\b/i,             short: "Axis" },
  { match: /^Mirae/i,              short: "Mirae Asset" },
  { match: /^Tata\b/i,             short: "Tata" },
  { match: /^DSP\b/i,              short: "DSP" },
  { match: /^Bandhan/i,            short: "Bandhan" },
  { match: /^Edelweiss/i,          short: "Edelweiss" },
  { match: /^Motilal Oswal/i,      short: "Motilal Oswal" },
  { match: /^quant\b/i,            short: "Quant" },
  { match: /^PPFAS|^Parag Parikh/i, short: "Parag Parikh" },
  { match: /^Canara Robeco/i,      short: "Canara Robeco" },
  { match: /^Franklin/i,           short: "Franklin Templeton" },
  { match: /^Invesco/i,            short: "Invesco" },
  { match: /^HSBC/i,               short: "HSBC" },
  { match: /^Sundaram/i,           short: "Sundaram" },
  { match: /^Baroda BNP/i,         short: "Baroda BNP Paribas" },
];

export interface MFLiveRow {
  schemeCode: string;
  category: string;
  amc: string;
  name: string;
  nav: number | null;
  asOf: string | null;
  /** Trailing-period returns. 6M is a simple percent change (window is
   *  shorter than a year); 1Y/2Y/3Y/5Y/10Y are annualised CAGR.
   *  Null when the history doesn't reach back far enough. */
  return6m: number | null;
  return1y: number | null;
  return2y: number | null;
  return3y: number | null;
  return5y: number | null;
  return10y: number | null;
  /** CRISIL rating 1–5 (via Kuvera). Null when unavailable. */
  crisilRating: number | null;
  /** Total expense ratio as a percent, e.g. 0.63 (via Kuvera). Null when unavailable. */
  expenseRatio: number | null;
  /** Last ~30 days of NAVs in chronological order (oldest first). */
  sparkline30d: number[];
  found: boolean;
}

// ─── AMFI feed parsing ──────────────────────────────────────────────

interface AmfiScheme {
  code: string;
  isin?: string;
  /** Official scheme name from the feed. */
  officialName: string;
  nav: number;
  asOf: string;
  /** SEBI category text from the enclosing section header. */
  section: string;
  /** AMC line the scheme appeared under, minus "Mutual Fund". */
  amcFull: string;
}

/**
 * Module-scope memo for the parsed AMFI feed. The feed is ~2.2MB, which is
 * over Next's 2MB per-item data-cache limit — Next refuses to store it
 * ("Failed to set Next.js data cache … items over 2MB can not be cached" in
 * every build log), so `next: { revalidate }` on that fetch silently did
 * nothing and every caller re-downloaded the full file (twice on /markets
 * alone: getTopMutualFunds + getMetalETFs). Caching the parsed result here
 * instead gives one download per server instance per NAV_REVALIDATE window,
 * and the shared in-flight promise collapses concurrent callers into a
 * single request. A failed/empty fetch clears the slot so the next render
 * retries instead of pinning an empty fund list for 6 hours.
 */
let amfiMemo: { at: number; promise: Promise<AmfiScheme[]> } | null = null;

function fetchAmfiSchemes(): Promise<AmfiScheme[]> {
  if (amfiMemo && Date.now() - amfiMemo.at < NAV_REVALIDATE * 1000) {
    return amfiMemo.promise;
  }
  const memo = {
    at: Date.now(),
    promise: loadAmfiSchemes().then((schemes) => {
      if (schemes.length === 0 && amfiMemo === memo) amfiMemo = null;
      return schemes;
    }),
  };
  amfiMemo = memo;
  return memo.promise;
}

/**
 * Parse the full AMFI feed preserving its structure. The feed interleaves:
 *   Open Ended Schemes(Equity Scheme - Large Cap Fund)   ← section header
 *   Axis Mutual Fund                                     ← AMC line
 *   120465;INF846K01EW2;-;Axis Bluechip Fund - Direct Plan - Growth;58.4;01-Jul-2026
 */
async function loadAmfiSchemes(): Promise<AmfiScheme[]> {
  const out: AmfiScheme[] = [];
  try {
    // Deliberately NOT `next: { revalidate }`: the response is over the 2MB
    // data-cache limit so Next can't store it anyway — the memo above is the
    // cache. The timeout keeps a hung AMFI from stalling a build/ISR render.
    const res = await fetch(AMFI_FEED_URL, {
      headers: { Accept: "text/plain", "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return out;
    const text = await res.text();

    let section = "";
    let amcFull = "";
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;

      if (!line.includes(";")) {
        // Header lines: either a scheme-type section or an AMC name.
        const sectionMatch = line.match(/Schemes?\s*\(\s*([^)]+)\)/i);
        if (sectionMatch) section = sectionMatch[1].trim();
        else if (!/^Scheme Code/i.test(line)) amcFull = line.replace(/Mutual Fund\s*$/i, "").trim();
        continue;
      }

      const parts = line.split(";");
      if (parts.length < 6) continue;
      const code = parts[0].trim();
      if (!/^\d+$/.test(code)) continue;
      const navStr = parts[4]?.trim();
      const asOf = parts[5]?.trim();
      if (!navStr || navStr === "N.A." || !asOf) continue;
      const nav = parseFloat(navStr);
      if (Number.isNaN(nav) || nav <= 0) continue;
      const isinRaw = parts[1]?.trim();
      out.push({
        code,
        isin: isinRaw && /^INF/i.test(isinRaw) ? isinRaw : undefined,
        officialName: parts[3]?.trim() ?? "",
        nav,
        asOf,
        section,
        amcFull,
      });
    }
  } catch (err) {
    console.warn("AMFI fetch failed:", err);
  }
  return out;
}

/** Direct-plan Growth option only (one row per fund; excludes IDCW/Regular). */
function isDirectGrowth(name: string): boolean {
  return (
    /\bdirect\b/i.test(name) &&
    /growth/i.test(name) &&
    !/idcw|dividend|bonus|payout|reinvest/i.test(name)
  );
}

/** "Axis Bluechip Fund - Direct Plan - Growth" → "Bluechip Fund" (AMC has its
 *  own column). Strips whichever AMC prefix the fund actually uses — the feed
 *  AMC line ("PPFAS") and the display short ("Parag Parikh") can differ. */
function displayName(officialName: string, amcPrefixes: Array<string | undefined>): string {
  let n = officialName.split(/\s+-\s+/)[0].trim();
  for (const prefix of amcPrefixes) {
    if (prefix && n.toLowerCase().startsWith(prefix.toLowerCase())) {
      n = n.slice(prefix.length).trim();
      break;
    }
  }
  // "Nippon India ETF Gold BeES" → "ETF Gold BeES" → "Gold BeES"
  n = n.replace(/^ETF\s+/i, "");
  return n || officialName;
}

interface DiscoveredFund {
  schemeCode: string;
  category: string;
  amc: string;
  amcRank: number;
  name: string;
  isin?: string;
  nav: number;
  asOf: string;
}

/** Select the top-N funds: whitelisted AMCs × tracked SEBI categories,
 *  Direct-Growth plans, capped per category. */
function discoverTopFunds(schemes: AmfiScheme[], limit = TOP_FUND_LIMIT): DiscoveredFund[] {
  const byCategory = new Map<string, DiscoveredFund[]>();

  for (const s of schemes) {
    if (!isDirectGrowth(s.officialName)) continue;
    // ETFs / FoFs sneak into a few sections — the fund table is for regular schemes.
    if (/\betf\b|bees|fof|fund of fund/i.test(s.officialName)) continue;

    const rule = CATEGORY_RULES.find((r) => r.match(s.section));
    if (!rule) continue;

    // Index category: headline Nifty 50 / Sensex trackers only, not the
    // dozens of factor/sector index products.
    if (rule.slug === "index") {
      if (!/nifty\s*50 index|sensex index/i.test(s.officialName)) continue;
      if (/next|equal|value|momentum|quality|low vol|shariah|bank|it\b|pharma/i.test(s.officialName)) continue;
    }

    const amcRank = AMC_WHITELIST.findIndex((a) => a.match.test(s.amcFull));
    if (amcRank === -1) continue;

    const list = byCategory.get(rule.slug) ?? [];
    const name = displayName(s.officialName, [s.amcFull, AMC_WHITELIST[amcRank].short]);
    // One fund per AMC per category (segregated-portfolio duplicates etc.)
    if (list.some((f) => f.amc === AMC_WHITELIST[amcRank].short && f.name === name)) continue;
    list.push({
      schemeCode: s.code,
      category: rule.slug,
      amc: AMC_WHITELIST[amcRank].short,
      amcRank,
      name,
      isin: s.isin,
      nav: s.nav,
      asOf: s.asOf,
    });
    byCategory.set(rule.slug, list);
  }

  const out: DiscoveredFund[] = [];
  for (const rule of CATEGORY_RULES) {
    const list = (byCategory.get(rule.slug) ?? [])
      .sort((a, b) => a.amcRank - b.amcRank)
      .slice(0, rule.cap);
    out.push(...list);
  }
  return out.slice(0, limit);
}

/** Gold & silver ETFs, discovered by name — no FoFs, no hardcoded codes. */
function discoverMetalETFs(schemes: AmfiScheme[], cap = 24): DiscoveredFund[] {
  const out: DiscoveredFund[] = [];
  const seen = new Set<string>();
  for (const s of schemes) {
    const n = s.officialName;
    if (!/\b(etf|bees)\b/i.test(n)) continue;
    if (/fof|fund of fund/i.test(n)) continue;
    const isGold = /\bgold\b/i.test(n);
    const isSilver = /\bsilver\b/i.test(n);
    if (isGold === isSilver) continue; // neither, or a combined product
    if (seen.has(s.code)) continue;
    seen.add(s.code);
    const amcRank = AMC_WHITELIST.findIndex((a) => a.match.test(s.amcFull));
    out.push({
      schemeCode: s.code,
      category: isGold ? "gold-etf" : "silver-etf",
      amc: amcRank >= 0 ? AMC_WHITELIST[amcRank].short : s.amcFull || "—",
      amcRank: amcRank >= 0 ? amcRank : AMC_WHITELIST.length,
      name: displayName(n, [s.amcFull, amcRank >= 0 ? AMC_WHITELIST[amcRank].short : undefined]),
      isin: s.isin,
      nav: s.nav,
      asOf: s.asOf,
    });
  }
  return out
    .sort((a, b) => (a.category === b.category ? a.amcRank - b.amcRank : a.category.localeCompare(b.category)))
    .slice(0, cap);
}

// ─── Public API ─────────────────────────────────────────────────────

/** Top ~100 Direct-Growth funds across the tracked SEBI categories,
 *  with NAV + 6M/1Y/2Y/3Y/5Y/10Y returns + rating/expense. */
export async function getTopMutualFunds(limit = TOP_FUND_LIMIT): Promise<MFLiveRow[]> {
  const schemes = await fetchAmfiSchemes();
  const funds = discoverTopFunds(schemes, limit);
  return enrichFunds(funds);
}

/** Every major Indian gold & silver ETF (discovered live from AMFI). */
export async function getMetalETFs(): Promise<MFLiveRow[]> {
  const schemes = await fetchAmfiSchemes();
  const etfs = discoverMetalETFs(schemes);
  return enrichFunds(etfs);
}

async function enrichFunds(funds: DiscoveredFund[]): Promise<MFLiveRow[]> {
  const [returnsList, enrichList] = await Promise.all([
    mapLimit(funds, 12, (f) => fetchSchemeReturns(f.schemeCode)),
    mapLimit(funds, 12, (f) => (f.isin ? fetchKuveraEnrichment(f.isin) : Promise.resolve(null))),
  ]);

  return funds.map((f, i): MFLiveRow => {
    const ret = returnsList[i];
    const enrich = enrichList[i];
    return {
      schemeCode: f.schemeCode,
      category: f.category,
      amc: f.amc,
      name: f.name,
      nav: f.nav ?? ret?.currentNav ?? null,
      asOf: f.asOf ?? ret?.currentDate ?? null,
      return6m: ret?.return6m ?? null,
      // Kuvera's published 1/3/5Y CAGRs backstop MFAPI outages.
      return1y: ret?.return1y ?? enrich?.return1y ?? null,
      return2y: ret?.return2y ?? null,
      return3y: ret?.return3y ?? enrich?.return3y ?? null,
      return5y: ret?.return5y ?? enrich?.return5y ?? null,
      return10y: ret?.return10y ?? null,
      crisilRating: enrich?.crisilRating ?? null,
      expenseRatio: enrich?.expenseRatio ?? null,
      sparkline30d: ret?.sparkline30d ?? [],
      found: true,
    };
  });
}

/** Bounded-concurrency map — ~100 funds × 2 upstreams needs a polite pool. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = await fn(items[i]);
      } catch {
        results[i] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// ─── Kuvera enrichment (rating, expense ratio, fallback returns) ────

export interface MFEnrichment {
  crisilRating: number | null;
  expenseRatio: number | null;
  return1y: number | null;
  return3y: number | null;
  return5y: number | null;
}

async function fetchKuveraEnrichment(isin: string): Promise<MFEnrichment | null> {
  try {
    const res = await fetch(`${KUVERA_PROXY_BASE}/${encodeURIComponent(isin)}`, {
      next: { revalidate: HISTORY_REVALIDATE, tags: ["kuvera", `kuvera:${isin}`] },
      headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    // Kuvera returns either a single object or a one-element array.
    const fund = (Array.isArray(body) ? body[0] : body) as Record<string, unknown> | undefined;
    if (!fund || typeof fund !== "object") return null;
    const returns = (fund.returns ?? {}) as Record<string, unknown>;
    const out: MFEnrichment = {
      crisilRating: pickNumber(fund.crisil_rating ?? fund.fund_rating),
      expenseRatio: pickNumber(fund.expense_ratio),
      return1y: pickNumber(returns.year_1),
      return3y: pickNumber(returns.year_3),
      return5y: pickNumber(returns.year_5),
    };
    return Object.values(out).some((v) => v != null) ? out : null;
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

// ─── MFAPI historical returns ───────────────────────────────────────

interface SchemeReturns {
  currentNav: number;
  currentDate: string;
  return6m: number | null;
  return1y: number | null;
  return2y: number | null;
  return3y: number | null;
  return5y: number | null;
  return10y: number | null;
  /** Oldest-first NAV history, ~30 points. */
  sparkline30d: number[];
}

interface MFAPIResponse {
  meta?: { scheme_name?: string };
  data?: Array<{ date: string; nav: string }>;
  status?: string;
}

/** Pre-parsed NAV point: epoch ms + numeric NAV, newest-first. */
interface NavPoint {
  ts: number;
  nav: number;
}

async function fetchSchemeReturns(schemeCode: string): Promise<SchemeReturns | null> {
  try {
    const res = await fetch(`${MFAPI_BASE}/${schemeCode}`, {
      next: { revalidate: HISTORY_REVALIDATE, tags: ["mfapi", `mfapi:${schemeCode}`] },
      headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body: MFAPIResponse = await res.json();
    if (!body.data || body.data.length === 0) return null;

    // Parse dates and NAVs once — the return windows below all walk the
    // same pre-parsed array instead of re-parsing per lookup.
    const history: NavPoint[] = [];
    for (const row of body.data) {
      const ts = parseMFAPIDate(row.date);
      if (!ts) continue;
      const nav = parseFloat(row.nav);
      if (!Number.isNaN(nav) && nav > 0) history.push({ ts, nav });
    }
    if (history.length === 0) return null;

    // MFAPI returns newest-first; first point is latest.
    const { ts: currentTs, nav: currentNav } = history[0];

    return {
      currentNav,
      currentDate: body.data[0].date,
      return6m: computeSimpleReturn(history, currentTs, currentNav, 183),
      return1y: computeCAGR(history, currentTs, currentNav, 365),
      return2y: computeCAGR(history, currentTs, currentNav, 2 * 365),
      return3y: computeCAGR(history, currentTs, currentNav, 3 * 365),
      return5y: computeCAGR(history, currentTs, currentNav, 5 * 365),
      return10y: computeCAGR(history, currentTs, currentNav, 10 * 365),
      sparkline30d: history.slice(0, 30).map((p) => p.nav).reverse(),
    };
  } catch {
    return null;
  }
}

/** MFAPI returns dates as "DD-MM-YYYY". Return epoch ms or null. */
function parseMFAPIDate(s: string): number | null {
  const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/** Walk the (newest-first) history and find the closest point at or before `targetTs`. */
function findPastNav(history: NavPoint[], targetTs: number): NavPoint | null {
  for (const point of history) {
    if (point.ts <= targetTs) return point;
  }
  return null;
}

/** Annualised CAGR over `daysBack` days. Requires the history to actually
 *  reach at least ~90% of the window so a 4-year-old fund doesn't report
 *  a fake "10Y" return computed from its inception NAV. */
function computeCAGR(
  history: NavPoint[],
  currentTs: number,
  currentNav: number,
  daysBack: number,
): number | null {
  const past = findPastNav(history, currentTs - daysBack * DAY_MS);
  if (!past) return null;
  const actualDays = (currentTs - past.ts) / DAY_MS;
  if (actualDays < daysBack * 0.9) return null;
  const years = actualDays / 365.25;
  if (years <= 0.1) return null;
  return (Math.pow(currentNav / past.nav, 1 / years) - 1) * 100;
}

/** Simple (non-annualised) percent change over a sub-year window. */
function computeSimpleReturn(
  history: NavPoint[],
  currentTs: number,
  currentNav: number,
  daysBack: number,
): number | null {
  const past = findPastNav(history, currentTs - daysBack * DAY_MS);
  if (!past) return null;
  if ((currentTs - past.ts) / DAY_MS < daysBack * 0.9) return null;
  return (currentNav / past.nav - 1) * 100;
}
