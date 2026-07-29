import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
import { investmentProducts, audiences, calculators } from "@/lib/site-config";
import { getLivePmsStrategies } from "@/lib/investment-data";
import {
  cleanPmsStrategies, pmsStrategySlug,
  groupPmsByManager, pmsCategorySlugsInFeed, strategiesInPmsCategory,
  pmsDirectoryHref, pmsDirectoryPageCount,
} from "@/lib/pms";
import { parseAmfiDate, latestAmfiDate } from "@/lib/format";
import { getAllBlogSlugs } from "@/lib/blog";

/**
 * The site's ONLY sitemap.
 *
 * This used to compete with a `next-sitemap` postbuild step that wrote a
 * static public/sitemap.xml. Because that ran after `next build`, Next never
 * reported the conflict — but at runtime the static file shadowed this route,
 * so the sitemap search engines actually received held 71 URLs and none of the
 * ~1,700 /pms/[slug] strategy pages. next-sitemap has been removed; this route
 * is the single source of truth, and app/robots.ts points crawlers at it.
 *
 * Unlike a crawl-based generator this enumerates real routes, so build
 * artifacts (/icon.png, /opengraph-image, the sitemap itself) can never leak
 * in, and every strategy URL carries a lastModified derived from the data's
 * own as-of date — the freshness signal that tells Google to re-crawl after
 * the monthly APMI refresh.
 */

export const revalidate = 86400; // regenerate daily, same cadence as the strategy pages

/** Per-path priority + changeFrequency. Anything not listed falls back to
 *  DEFAULT_PRIORITY / "weekly" (carried over from the old next-sitemap config). */
const PRIORITY: Record<string, { priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = {
  "": { priority: 1.0, changeFrequency: "weekly" },
  "/investment-products/pms": { priority: 0.95, changeFrequency: "weekly" },
  "/investment-products/aif": { priority: 0.9, changeFrequency: "weekly" },
  "/investment-products/unlisted-shares": { priority: 0.9, changeFrequency: "daily" },
  "/compare": { priority: 0.9, changeFrequency: "weekly" },
  "/ai-wealth-planner": { priority: 0.9, changeFrequency: "weekly" },
  "/guided": { priority: 0.9, changeFrequency: "weekly" },
  "/pricing": { priority: 0.85, changeFrequency: "weekly" },
  "/resources/calculators/pms-fees": { priority: 0.8, changeFrequency: "monthly" },
  "/plan": { priority: 0.8, changeFrequency: "weekly" },
  "/markets": { priority: 0.8, changeFrequency: "hourly" },
  "/about": { priority: 0.8, changeFrequency: "monthly" },
  "/contact": { priority: 0.75, changeFrequency: "monthly" },
};
const DEFAULT_PRIORITY = 0.7;

/** Marketing/product pages that exist regardless of CMS content. */
const STATIC_PATHS = [
  "",
  "/about",
  "/contact",
  "/pricing",
  "/compare",
  "/blog",
  "/markets",
  "/guided",
  "/plan",
  "/financial-planning",
  "/ai-wealth-planner",
  "/investment-products",
  "/resources/calculators",
  "/resources/glossary",
  "/resources/downloads",
  "/legal/disclaimers",
  "/legal/privacy",
  "/legal/terms",
  "/legal/sebi-compliance",
  "/legal/grievance-redressal",
];

/** Apply the priority table to a bare path. */
function entry(path: string, extra?: Partial<MetadataRoute.Sitemap[number]>): MetadataRoute.Sitemap[number] {
  const override = PRIORITY[path];
  return {
    url: `${siteConfig.url}${path}`,
    changeFrequency: override?.changeFrequency ?? "weekly",
    priority: override?.priority ?? DEFAULT_PRIORITY,
    ...extra,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [strategies, blogSlugs] = await Promise.all([
    getLivePmsStrategies(),
    getAllBlogSlugs(),
  ]);
  const clean = cleanPmsStrategies(strategies);

  const staticEntries: MetadataRoute.Sitemap = [
    ...STATIC_PATHS,
    ...investmentProducts.map((p) => `/investment-products/${p.slug}`),
    ...audiences.map((a) => `/for/${a.slug}`),
    ...calculators.map((c) => `/resources/calculators/${c.slug}`),
  ].map((path) => entry(path));

  // One URL per PMS strategy — slugs from the same util the explorer links
  // and generateStaticParams use, de-duplicated the same way.
  const seen = new Set<string>();
  const strategyEntries: MetadataRoute.Sitemap = [];
  for (const s of clean) {
    const slug = pmsStrategySlug(s, clean);
    if (seen.has(slug)) continue;
    seen.add(slug);
    strategyEntries.push({
      url: `${siteConfig.url}/pms/${slug}`,
      lastModified: parseAmfiDate(s.asOfDate) ?? undefined,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  // The internal-linking hubs that make every strategy page reachable: the
  // paginated A–Z directory, one page per portfolio manager, one per category.
  //
  // lastModified on all three comes from the same source as the strategy
  // entries above — the APMI asOfDate the rows carry — so a hub's freshness
  // signal moves with the data it summarises, and the monthly refresh tells
  // crawlers to re-fetch the hubs and the strategy pages together.
  const feedModified = parseAmfiDate(latestAmfiDate(clean.map((s) => s.asOfDate))) ?? undefined;

  const directoryEntries: MetadataRoute.Sitemap =
    clean.length === 0
      ? []
      : Array.from({ length: pmsDirectoryPageCount(clean.length) }, (_, i) => ({
          url: `${siteConfig.url}${pmsDirectoryHref(i + 1)}`,
          lastModified: feedModified,
          changeFrequency: "weekly" as const,
          // Page 1 is the hub proper; deeper pages matter but rank below it.
          priority: i === 0 ? 0.9 : 0.6,
        }));

  // One entry per distinct manager. The slug comes from groupPmsByManager,
  // which builds it with pmsManagerSlug — the same function every link in the
  // UI calls. Nothing here re-implements the slugify rule, so a sitemap URL
  // and the link pointing at it cannot drift apart into a 404.
  const amcEntries: MetadataRoute.Sitemap = groupPmsByManager(clean).map((g) => ({
    url: `${siteConfig.url}/pms/amc/${g.slug}`,
    lastModified: parseAmfiDate(latestAmfiDate(g.strategies.map((s) => s.asOfDate))) ?? undefined,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const categoryEntries: MetadataRoute.Sitemap = pmsCategorySlugsInFeed(clean).map((slug) => ({
    url: `${siteConfig.url}/pms/category/${slug}`,
    lastModified:
      parseAmfiDate(latestAmfiDate(strategiesInPmsCategory(clean, slug).map((s) => s.asOfDate))) ?? undefined,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `${siteConfig.url}/blog/${slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    ...staticEntries,
    ...directoryEntries,
    ...amcEntries,
    ...categoryEntries,
    ...strategyEntries,
    ...blogEntries,
  ];
}
