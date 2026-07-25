import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
import { investmentProducts, audiences, calculators } from "@/lib/site-config";
import { getLivePmsStrategies } from "@/lib/investment-data";
import { cleanPmsStrategies, pmsStrategySlug } from "@/lib/pms";
import { parseAmfiDate } from "@/lib/format";
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

  const blogEntries: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `${siteConfig.url}/blog/${slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...strategyEntries, ...blogEntries];
}
