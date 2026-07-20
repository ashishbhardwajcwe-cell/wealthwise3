/**
 * PMS strategy utilities shared by server pages (app/(site)/pms/[slug],
 * sitemap) and client components (explorer, league table). No "use client"
 * here — everything must stay callable on both sides.
 */

import type { LivePmsStrategy } from "@/lib/investment-data";
import { slugifyHeading } from "@/lib/slugify";

const PLAUSIBLE_MIN = -95;   // % — below this is a reporting artifact, not a real annualised return
const PLAUSIBLE_MAX = 300;   // % — above this in any period is almost certainly not annualised

/**
 * True when any of the strategy's headline returns falls outside the
 * plausible band for an annualised equity figure. APMI's feed mixes in
 * liquid-fund / structured-product / debt rows whose "return" columns are
 * not annualised equity returns (e.g. −113%, which is mathematically
 * impossible); those must not pollute a public performance table.
 */
export function hasImplausibleReturn(s: LivePmsStrategy): boolean {
  const vals = [s.returns1y, s.returns3y, s.returns5y];
  return vals.some((v) => typeof v === "number" && (v < PLAUSIBLE_MIN || v > PLAUSIBLE_MAX));
}

/** The trustworthy subset of the feed — the only rows any surface should show. */
export function cleanPmsStrategies(strategies: LivePmsStrategy[]): LivePmsStrategy[] {
  return strategies.filter((s) => !hasImplausibleReturn(s));
}

/**
 * Canonical URL slug for a PMS strategy: kebab-case of the strategy name;
 * when two strategies share a name, the kebab-case manager is appended to
 * disambiguate (e.g. "core-fund-stallion-asset"). Deterministic given the
 * same feed — every place that builds a /pms/... link MUST use this so
 * URLs never drift between the explorer, sitemap and static params.
 */
export function pmsStrategySlug(
  strategy: Pick<LivePmsStrategy, "strategyName" | "manager">,
  all: Array<Pick<LivePmsStrategy, "strategyName">>,
): string {
  const base = slugifyHeading(strategy.strategyName);
  const collisions = all.filter((s) => slugifyHeading(s.strategyName) === base);
  return collisions.length > 1 ? `${base}-${slugifyHeading(strategy.manager)}` : base;
}

/** Resolve a URL slug back to its strategy; null when nothing matches. */
export function findPmsStrategyBySlug(
  all: LivePmsStrategy[],
  slug: string,
): LivePmsStrategy | null {
  return all.find((s) => pmsStrategySlug(s, all) === slug) ?? null;
}
