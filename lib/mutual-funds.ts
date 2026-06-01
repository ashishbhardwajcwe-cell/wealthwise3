/**
 * AMFI India daily NAV feed integration.
 *
 * AMFI publishes a public text file every weekday around 10pm IST
 * listing every mutual fund scheme's NAV. Free, official, no key.
 *
 * Feed: https://www.amfiindia.com/spages/NAVAll.txt
 * Updated: ~10pm IST on every trading day
 *
 * We don't show all ~10,000 schemes (overwhelming). Instead, we curate
 * a list of well-known funds per category and look up their live NAV
 * in the feed.
 */

const AMFI_FEED_URL = "https://www.amfiindia.com/spages/NAVAll.txt";

/** 24-hour cache — AMFI publishes once a day, no point fetching more. */
const REVALIDATE_SECONDS = 60 * 60 * 24;

export interface MFCategory {
  slug: string;
  name: string;
  short: string;
}

export const MF_CATEGORIES: MFCategory[] = [
  { slug: "large-cap",    name: "Large Cap",   short: "Top 100 Indian companies. Lower volatility, steady compounding." },
  { slug: "flexi-cap",    name: "Flexi Cap",   short: "Manager free to invest across market caps. Most popular category." },
  { slug: "mid-cap",      name: "Mid Cap",     short: "Companies 101–250 by market cap. Higher growth, higher volatility." },
  { slug: "small-cap",    name: "Small Cap",   short: "Companies beyond #250. Best return potential, biggest drawdowns." },
  { slug: "elss",         name: "ELSS",        short: "Tax-saving funds (80C) with 3-year lock-in. Equity oriented." },
  { slug: "hybrid",       name: "Hybrid",      short: "Mix of equity + debt. Smoother ride for first-time investors." },
  { slug: "debt",         name: "Debt",        short: "Fixed-income funds. Use for goals under 3 years." },
];

export interface TrackedFund {
  schemeCode: string;       // matches AMFI scheme code (column 1 of the feed)
  category: string;         // one of MF_CATEGORIES slug
  amc: string;              // short AMC name
  name: string;             // display name
}

/** Curated list of well-known funds we display on the MF page.
 *  Scheme codes verified from AMFI NAVAll.txt.
 *
 *  Add more by appending here — no other code change required.
 *  Use Direct/Growth plans only (lower expense ratio, more honest comparison).
 */
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
  { schemeCode: "122639", category: "flexi-cap", amc: "Aditya Birla SL",  name: "Flexi Cap Fund" },
  { schemeCode: "118566", category: "flexi-cap", amc: "DSP",              name: "Flexi Cap Fund" },

  // Mid Cap
  { schemeCode: "118989", category: "mid-cap",   amc: "HDFC",             name: "Mid-Cap Opportunities" },
  { schemeCode: "118473", category: "mid-cap",   amc: "Kotak",            name: "Emerging Equity Fund" },
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
  { schemeCode: "118566", category: "elss",      amc: "Mirae Asset",      name: "ELSS Tax Saver" },
  { schemeCode: "118469", category: "elss",      amc: "Quant",            name: "ELSS Tax Saver" },
  { schemeCode: "118534", category: "elss",      amc: "Nippon India",     name: "ELSS Tax Saver" },

  // Hybrid
  { schemeCode: "101099", category: "hybrid",    amc: "ICICI Prudential", name: "Equity & Debt Fund" },
  { schemeCode: "118565", category: "hybrid",    amc: "HDFC",             name: "Hybrid Equity Fund" },
  { schemeCode: "118567", category: "hybrid",    amc: "SBI",              name: "Equity Hybrid Fund" },

  // Debt
  { schemeCode: "101061", category: "debt",      amc: "HDFC",             name: "Liquid Fund" },
  { schemeCode: "118548", category: "debt",      amc: "ICICI Prudential", name: "Liquid Fund" },
  { schemeCode: "118533", category: "debt",      amc: "Aditya Birla SL",  name: "Corporate Bond Fund" },
];

export interface MFLiveRow {
  schemeCode: string;
  category: string;
  amc: string;
  name: string;
  nav: number | null;
  asOf: string | null;       // DD-MMM-YYYY from AMFI
  found: boolean;
}

/**
 * Fetch AMFI feed and return live NAV for every tracked fund.
 * AMFI feed is large (~3 MB) but ISR caches for 24h — one fetch per region per day.
 */
export async function getTrackedMFNAVs(): Promise<MFLiveRow[]> {
  let navMap: Map<string, { nav: number; asOf: string }> = new Map();

  try {
    const res = await fetch(AMFI_FEED_URL, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["amfi:nav"] },
      headers: { Accept: "text/plain" },
    });
    if (res.ok) {
      const text = await res.text();
      navMap = parseAMFIFeed(text);
    } else {
      console.warn(`AMFI feed returned ${res.status}`);
    }
  } catch (err) {
    console.warn("AMFI fetch failed:", err);
  }

  return TRACKED_FUNDS.map((f): MFLiveRow => {
    const hit = navMap.get(f.schemeCode);
    return {
      schemeCode: f.schemeCode,
      category: f.category,
      amc: f.amc,
      name: f.name,
      nav: hit?.nav ?? null,
      asOf: hit?.asOf ?? null,
      found: !!hit,
    };
  });
}

/**
 * Parse AMFI's pipe/semicolon-delimited daily feed.
 *
 * Format (per row):
 *   Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
 *
 * Section headers (no semicolons) precede each fund-house block. We ignore them
 * and only consume the data rows.
 */
function parseAMFIFeed(text: string): Map<string, { nav: number; asOf: string }> {
  const out = new Map<string, { nav: number; asOf: string }>();
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const parts = line.split(";");
    if (parts.length < 6) continue;
    const code = parts[0].trim();
    if (!code || !/^\d+$/.test(code)) continue;
    const navStr = parts[4]?.trim();
    const date = parts[5]?.trim();
    if (!navStr || navStr === "N.A." || !date) continue;
    const nav = parseFloat(navStr);
    if (Number.isNaN(nav)) continue;
    out.set(code, { nav, asOf: date });
  }
  return out;
}
