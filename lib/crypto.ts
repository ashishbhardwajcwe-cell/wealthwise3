/**
 * CoinGecko free-tier integration.
 *
 * Free tier: ~30 calls/min, ~10k/month, no API key required.
 * Single shared upstream call per revalidation window per region.
 */

// A paid CoinGecko key (env COINGECKO_API_KEY) switches the client to the Pro
// host + auth header. Live market data works fine on the free tier; multi-year
// history does NOT (free market_chart is capped to 365 days), so long-term
// returns are computed from CryptoCompare's free daily-history API instead —
// see getCoinLongTermReturns.
const COINGECKO_PRO_KEY = process.env.COINGECKO_API_KEY?.trim() || "";
const COINGECKO_BASE = COINGECKO_PRO_KEY
  ? "https://pro-api.coingecko.com/api/v3"
  : "https://api.coingecko.com/api/v3";

const CRYPTOCOMPARE_BASE = "https://min-api.cryptocompare.com/data/v2";

const BROWSER_UA =
  "Mozilla/5.0 (compatible; PlanMyCashflows/1.0; +https://planmycashflows.com)";

const DAY_MS = 24 * 60 * 60 * 1000;

function cgHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (COINGECKO_PRO_KEY) h["x-cg-pro-api-key"] = COINGECKO_PRO_KEY;
  return h;
}

const REVALIDATE_SECONDS = 300; // 5 min cache for live prices
const HISTORY_REVALIDATE = 60 * 60 * 24; // 24h for historical (long-term returns barely move day-to-day)

export interface CoinMarketRow {
  id: string;
  symbol: string;
  name: string;
  image: string;
  rank: number;
  priceInr: number;
  marketCapInr: number;
  volume24hInr: number;
  change24hPct: number | null;
  change7dPct: number | null;
  change30dPct: number | null;
  change1yPct: number | null;
  /** Total percent change over the trailing 2 / 3 / 5 / 10 years (NOT annualised
   *  — matches crypto convention; the volatility makes annualisation noisy). */
  change2yPct: number | null;
  change3yPct: number | null;
  change5yPct: number | null;
  change10yPct: number | null;
  athChangePct: number | null;
  high24hInr: number | null;
  low24hInr: number | null;
  sparkline7d: number[];
}

interface CoinGeckoMarketRow {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  market_cap_rank: number | null;
  price_change_percentage_24h: number | null;
  price_change_percentage_7d_in_currency: number | null;
  price_change_percentage_30d_in_currency: number | null;
  price_change_percentage_1y_in_currency: number | null;
  ath_change_percentage: number | null;
  high_24h: number | null;
  low_24h: number | null;
  sparkline_in_7d?: { price?: number[] };
}

export async function getTopCryptoInINR(limit: number = 100): Promise<CoinMarketRow[]> {
  const url =
    `${COINGECKO_BASE}/coins/markets` +
    `?vs_currency=inr` +
    `&order=market_cap_desc` +
    `&per_page=${limit}` +
    `&page=1` +
    `&sparkline=true` +
    // 1y / 30d come free in the same call — extending price_change_percentage
    // is the cheapest way to add long-period columns.
    `&price_change_percentage=24h,7d,30d,1y`;

  try {
    const res = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["crypto:markets"] },
      headers: cgHeaders(),
    });
    if (!res.ok) {
      console.warn(`CoinGecko returned ${res.status}: ${res.statusText}`);
      return [];
    }
    const raw: CoinGeckoMarketRow[] = await res.json();
    return raw.map((r): CoinMarketRow => ({
      id: r.id,
      symbol: r.symbol.toUpperCase(),
      name: r.name,
      image: r.image,
      rank: r.market_cap_rank ?? 0,
      priceInr: r.current_price,
      marketCapInr: r.market_cap,
      volume24hInr: r.total_volume,
      change24hPct: r.price_change_percentage_24h,
      change7dPct: r.price_change_percentage_7d_in_currency,
      change30dPct: r.price_change_percentage_30d_in_currency,
      change1yPct: r.price_change_percentage_1y_in_currency,
      // 2Y/3Y/5Y/10Y are filled in by getCoinLongTermReturns — separate call.
      change2yPct: null,
      change3yPct: null,
      change5yPct: null,
      change10yPct: null,
      athChangePct: r.ath_change_percentage,
      high24hInr: r.high_24h,
      low24hInr: r.low_24h,
      sparkline7d: r.sparkline_in_7d?.price ?? [],
    }));
  } catch (err) {
    console.warn("CoinGecko fetch failed:", err);
    return [];
  }
}

