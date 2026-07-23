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
  returns1m?: number;
  returns3m?: number;
  returns6m?: number;
  returns1y?: number;
  returns2y?: number;
  returns3y?: number;
  returns5y?: number;
  sinceInception?: number;
  /** Manager logo URL (resolved Sanity asset), when seeded. */
  logoUrl?: string;
  asOfDate: string;
  source?: string;
}

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

async function safeFetch<T>(query: string, fallback: T, params?: Record<string, unknown>, tags: string[] = []): Promise<T> {
  if (!isSanityConfigured) return fallback;
  try {
    return await sanityClient.fetch(query, params ?? {}, {
      next: { revalidate: 300, tags },
    });
  } catch (err) {
    console.warn("Sanity fetch failed:", err);
    return fallback;
  }
}

export async function getStockAnalyses(): Promise<StockAnalysisCard[]> {
  return safeFetch<StockAnalysisCard[]>(allStockAnalysesQuery, [], undefined, ["stockAnalysis"]);
}

export async function getStockAnalysisSlugs(): Promise<string[]> {
  return safeFetch<string[]>(stockAnalysisSlugsQuery, [], undefined, ["stockAnalysis"]);
}

export async function getStockAnalysis(slug: string): Promise<StockAnalysisDetail | null> {
  if (!isSanityConfigured) return null;
  try {
    return await sanityClient.fetch(stockAnalysisBySlugQuery, { slug }, {
      next: { revalidate: 300, tags: ["stockAnalysis", `stockAnalysis:${slug}`] },
    });
  } catch (err) {
    console.warn("Sanity fetch failed:", err);
    return null;
  }
}

export async function getPmsStrategies(): Promise<PmsStrategy[]> {
  return safeFetch<PmsStrategy[]>(allPmsStrategiesQuery, [], undefined, ["pmsStrategy"]);
}

export async function getLivePmsStrategies(): Promise<LivePmsStrategy[]> {
  return safeFetch<LivePmsStrategy[]>(livePmsStrategiesQuery, [], undefined, ["pmsStrategy"]);
}

/**
 * The current benchmark document, or null when Sanity isn't configured / has
 * no benchmark yet / the fetch fails. Callers pass the result through
 * toBenchmark(), which falls back to the last stored values on null — so the
 * pages never crash when the document is absent.
 */
export async function getBenchmark(): Promise<LiveBenchmark | null> {
  return safeFetch<LiveBenchmark | null>(benchmarkQuery, null, undefined, ["benchmark"]);
}

export async function getAifFunds(): Promise<AifFund[]> {
  return safeFetch<AifFund[]>(allAifFundsQuery, [], undefined, ["aifFund"]);
}

export async function getUnlistedShares(): Promise<UnlistedShare[]> {
  return safeFetch<UnlistedShare[]>(allUnlistedSharesQuery, [], undefined, ["unlistedShare"]);
}
