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
 * True when any of the strategy's ANNUALISED returns falls outside the
 * plausible band. APMI's feed mixes in liquid-fund / structured-product / debt
 * rows whose "return" columns are not annualised equity returns (e.g. −113%,
 * which is mathematically impossible); those must not pollute a public
 * performance table.
 *
 * Covers every annualised window the UI actually renders — 1Y, 2Y, 3Y, 5Y and
 * since-inception. 2Y and SI were previously missing, which let an artifact row
 * through whenever only those were corrupt: SI shows on the explorer cards and
 * in the returns table, and 2Y drives the ConsistencyDots "beat" count, so a
 * bogus figure in either one skewed exactly the judgement this guard exists to
 * protect.
 *
 * The sub-year windows (1M/3M/6M) are deliberately excluded: they are not
 * annualised, so the band doesn't describe them and applying it would drop
 * rows whose long-term figures are perfectly sound.
 */
export function hasImplausibleReturn(s: LivePmsStrategy): boolean {
  const annualised = [s.returns1y, s.returns2y, s.returns3y, s.returns5y, s.sinceInception];
  return annualised.some((v) => typeof v === "number" && (v < PLAUSIBLE_MIN || v > PLAUSIBLE_MAX));
}

/** The trustworthy subset of the feed — the only rows any surface should show. */
export function cleanPmsStrategies(strategies: LivePmsStrategy[]): LivePmsStrategy[] {
  return strategies.filter((s) => !hasImplausibleReturn(s));
}

/* ---------------------------------------------------------------------------
   Institutional and catch-all mandates
---------------------------------------------------------------------------- */

/**
 * Tokens that mark a reported row as an institutional or catch-all mandate.
 *
 * Matched against the strategy name normalised to spaces (so "Co-Investment"
 * and "Co Investment" are the same token) and tested with a space on each
 * side, which gives word-boundary semantics for free: " pf " matches
 * "PMS for PFs & Special Mandates" but not "Alpha PFC Portfolio", and
 * " esop " does not fire inside a longer word.
 *
 * Multi-word tokens are listed in their normalised form.
 */
const INSTITUTIONAL_TOKENS = [
  "provident fund", "provident funds", "pf", "pfs", "epfo", "epf",
  "special mandate", "special mandates",
  "customised", "customized", "custom portfolio", "customised portfolio", "customized portfolio",
  "discretionary customised", "non discretionary",
  "advisory",
  "co investment", "coinvestment",
  "esop",
  "treasury",
];

/**
 * Institutional and catch-all mandates reported under a PMS licence that no
 * retail investor can subscribe to. Their AUM dominates every sort and their
 * returns aggregate hundreds of unrelated client portfolios.
 *
 * The row that forced this: "PMS for PFs & Special Mandates" at ₹6.38 lakh
 * crore with no 3Y return — a real EPFO/provident-fund mandate run under a PMS
 * licence, and by a wide margin the largest AUM in the feed, so an AUM sort
 * opened the compare page on something nobody can buy. Each AMC's catch-all
 * buckets ("Customised Discretionary Portfolio", "Non Discretionary
 * Portfolio", "Advisory") have the same problem from the other direction: they
 * aggregate hundreds of client-specific portfolios into one reported row, so
 * the returns describe no strategy in particular.
 *
 * This is a DISPLAY concern. Nothing is deleted or unpublished — the explorer
 * still lists these rows (tagged), and the compare page can show them on
 * request. Surfaces decide for themselves what to do with the answer.
 */
