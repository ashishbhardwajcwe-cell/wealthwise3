import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getLivePmsStrategies, getBenchmark } from "@/lib/investment-data";
import {
  cleanPmsStrategies, findPmsStrategyBySlug, pmsStrategySlug,
  pmsManagerSlug, pmsCategorySlug,
} from "@/lib/pms";
import { fmtAsOf } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import {
  toStrategy, toBenchmark, toneOf, toneColor, alphaFor,
  AlphaChip, ConsistencyDots,
  FactsGrid, ReturnsVsBenchmarkTable, HowToReadThis, ComplianceFootnote,
} from "@/components/pms/strategy-shared";
import { StrategyLinkList, toStrategyLink } from "@/components/pms/StrategyLinks";
import { EnquireButton } from "@/components/pms/EnquireButton";
import { NewsletterBand } from "@/components/pms/NewsletterBand";
import { StructuredData, breadcrumbSchema } from "@/components/StructuredData";

/*
  /pms/[slug] — one SEO page per PMS strategy.

  Every strategy is pre-rendered at build time (generateStaticParams) and
  refreshed daily via ISR, so the monthly APMI data updates flow through
  without a rebuild and no visitor ever waits on a cold render. Slugs come
  from pmsStrategySlug() — the same util the explorer's links, the A–Z
  directory and the sitemap use — so URLs are deterministic everywhere.

  These pages are no longer orphans: /pms/all lists every one of them, the
  AMC and category hubs group them, and each page links onward to three
  stablemates from its manager and three from its category.

  On fetching the whole feed to render one strategy: slugs are collision-aware
  across the feed, so resolving one needs all of them. That is cheap because
  getLivePmsStrategies() is a cached fetch — one hourly fetch is shared by every
  strategy page rendered in that window, not one per page. This only became
  true once safeFetch stopped pinning a 300s window that dragged this route's
  `revalidate = 86400` down with it (see lib/investment-data.ts). If the feed
  ever outgrows that, persist the resolved slug on the document at import time
  and query by it directly.
*/

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 86400; // daily ISR — monthly data refresh flows through

/**
 * Pre-render EVERY strategy page, not just the top 100 by AUM.
 *
 * The old cap cited a Netlify build that ran past 15 minutes on the full set.
 * That measurement predates the data-cache fix in lib/investment-data.ts: with
 * DEFAULT_REVALIDATE at 300s, the ~893 KB feed's cache entry expired part-way
 * through a long build and every subsequent page re-fetched it. At 3600s the
 * whole build shares one fetch, and the per-page cost is just the render.
 *
 * Re-measured on a 4-CPU container against a 1,766-row feed, whole-build wall
 * time (`next build`, cold `.next`):
 *
 *     no PMS data (~80 pages)     175s
 *     top 600     (1,066 pages)   169s
 *     all 1,766   (2,232 pages)   178s
 *
 * Generating all ~1,700 strategy pages plus the 361 AMC, 7 category and 18
 * directory pages costs seconds — the build is dominated by webpack, chiefly
 * the 1.45 MB /studio bundle. Well inside the 10-minute budget, so nothing is
 * left to a cold first visit.
 *
 * If a much larger feed ever changes that, reinstate a cap by sorting on AUM
 * and slicing here: `revalidate` above and Next's default `dynamicParams`
 * still generate any omitted page on first visit, and /pms/all, the AMC pages
 * and the category pages keep every strategy reachable either way.
 */
