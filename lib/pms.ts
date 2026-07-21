/**
 * PMS strategy utilities shared by server pages (app/(site)/pms/[slug],
 * sitemap) and client components (explorer, league table). No "use client"
 * here — everything must stay callable on both sides.
 */

import type { LivePmsStrategy } from "@/lib/investment-data";
import { slugifyHeading } from "@/lib/slugify";
import { latestAmfiDate } from "@/lib/format";

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

/** Minimum shape a feed row needs for slug computation. `manager` is only
 *  required when a name collision forces the disambiguating suffix. */
type SlugSource = Pick<LivePmsStrategy, "strategyName"> & { manager?: string };

/**
 * Per-feed slug cache. The naive formula (re-slugify the whole feed inside
 * every pmsStrategySlug call, and findPmsStrategyBySlug calling that per
 * candidate) is O(n²) — ~2.9M slugify calls per strategy-page render at
 * ~1,700 strategies, on every on-demand render, sitemap run and explorer
 * mount. One O(n) pass per feed array (keyed by array identity in a WeakMap,
 * so per-request server arrays are GC'd and the memoised client array is
 * computed once) produces identical slugs and O(1) lookups.
 */
interface SlugCache {
  /** feed row → its canonical slug */
  byRef: WeakMap<object, string>;
  /** base slug → how many rows share it (the collision rule's input) */
  baseCount: Map<string, number>;
  /** slug → first feed row that produces it (Array.find order) */
  bySlug: Map<string, SlugSource>;
}

const slugCaches = new WeakMap<object, SlugCache>();

function slugCacheFor(all: SlugSource[]): SlugCache {
  let cache = slugCaches.get(all);
  if (cache) return cache;

  const bases = all.map((s) => slugifyHeading(s.strategyName));
  const baseCount = new Map<string, number>();
  for (const b of bases) baseCount.set(b, (baseCount.get(b) ?? 0) + 1);

  const byRef = new WeakMap<object, string>();
  const bySlug = new Map<string, SlugSource>();
  all.forEach((s, i) => {
    const slug =
      (baseCount.get(bases[i]) ?? 0) > 1 && typeof s.manager === "string"
        ? `${bases[i]}-${slugifyHeading(s.manager)}`
        : bases[i];
    byRef.set(s, slug);
    if (!bySlug.has(slug)) bySlug.set(slug, s);
  });

  cache = { byRef, baseCount, bySlug };
  slugCaches.set(all, cache);
  return cache;
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
  const cache = slugCacheFor(all as SlugSource[]);
  const cached = cache.byRef.get(strategy);
  if (cached !== undefined) return cached;
  // `strategy` isn't an element of `all` (e.g. a copied object) — apply the
  // same collision rule against the cached counts.
  const base = slugifyHeading(strategy.strategyName);
  return (cache.baseCount.get(base) ?? 0) > 1 ? `${base}-${slugifyHeading(strategy.manager)}` : base;
}

/** Resolve a URL slug back to its strategy; null when nothing matches. */
export function findPmsStrategyBySlug(
  all: LivePmsStrategy[],
  slug: string,
): LivePmsStrategy | null {
  return (slugCacheFor(all).bySlug.get(slug) as LivePmsStrategy | undefined) ?? null;
}

/**
 * The subset of the feed the homepage's FeaturedStrategies section actually
 * needs, in feed order. The full feed (~1,700 rows) was being serialised into
 * the homepage payload to render at most 6 cards per tab. The component shows,
 * per tab, the FIRST `maxCards` rows in feed order ("All" = first `maxCards`
 * overall), derives its tab list from the categories present, and reports the
 * latest asOfDate — so this keeps: the first `maxCards` rows overall, the
 * first `maxCards` of every category, and the newest-dated row (for the
 * "as on" line). Renders pixel-identically to passing the whole feed.
 */
export function featuredPmsSubset(
  strategies: LivePmsStrategy[],
  maxCards = 6,
): LivePmsStrategy[] {
  const keep = new Set<LivePmsStrategy>();
  strategies.slice(0, maxCards).forEach((s) => keep.add(s));

  const perCategory = new Map<string, number>();
  for (const s of strategies) {
    if (!s.category) continue;
    const n = perCategory.get(s.category) ?? 0;
    if (n < maxCards) {
      perCategory.set(s.category, n + 1);
      keep.add(s);
    }
  }

  // The "as on" line shows latestAmfiDate() over the props — keep a row
  // carrying that exact winning date string, chosen by the same function,
  // so the trimmed props produce the same answer.
  const latest = latestAmfiDate(strategies.map((s) => s.asOfDate));
  if (latest) {
    const carrier = strategies.find((s) => s.asOfDate === latest);
    if (carrier) keep.add(carrier);
  }

  return strategies.filter((s) => keep.has(s));
}
