/**
 * Adapters that read PMS / AIF / Unlisted Share / Stock Analysis data
 * from Sanity. Each returns an empty array when Sanity is not configured
 * or has no documents yet — the calling page hides the section in that case.
 */

import { sanityClient, isSanityConfigured } from "@/sanity/client";
import {
  allStockAnalysesQuery,
  stockAnalysisBySlugQuery,
  stockAnalysisSlugsQuery,
  allPmsStrategiesQuery,
  livePmsStrategiesQuery,
  pmsManagerLogosQuery,
  benchmarkQuery,
  allAifFundsQuery,
  allUnlistedSharesQuery,
} from "@/sanity/queries";

export interface StockAnalysisCard {
  _id: string;
  slug: string;
  title: string;
  ticker: string;
  company: string;
  sector?: string;
  marketCap?: "Large" | "Mid" | "Small" | "Micro";
  thesis?: string;
  keyMetrics?: {
    cmp?: number;
    pe?: number;
    roe?: number;
    debtToEquity?: number;
    marketCapCr?: number;
  };
  analysisDate: string;
  author?: { name?: string; role?: string };
}

export interface StockAnalysisDetail extends StockAnalysisCard {
  body?: unknown;
  strengths?: string[];
  risks?: string[];
  conclusion?: string;
  author?: { name?: string; role?: string; image?: unknown };
}

export interface PmsStrategy {
  _id: string;
  strategyName: string;
  manager: string;
  category?: string;
  aumCr?: number;
  minInvestmentL?: number;
  returns?: { y1?: number; y3?: number; y5?: number; sinceInception?: number };
  fees?: { fixed?: number; performance?: number; hurdle?: number };
  asOfDate: string;
  source?: string;
  notes?: string;
}

/**
 * PMS strategy with returns flattened to top-level fields — the shape
 * consumed by the homepage grid, the compare tool and the league table.
 * Sourced from APMI / SEBI-mandated disclosures via scripts/import-pms.mjs.
 */
export interface LivePmsStrategy {
  _id: string;
  strategyName: string;
  manager: string;
  category?: string;
  aumCr?: number;
  minInvestmentL?: number;
  /** When the approach launched (ISO date). Distinct from asOfDate. */
  inceptionDate?: string;
  returns1m?: number;
  returns3m?: number;
  returns6m?: number;
  returns1y?: number;
  returns2y?: number;
  returns3y?: number;
  returns4y?: number;
  returns5y?: number;
  sinceInception?: number;
  asOfDate: string;
  source?: string;
}

/**
 * manager name → logo URL. Sent to the explorer alongside the feed instead of
 * stamping the same URL onto all ~1,700 rows (see pmsManagerLogosQuery).
 */
export type PmsManagerLogos = Record<string, string>;

/**
 * The benchmark the PMS explorer measures alpha against (S&P BSE 500 TRI),
 * with return fields flattened to mirror LivePmsStrategy. Any period may be
 * null when the benchmark document leaves it blank. getBenchmark() returns
 * null when Sanity has no benchmark document, and the UI falls back to its
 * last stored values.
 */
export interface LiveBenchmark {
  name: string;
  returns1m: number | null;
  returns3m: number | null;
  returns6m: number | null;
  returns1y: number | null;
  returns2y: number | null;
  returns3y: number | null;
  returns4y: number | null;
  returns5y: number | null;
  sinceInception: number | null;
  asOfDate: string | null;
  source: string | null;
}

export interface AifFund {
  _id: string;
  fundName: string;
  /** SEBI registration number — the directory's natural key. */
  registrationNo?: string;
  category?: string; // broad SEBI category: "I" | "II" | "III"
  registrationDate?: string;
  sponsor?: string;
  manager?: string;
  vintage?: number;
  fundSize?: number;
  minCommitmentCr?: number;
  tenor?: number;
  fees?: { management?: number; carry?: number; hurdle?: number };
  returns?: { netIrr?: number; moic?: number; dpi?: number; tvpi?: number };
  asOfDate: string;
  source?: string;
  notes?: string;
}

export interface UnlistedShare {
  _id: string;
  company: string;
  slug?: string;
  sector?: string;
  /** Retail/indicative price per share (₹) from the partner's daily list. */
  indicativePriceINR?: number;
  depository?: string;
  lotSize?: number;
  ipoStatus?: string;
  /** Blank until the first price import lands. */
  asOfDate?: string;
  summary?: string;
  /** Company logo URL (resolved Sanity asset), when seeded. */
  logoUrl?: string;
}