export async function generateStaticParams() {
  const clean = cleanPmsStrategies(await getLivePmsStrategies());
  // De-duplicate: a strategy duplicated verbatim in the feed (same name AND
  // manager) collapses onto one slug — emit it once. Slugs are still
  // computed against the FULL list so they match the explorer's links.
  const slugs = new Set(clean.map((s) => pmsStrategySlug(s, clean)));
  return Array.from(slugs).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [clean, benchmark] = await Promise.all([
    getLivePmsStrategies().then(cleanPmsStrategies),
    getBenchmark().then(toBenchmark),
  ]);
  const s = findPmsStrategyBySlug(clean, slug);
  if (!s) return { title: "Strategy not found" };

  // The root layout templates titles as "%s | PlanMyCashflows" — this title
  // already carries the brand, so mark it absolute to avoid doubling it.
  //
  // Length-aware: some strategy/AMC names alone run past the 60/160-char SERP
  // budget (family-office AMCs with parenthetical legal names are the worst
  // offenders — one runs 97 chars by itself), so degrade in stages rather
  // than let every one of these ~1,700 pages truncate mid-sentence. The AMC
  // name and "Returns, AUM & Analysis" framing already live in the H1 and
  // body, so dropping them from the title/description costs nothing readers
  // can't get a scroll away.
  const titleBase = `${s.strategyName} PMS`;
  const titleWithBrand = `${titleBase} | PlanMyCashflows`;
  const title = titleWithBrand.length <= 60 ? titleWithBrand : titleBase;

  const ret3y = typeof s.returns3y === "number" ? `${s.returns3y.toFixed(1)}% 3Y annualised return` : "returns";
  const descWithManager = `${s.strategyName} by ${s.manager}: ${ret3y} vs ${benchmark.name}. AUM, minimum investment & alpha, updated monthly from APMI.`;
  const descWithoutManager = `${s.strategyName} PMS: ${ret3y} vs ${benchmark.name}. AUM, minimum investment & alpha, updated monthly from APMI.`;
  const description =
    descWithManager.length <= 160
      ? descWithManager
      : descWithoutManager.length <= 160
        ? descWithoutManager
        : `${descWithoutManager.slice(0, 157)}...`;
  const canonical = `${siteConfig.url}/pms/${slug}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      siteName: siteConfig.name,
      locale: "en_IN",
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PmsStrategyPage({ params }: Props) {
  const { slug } = await params;
  const [clean, benchmark] = await Promise.all([
    getLivePmsStrategies().then(cleanPmsStrategies),
    getBenchmark().then(toBenchmark),
  ]);
  const live = findPmsStrategyBySlug(clean, slug);
  if (!live) notFound();

  const s = toStrategy(live, clean);
  const asOn = fmtAsOf(live.asOfDate);
  const ret3y = s.returns["3Y"];
  const alpha3y = alphaFor(s.returns, "3Y", benchmark.returns);

  // "Similar strategies" — the internal links that keep this page from being
  // a dead end. Three stablemates from the same manager, three from the same
  // category, biggest AUM first, each a real <a> in the server-rendered HTML.
  const managerSlug = pmsManagerSlug(live.manager);
  const categorySlug = live.category ? pmsCategorySlug(live.category) : null;

  const sameAmc = clean
    .filter((r) => r._id !== live._id && r.manager === live.manager)
    .sort((a, b) => (b.aumCr ?? -1) - (a.aumCr ?? -1))
    .slice(0, 3)
    .map((r) => toStrategyLink(r, clean));

  const sameCategory = live.category
    ? clean
        .filter(
          (r) => r._id !== live._id && r.category === live.category && !sameAmc.some((a) => a.id === r._id),
        )
        .sort((a, b) => (b.aumCr ?? -1) - (a.aumCr ?? -1))
        .slice(0, 3)
        .map((r) => toStrategyLink(r, clean))
    : [];

  const amcCount = clean.filter((r) => r.manager === live.manager).length;
  const categoryCount = live.category ? clean.filter((r) => r.category === live.category).length : 0;

  // Structured data. This is the site's largest page type (~1,700 URLs) and
  // carried none: no breadcrumb trail, no entity markup. FinancialProduct
  // describes what the page is actually about, with the manager as provider;
  // returns are deliberately NOT expressed as a rating — they're historical
  // performance, not a review score, and marking them up as one would be
  // misleading (and against Google's guidelines for self-serving ratings).
  const canonical = `${siteConfig.url}/pms/${slug}`;
  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: `${s.strategy} — ${s.manager}`,
    url: canonical,
    description: `${s.strategy}, a ${s.category ? `${s.category} ` : ""}portfolio management service from ${s.manager}. Performance measured against ${benchmark.name}, as on ${asOn}.`,
    category: s.category ?? "Portfolio Management Service",
    provider: { "@type": "Organization", name: s.manager },
    areaServed: { "@type": "Country", name: "India" },
    ...(typeof live.minInvestmentL === "number"
      ? {
          feesAndCommissionsSpecification:
            `Minimum investment ₹${live.minInvestmentL} lakh (SEBI mandate for PMS).`,
        }
      : {}),
  };

  return (
    <div className="font-ui min-h-screen" style={{ background: "var(--page)", color: "var(--ink)" }}>
      <StructuredData data={productSchema} />
      <StructuredData
        data={breadcrumbSchema([
          { name: "Home", url: siteConfig.url },
          { name: "PMS", url: `${siteConfig.url}/investment-products/pms` },
          { name: s.strategy, url: canonical },
        ])}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* back to the explorer */}
        <Link href="/investment-products/pms" className="font-ui inline-flex items-center gap-1.5 hover:underline"
          style={{ fontSize: 13, fontWeight: 500, color: "var(--green-deep)" }}>
          <ArrowLeft size={14} /> PMS Explorer
        </Link>

        {/* header */}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {/* The manager name in the h1 is itself the link to its AMC page —
                a plain server-rendered <a>, so it is in the HTML a crawler
                receives, not something hydration adds. */}
            <h1 className="font-display" style={{ fontSize: 34, fontWeight: 600, color: "var(--ink)", lineHeight: 1.1 }}>
              {s.strategy} —{" "}
              <a href={`/pms/amc/${managerSlug}`} className="hover:underline" style={{ color: "inherit" }}>
                {s.manager}
              </a>
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {s.category && categorySlug && (
                <a href={`/pms/category/${categorySlug}`} className="font-ui rounded-full px-2.5 py-0.5 hover:underline"
                  style={{ fontSize: 12, fontWeight: 500, color: "var(--green-deep)", background: "var(--green-tint)" }}>
                  {s.category}
                </a>
              )}
              <span className="font-ui" style={{ fontSize: 12, color: "var(--muted)" }}>as on {asOn}</span>
            </div>
          </div>
        </div>

        {/* hero stat: 3Y return + alpha + consistency */}
        <div className="mt-6 rounded-2xl bg-white p-5 flex items-end justify-between" style={{ border: "1px solid var(--line)" }}>
          <div>
            <div className="font-num" style={{ fontSize: 44, fontWeight: 600, lineHeight: 1, color: ret3y === null ? "var(--muted)" : toneColor[toneOf(ret3y)] }}>
              {ret3y === null ? "N/A" : `${ret3y.toFixed(1)}%`}
            </div>
            <div className="font-ui" style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>3Y return · annualised</div>
          </div>
          <div className="flex flex-col items-end gap-2 pb-1">
            <AlphaChip value={alpha3y} ret={ret3y} />
            <ConsistencyDots ret={s.returns} bench={benchmark.returns} benchName={benchmark.name} />
          </div>
        </div>

        {/* key facts */}
        <div className="mt-4">
          <FactsGrid s={s} />
        </div>

        {/* returns vs benchmark */}
        <h2 className="font-ui mt-8 mb-2" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Returns vs {benchmark.name}</h2>
        <ReturnsVsBenchmarkTable returns={s.returns} bench={benchmark.returns} />

        {/* honest read */}
        <div className="mt-4">
          <HowToReadThis returns={s.returns} asOn={asOn} bench={benchmark.returns} />
        </div>

        {/* enquire CTA */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <EnquireButton strategy={s.strategy} source="pms-strategy-page" />
          <Link href="/investment-products/pms" className="font-ui flex-1 text-center rounded-xl py-3 px-5"
            style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", background: "#fff", border: "1px solid var(--line)" }}>
            Explore all PMS strategies
          </Link>
        </div>

        {/* similar strategies — same manager, then same category */}
        {(sameAmc.length > 0 || sameCategory.length > 0) && (
          <div className="mt-10">
            <h2 className="font-display mb-3" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>
              Similar strategies
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {sameAmc.length > 0 && (
                <div>
                  <h3 className="font-ui mb-2" style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
                    More from {s.manager}
                  </h3>
                  <StrategyLinkList items={sameAmc} showManager={false} label={`Other strategies from ${s.manager}`} />
                  {amcCount > sameAmc.length + 1 && (
                    <a href={`/pms/amc/${managerSlug}`} className="font-ui inline-block mt-2 hover:underline"
                      style={{ fontSize: 12.5, fontWeight: 500, color: "var(--green-deep)" }}>
                      All {amcCount} {s.manager} strategies →
                    </a>
                  )}
                </div>
              )}
              {sameCategory.length > 0 && (
                <div>
                  <h3 className="font-ui mb-2" style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
                    More {s.category} strategies
                  </h3>
                  <StrategyLinkList items={sameCategory} showCategory={false} label={`Other ${s.category} strategies`} />
                  {categorySlug && categoryCount > sameCategory.length + 1 && (
                    <a href={`/pms/category/${categorySlug}`} className="font-ui inline-block mt-2 hover:underline"
                      style={{ fontSize: 12.5, fontWeight: 500, color: "var(--green-deep)" }}>
                      All {categoryCount} {s.category} strategies →
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Always present, even for a one-strategy manager with no category:
            every strategy page keeps a link into the full directory. */}
        <Link href="/pms/all" className="font-ui inline-block mt-4 hover:underline"
          style={{ fontSize: 13, fontWeight: 500, color: "var(--green-deep)" }}>
          Browse all {clean.length.toLocaleString("en-IN")} PMS strategies A–Z →
        </Link>

        {/* monthly brief signup */}
        <NewsletterBand source="pms-strategy-page" />

        {/* compliance — same disclaimer as the explorer */}
        <ComplianceFootnote asOn={asOn} benchName={benchmark.name} />
      </div>
    </div>
  );
}
