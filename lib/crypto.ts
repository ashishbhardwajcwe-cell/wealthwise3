/**
 * CoinGecko free-tier integration.
 *
 * Free tier: ~30 calls/min, ~10k/month, no API key required.
 * Single shared upstream call per revalidation window per region.
 */

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
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
  /** Total percent change over the trailing 3 / 5 / 10 years (NOT annualised
   *  — matches crypto convention; the volatility makes annualisation noisy). */
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
      headers: { Accept: "application/json" },
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
      // 3Y/5Y/10Y are filled in by getCoinLongTermReturns — separate call.
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
      headers: { Accept: "application/json" },
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
  change3yPct: number | null;
  change5yPct: number | null;
  change10yPct: number | null;
}

/**
 * Fetch 3Y / 5Y / 10Y returns for the supplied coin ids. Each coin's
 * full history comes from a single `market_chart?days=max` call, from
 * which we extract the closest price at -3y, -5y, -10y and compute
 * simple percent change vs the latest entry.
 *
 * Strategy:
 *  - Promise.allSettled — one failed coin doesn't kill the batch.
 *  - AbortSignal.timeout(8000) — keep total render time bounded.
 *  - 24h Next.js ISR cache per coin URL — call CoinGecko at most once
 *    per coin per day per region.
 *
 * Free-tier rate limits matter — pass a small `limit` (default 25) so
 * the cold start does not exhaust the per-minute budget.
 */
export async function getCoinLongTermReturns(
  ids: string[],
  limit: number = 25,
): Promise<Map<string, LongTermReturns>> {
  const out = new Map<string, LongTermReturns>();
  const subset = ids.slice(0, limit);
  if (subset.length === 0) return out;

  const results = await Promise.allSettled(
    subset.map((id) => fetchCoinHistory(id)),
  );
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) out.set(subset[i], r.value);
  });
  return out;
}

interface MarketChartResponse {
  prices?: Array<[number, number]>; // [tsMs, priceInr]
}

async function fetchCoinHistory(id: string): Promise<LongTermReturns | null> {
  try {
    const url =
      `${COINGECKO_BASE}/coins/${encodeURIComponent(id)}/market_chart` +
      `?vs_currency=inr&days=max&interval=daily`;
    const res = await fetch(url, {
      next: { revalidate: HISTORY_REVALIDATE, tags: ["crypto:history", `crypto:history:${id}`] },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body: MarketChartResponse = await res.json();
    const prices = body.prices;
    if (!prices || prices.length < 2) return null;

    const latest = prices[prices.length - 1];
    const currentTs = latest[0];
    const currentPrice = latest[1];
    if (!currentPrice || currentPrice <= 0) return null;

    return {
      change3yPct: simpleReturn(prices, currentTs, currentPrice, 3 * 365),
      change5yPct: simpleReturn(prices, currentTs, currentPrice, 5 * 365),
      change10yPct: simpleReturn(prices, currentTs, currentPrice, 10 * 365),
    };
  } catch {
    return null;
  }
}

/** Find the price closest to `currentTs - daysBack` days and compute simple % change. */
function simpleReturn(
  prices: Array<[number, number]>,
  currentTs: number,
  currentPrice: number,
  daysBack: number,
): number | null {
  const targetTs = currentTs - daysBack * 24 * 60 * 60 * 1000;
  // History is oldest-first; first entry whose ts >= targetTs is the closest match.
  let pastPrice: number | null = null;
  for (const [ts, price] of prices) {
    if (ts >= targetTs && price > 0) {
      pastPrice = price;
      break;
    }
  }
  if (pastPrice == null) return null;
  return (currentPrice / pastPrice - 1) * 100;
}