/**
 * Default data-cache window. Deliberately generous: Next resolves a route's
 * revalidation to the LOWEST revalidate among its fetches, so a short window
 * pinned here silently overrides every page's own `export const revalidate`.
 * It previously sat at 300s, which quietly reduced /pms/[slug] (86400) and the
 * unlisted page (3600) to five minutes — meaning ~1,600 on-demand strategy
 * pages regenerated every 5 minutes, each re-fetching the full ~1,700-row feed.
 *
 * Callers that genuinely need fresher data pass their own `revalidate`; the
 * rest inherit their route's window, which is what the page authors intended.
 */
const DEFAULT_REVALIDATE = 3600;

async function safeFetch<T>(
  query: string,
  fallback: T,
  params?: Record<string, unknown>,
  tags: string[] = [],
  revalidate: number = DEFAULT_REVALIDATE,
): Promise<T> {
  if (!isSanityConfigured) return fallback;
  try {
    return await sanityClient.fetch(query, params ?? {}, {
      next: { revalidate, tags },
    });
  } catch (err) {
    console.warn("Sanity fetch failed:", err);
    return fallback;
  }
}

/**
 * Per-dataset cache windows, matched to how often each feed actually changes.
 * Every getter takes an override so a page that needs fresher data can ask for
 * it explicitly, rather than one short global window silently shortening every
 * route's ISR interval (see DEFAULT_REVALIDATE above).
 */
const REVALIDATE = {
  /** Editorial, published ad-hoc. */
  stockAnalysis: 300,
  /** APMI discloses monthly — an hour is far fresher than the data ever is. */
  pms: 3600,
  /** Refreshed monthly alongside the strategy returns. */
  benchmark: 3600,
  /** SEBI registry; changes slowly. */
  aif: 3600,
  /** Partner price list imports once daily. */
  unlisted: 3600,
} as const;

export async function getStockAnalyses(revalidate = REVALIDATE.stockAnalysis): Promise<StockAnalysisCard[]> {
  return safeFetch<StockAnalysisCard[]>(allStockAnalysesQuery, [], undefined, ["stockAnalysis"], revalidate);
}

export async function getStockAnalysisSlugs(revalidate = REVALIDATE.stockAnalysis): Promise<string[]> {
  return safeFetch<string[]>(stockAnalysisSlugsQuery, [], undefined, ["stockAnalysis"], revalidate);
}

export async function getStockAnalysis(
  slug: string,
  revalidate = REVALIDATE.stockAnalysis,
): Promise<StockAnalysisDetail | null> {
  if (!isSanityConfigured) return null;
  try {
    return await sanityClient.fetch(stockAnalysisBySlugQuery, { slug }, {
      next: { revalidate, tags: ["stockAnalysis", `stockAnalysis:${slug}`] },
    });
  } catch (err) {
    console.warn("Sanity fetch failed:", err);
    return null;
  }
}

export async function getPmsStrategies(revalidate = REVALIDATE.pms): Promise<PmsStrategy[]> {
  return safeFetch<PmsStrategy[]>(allPmsStrategiesQuery, [], undefined, ["pmsStrategy"], revalidate);
}

export async function getLivePmsStrategies(revalidate = REVALIDATE.pms): Promise<LivePmsStrategy[]> {
  return safeFetch<LivePmsStrategy[]>(livePmsStrategiesQuery, [], undefined, ["pmsStrategy"], revalidate);
}

/** Collapse the per-strategy logo rows into one entry per manager. */
export async function getPmsManagerLogos(revalidate = REVALIDATE.pms): Promise<PmsManagerLogos> {
  const rows = await safeFetch<{ manager?: string; logoUrl?: string }[]>(
    pmsManagerLogosQuery, [], undefined, ["pmsStrategy"], revalidate,
  );
  const map: PmsManagerLogos = {};
  for (const r of rows) {
    if (r.manager && r.logoUrl && !map[r.manager]) map[r.manager] = r.logoUrl;
  }
  return map;
}

/**
 * The current benchmark document, or null when Sanity isn't configured / has
 * no benchmark yet / the fetch fails. Callers pass the result through
 * toBenchmark(), which falls back to the last stored values on null — so the
 * pages never crash when the document is absent.
 */
export async function getBenchmark(revalidate = REVALIDATE.benchmark): Promise<LiveBenchmark | null> {
  return safeFetch<LiveBenchmark | null>(benchmarkQuery, null, undefined, ["benchmark"], revalidate);
}

export async function getAifFunds(revalidate = REVALIDATE.aif): Promise<AifFund[]> {
  return safeFetch<AifFund[]>(allAifFundsQuery, [], undefined, ["aifFund"], revalidate);
}

export async function getUnlistedShares(revalidate = REVALIDATE.unlisted): Promise<UnlistedShare[]> {
  return safeFetch<UnlistedShare[]>(allUnlistedSharesQuery, [], undefined, ["unlistedShare"], revalidate);
}