export function isInstitutionalMandate(s: { strategyName: string }): boolean {
  const name = ` ${String(s.strategyName ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;
  return INSTITUTIONAL_TOKENS.some((t) => name.includes(` ${t} `));
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

/* ---------------------------------------------------------------------------
   Portfolio managers (AMCs)

   Every strategy carries its manager as a plain string — there is no manager
   document — so the AMC pages are derived from the feed by grouping on the
   manager's slug. Grouping on the SLUG rather than the raw name is deliberate:
   two spellings that slugify identically ("Marcellus Investment Managers" and
   "Marcellus Investment Managers.") would otherwise produce one URL serving
   only one of them, orphaning the other firm's strategies. Sharing the page is
   the lesser evil, and the label picks the spelling most rows actually use.
--------------------------------------------------------------------------- */

/** Canonical URL slug for a portfolio manager's /pms/amc/[slug] page. */
export function pmsManagerSlug(manager: string): string {
  return slugifyHeading(manager);
}

export interface PmsManagerGroup {
  slug: string;
  /** Display name — the spelling carried by most of the group's rows. */
  manager: string;
  strategies: LivePmsStrategy[];
  /** Sum of the group's per-strategy AUM (₹ crore); null when none publish one. */
  aumCr: number | null;
}

/**
 * One group per portfolio manager, ordered by aggregate AUM (largest first),
 * with each group's strategies ordered the same way. Callers get a stable,
 * ready-to-render shape for both the AMC pages and the sitemap.
 */
export function groupPmsByManager(clean: LivePmsStrategy[]): PmsManagerGroup[] {
  const byslug = new Map<string, { names: Map<string, number>; strategies: LivePmsStrategy[] }>();
  for (const s of clean) {
    if (!s.manager) continue;
    const slug = pmsManagerSlug(s.manager);
    if (!slug) continue;
    let g = byslug.get(slug);
    if (!g) {
      g = { names: new Map(), strategies: [] };
      byslug.set(slug, g);
    }
    g.names.set(s.manager, (g.names.get(s.manager) ?? 0) + 1);
    g.strategies.push(s);
  }

  const groups: PmsManagerGroup[] = [];
  for (const [slug, g] of byslug) {
    let manager = "";
    let best = -1;
    for (const [name, n] of g.names) {
      if (n > best) { best = n; manager = name; }
    }
    const withAum = g.strategies.filter((s) => typeof s.aumCr === "number");
    groups.push({
      slug,
      manager,
      strategies: [...g.strategies].sort((a, b) => (b.aumCr ?? -1) - (a.aumCr ?? -1)),
      aumCr: withAum.length ? withAum.reduce((t, s) => t + (s.aumCr ?? 0), 0) : null,
    });
  }
  return groups.sort((a, b) => (b.aumCr ?? -1) - (a.aumCr ?? -1) || a.manager.localeCompare(b.manager));
}

/** The one group a /pms/amc/[slug] page renders, or null when nothing matches. */
export function findPmsManagerBySlug(clean: LivePmsStrategy[], slug: string): PmsManagerGroup | null {
  return groupPmsByManager(clean).find((g) => g.slug === slug) ?? null;
}

/* ---------------------------------------------------------------------------
   Categories
--------------------------------------------------------------------------- */

/** Canonical URL slug for a category value ("Largecap" → "largecap"). */
export function pmsCategorySlug(category: string): string {
  return slugifyHeading(category);
}

export interface PmsCategoryDef {
  slug: string;
  /** Heading label. */
  label: string;
  /** Short editorial intro — what this category is and who it suits. */
  intro: string;
}

/**
 * Editorial copy for the category landing pages, keyed by the slug of the
 * `category` value the feed carries. This table supplies COPY ONLY — the route
 * matches strategies by slugifying each row's own category, so a category that
 * appears in the data without an entry here still gets a working page (with a
 * generic intro). Debt is listed because the taxonomy now allows it; while no
 * row carries it the page 404s rather than publishing an empty listing.
 */
export const PMS_CATEGORIES: PmsCategoryDef[] = [
  {
    slug: "largecap",
    label: "Largecap",
    intro:
      "Largecap PMS strategies concentrate on India's biggest listed businesses — the top 100 by market capitalisation. They are the least volatile corner of the PMS universe and the hardest place to beat an index, so alpha here is the number worth reading closely.",
  },
  {
    slug: "midcap",
    label: "Midcap",
    intro:
      "Midcap PMS strategies target companies ranked roughly 101–250 by market capitalisation — businesses large enough to be researched properly, small enough to still re-rate. Expect wider drawdowns than largecap in exchange for a longer runway.",
  },
  {
    slug: "smallcap",
    label: "Smallcap",
    intro:
      "Smallcap PMS strategies buy companies below the top 250. This is where dispersion between managers is widest: liquidity is thin, position sizing matters more than the idea, and a strong 1-year number tells you very little on its own. Read the 3-year and 5-year windows first.",
  },
  {
    slug: "multicap",
    label: "Multicap",
    intro:
      "Multicap PMS strategies move across the market-cap curve as opportunity dictates rather than sticking to one band. It is the largest category in Indian PMS, so the manager's stated process — not the label — is what distinguishes one from another.",
  },
  {
    slug: "hybrid",
    label: "Hybrid",
    intro:
      "Hybrid PMS strategies blend equity with debt or arbitrage to soften drawdowns. They usually trail pure-equity strategies in a strong bull market and lose less in a fall, so compare them on risk-adjusted terms rather than headline return.",
  },
  {
    slug: "debt",
    label: "Debt",
    intro:
      "Debt PMS strategies invest in fixed-income instruments — corporate bonds, government securities and structured credit — for investors who want a defined income profile rather than equity growth. Credit quality and duration matter far more than the headline yield.",
  },
  {
    slug: "thematic",
    label: "Thematic",
    intro:
      "Thematic PMS strategies concentrate on a single idea — manufacturing, consumption, financials, exports. Concentration is the point, which also means the theme's cycle, not the manager's stock-picking, drives most of the return in any given year.",
  },
  {
    slug: "quant",
    label: "Quant",
    intro:
      "Quant PMS strategies select and rebalance holdings from a rules-based model rather than discretionary judgement. The questions worth asking are how long the model has run live, and how it behaved in the drawdowns it did not design for.",
  },
];

/** Editorial copy for a category slug, when we have written any. */
export function findPmsCategory(slug: string): PmsCategoryDef | null {
  return PMS_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

/** Every strategy whose category maps to `slug`, biggest AUM first. */
export function strategiesInPmsCategory(clean: LivePmsStrategy[], slug: string): LivePmsStrategy[] {
  return clean
    .filter((s) => s.category && pmsCategorySlug(s.category) === slug)
    .sort((a, b) => (b.aumCr ?? -1) - (a.aumCr ?? -1));
}

/** Distinct category slugs actually present in the feed, alphabetically. */
export function pmsCategorySlugsInFeed(clean: LivePmsStrategy[]): string[] {
  const set = new Set<string>();
  for (const s of clean) {
    if (!s.category) continue;
    const slug = pmsCategorySlug(s.category);
    if (slug) set.add(slug);
  }
  return Array.from(set).sort();
}

/* ---------------------------------------------------------------------------
   The A–Z directory (/pms/all)
--------------------------------------------------------------------------- */

/** Strategies per page of the /pms/all directory. */
export const PMS_DIRECTORY_PAGE_SIZE = 100;

/** A–Z bucket for a strategy name; anything not starting with a letter → "#". */
export function pmsAlphaBucket(name: string): string {
  const c = name.trim().charAt(0).toUpperCase();
  return c >= "A" && c <= "Z" ? c : "#";
}

/** The whole feed ordered the way the directory lists it: name, then manager. */
export function sortPmsAlphabetically(clean: LivePmsStrategy[]): LivePmsStrategy[] {
  return [...clean].sort(
    (a, b) =>
      a.strategyName.localeCompare(b.strategyName, "en") ||
      a.manager.localeCompare(b.manager, "en"),
  );
}

/** Directory URL for a 1-based page number; page 1 is the bare /pms/all. */
export function pmsDirectoryHref(page: number): string {
  return page <= 1 ? "/pms/all" : `/pms/all/${page}`;
}

/** How many directory pages `total` strategies fill (always at least 1). */
export function pmsDirectoryPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PMS_DIRECTORY_PAGE_SIZE));
}

/*
 * The homepage's featured selection used to live here as `featuredPmsSubset`
 * (first ~6 rows of the alphabetical feed). It is now a rules-based selection
 * in lib/pms-featured.ts — which has to import `beats` from
 * components/pms/strategy-shared.tsx, so it cannot live in this file without
 * closing an import cycle.
 */
