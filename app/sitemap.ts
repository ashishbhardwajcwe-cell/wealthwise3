import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
import { investmentProducts, audiences, calculators } from "@/lib/site-config";
import { getLivePmsStrategies } from "@/lib/investment-data";
import { cleanPmsStrategies, pmsStrategySlug } from "@/lib/pms";
import { parseAmfiDate } from "@/lib/format";
import { getAllBlogSlugs } from "@/lib/blog";

export const revalidate = 86400; // regenerate daily, same cadence as the strategy pages

/** Marketing/product pages that exist regardless of CMS content. */
const STATIC_PATHS = [
  "",
  "/about",
  "/contact",
  "/pricing",
  "/compare",
  "/blog",
  "/financial-planning",
  "/ai-wealth-planner",
  "/investment-products",
  "/resources/calculators",
  "/resources/glossary",
  "/resources/guides",
  "/legal/disclaimers",
  "/legal/privacy",
  "/legal/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
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
  ].map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const }));

  // One URL per PMS strategy — slugs from the same util the explorer links
  // and generateStaticParams use, de-duplicated the same way.
  const seen = new Set<string>();
  const strategyEntries: MetadataRoute.Sitemap = [];
  for (const s of clean) {
    const slug = pmsStrategySlug(s, clean);
    if (seen.has(slug)) continue;
    seen.add(slug);
    strategyEntries.push({
      url: `${base}/pms/${slug}`,
      lastModified: parseAmfiDate(s.asOfDate) ?? undefined,
      changeFrequency: "monthly",
    });
  }

  const blogEntries: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `${base}/blog/${slug}`,
    changeFrequency: "monthly",
  }));

  return [...staticEntries, ...strategyEntries, ...blogEntries];
}