export async function getCoinUsdPrices(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  // CoinGecko caps id list — chunk if needed (>120 ids in one URL).
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids.join(",")}&vs_currencies=usd`;
  try {
    const res = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["crypto:markets"] },
      headers: cgHeaders(),
    });
    if (!res.ok) return {};
    const data: Record<string, { usd: number }> = await res.json();
    const out: Record<string, number> = {};
    for (const id of ids) if (data[id]?.usd != null) out[id] = data[id].usd;
    return out;
  } catch {
    return {};
  }
}

export interface LongTermReturns {
  change2yPct: number | null;
  change3yPct: number | null;
  change5yPct: number | null;
  change10yPct: number | null;
}

/**
 * 2Y / 3Y / 5Y / 10Y total returns for the supplied coins, computed from
 * CryptoCompare's free daily-history API (`histoday?allData=true` — the
 * full price history in one call, no API key required). CoinGecko's free
 * tier caps history at 365 days, which is why this doesn't come from the
 * same source as the live quotes.
 *
 * Strategy:
 *  - Promise.allSettled — one failed coin doesn't kill the batch.
 *  - AbortSignal.timeout(8000) — keep total render time bounded.
 *  - 24h Next.js ISR cache per coin — one upstream call per coin per day.
 *  - INR pairs preferred; USD used when the INR pair has no deep history.
 *
 * Pass a small `limit` (default 30) — long histories are meaningful for
 * the large caps and each coin costs an upstream call on cold cache.
 */
export async function getCoinLongTermReturns(
  coins: Array<{ id: string; symbol: string }>,
  limit: number = 30,
): Promise<Map<string, LongTermReturns>> {
  const out = new Map<string, LongTermReturns>();
  const subset = coins.slice(0, limit);
  if (subset.length === 0) return out;

  const results = await Promise.allSettled(
    subset.map((c) => fetchCoinHistoryReturns(c.symbol)),
  );
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) out.set(subset[i].id, r.value);
  });
  return out;
}

interface CryptoCompareHistoDay {
  Response?: string;
  Data?: { Data?: Array<{ time: number; close: number }> };
}

async function fetchCoinHistoryReturns(symbol: string): Promise<LongTermReturns | null> {
  const history =
    (await fetchHistoDay(symbol, "INR")) ?? (await fetchHistoDay(symbol, "USD"));
  if (!history || history.length < 2) return null;

  // Oldest-first daily closes; last entry is the latest.
  const latest = history[history.length - 1];
  if (!latest.close || latest.close <= 0) return null;

  return {
    change2yPct: totalReturn(history, latest, 2 * 365),
    change3yPct: totalReturn(history, latest, 3 * 365),
    change5yPct: totalReturn(history, latest, 5 * 365),
    change10yPct: totalReturn(history, latest, 10 * 365),
  };
}

async function fetchHistoDay(
  symbol: string,
  tsym: "INR" | "USD",
): Promise<Array<{ time: number; close: number }> | null> {
  try {
    const url =
      `${CRYPTOCOMPARE_BASE}/histoday` +
      `?fsym=${encodeURIComponent(symbol.toUpperCase())}` +
      `&tsym=${tsym}&allData=true`;
    const res = await fetch(url, {
      next: { revalidate: HISTORY_REVALIDATE, tags: ["crypto:history", `crypto:history:${symbol}:${tsym}`] },
      headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body: CryptoCompareHistoDay = await res.json();
    if (body.Response !== "Success") return null;
    const data = (body.Data?.Data ?? []).filter((p) => p.close > 0);
    // A pair with under ~1.5 years of candles can't support any long column.
    return data.length >= 540 ? data : null;
  } catch {
    return null;
  }
}

/** Total percent change vs the close nearest `daysBack` days ago; null when
 *  the history doesn't actually reach (~90% of) that far back — a coin
 *  launched in 2022 must not report a "10Y" return from its listing price. */
function totalReturn(
  history: Array<{ time: number; close: number }>,
  latest: { time: number; close: number },
  daysBack: number,
): number | null {
  const targetSec = latest.time - (daysBack * DAY_MS) / 1000;
  let past: { time: number; close: number } | null = null;
  for (const point of history) {
    if (point.time >= targetSec) {
      past = point;
      break;
    }
  }
  if (!past || past.close <= 0) return null;
  const actualDays = (latest.time - past.time) / 86400;
  if (actualDays < daysBack * 0.9) return null;
  return (latest.close / past.close - 1) * 100;
}
