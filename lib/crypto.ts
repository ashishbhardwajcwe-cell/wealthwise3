/**
 * CoinGecko free-tier integration.
 *
 * No API key required. Free tier is generous (~30 calls/min, ~10k/month).
 * We rely on Next.js fetch caching: a single shared upstream call per
 * revalidation window across all visitors per region.
 *
 * Docs: https://www.coingecko.com/en/api/documentation
 */

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

/** Cache the upstream response for 5 minutes. ~290 calls / region / day. */
const REVALIDATE_SECONDS = 300;

export interface CoinMarketRow {
  id: string;
  symbol: string;     // e.g. "btc"
  name: string;       // e.g. "Bitcoin"
  image: string;
  rank: number;
  priceInr: number;
  marketCapInr: number;
  volume24hInr: number;
  change24hPct: number | null;
  change7dPct: number | null;
  sparkline7d: number[];   // 168 hourly prices
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
  sparkline_in_7d?: { price?: number[] };
}

export async function getTopCryptoInINR(limit: number = 10): Promise<CoinMarketRow[]> {
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
      sparkline7d: r.sparkline_in_7d?.price ?? [],
    }));
  } catch (err) {
    console.warn("CoinGecko fetch failed:", err);
    return [];
  }
}

/** USD prices for a small set of coins — secondary display alongside INR. */
export async function getCoinUsdPrices(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
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
