/**
 * CoinGecko free-tier integration.
 *
 * Free tier: ~30 calls/min, ~10k/month, no API key required.
 * Single shared upstream call per revalidation window per region.
 */

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const REVALIDATE_SECONDS = 300; // 5 min cache

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
    `&price_change_percentage=24h,7d`;

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
