import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getLivePmsStrategies } from "@/lib/investment-data";
import {
  cleanPmsStrategies,
  findPmsManagerBySlug,
  groupPmsByManager,
  pmsCategorySlug,
} from "@/lib/pms";
import { fmtAsOf, latestAmfiDate } from "@/lib/format";
import { formatAumCr } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";
import { StrategyLinkList, toStrategyLink } from "@/components/pms/StrategyLinks";
import { ComplianceFootnote, BENCH_NAME } from "@/components/pms/strategy-shared";
import { StructuredData, breadcrumbSchema } from "@/components/StructuredData";

/*
  /pms/amc/[slug] — one page per portfolio manager.

  The feed has no manager document: `manager` is a string on every strategy
  row, so these pages are derived by grouping the feed on the manager's slug
  (see groupPmsByManager). Every manager is pre-rendered — there are only a few
  hundred, they are the hub each strategy card's AMC name now points at, and
  they carry the second-shortest path from the homepage to any strategy page.
*/

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 86400;

export async function generateStaticParams() {
  const clean = cleanPmsStrategies(await getLivePmsStrategies());
  return groupPmsByManager(clean).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const clean = cleanPmsStrategies(await getLivePmsStrategies());
  const amc = findPmsManagerBySlug(clean, slug);
  if (!amc) return { title: "Portfolio manager not found" };

  const n = amc.strategies.length;
  const title = `${amc.manager} PMS — All ${n} ${n === 1 ? "Strategy" : "Strategies"}, AUM & Returns | PlanMyCashflows`;
  const description =
    `Every PMS strategy from ${amc.manager}${amc.aumCr ? ` — ${formatAumCr(amc.aumCr)} across ${n} ${n === 1 ? "strategy" : "strategies"}` : ""}. ` +
    `AUM, 3-year annualised returns and minimum investment, updated monthly from APMI disclosures.`;
  const canonical = `${siteConfig.url}/pms/amc/${slug}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: { type: "website", url: canonical, siteName: siteConfig.name, locale: "en_IN", title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PmsAmcPage({ params }: Props) {
  const { slug } = await params;
  const clean = cleanPmsStrategies(await getLivePmsStrategies());
  const amc = findPmsManagerBySlug(clean, slug);
  if (!amc) notFound();

  const items = amc.strategies.map((s) => toStrategyLink(s, clean));
  const asOn = fmtAsOf(latestAmfiDate(amc.strategies.map((s) => s.asOfDate)));
  const n = amc.strategies.length;
  const withAum = amc.strategies.filter((s) => typeof s.aumCr === "number").length;

  // Categories this manager covers, biggest first — each one a real link to
  // its category page, so the AMC page feeds the category hubs too.
  const categoryCounts = new Map<string, number>();
  for (const s of amc.strategies) {
    if (s.category) categoryCounts.set(s.category, (categoryCounts.get(s.category) ?? 0) + 1);
  }
  const categories = Array.from(categoryCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const best3y = amc.strategies.reduce<number | null>(
    (best, s) => (typeof s.returns3y === "number" && (best === null || s.returns3y > best) ? s.returns3y : best),
    null,
  );

  const canonical = `${siteConfig.url}/pms/amc/${slug}`;
  const facts: [string, string][] = [
    ["Strategies", String(n)],
    ["Aggregate AUM", formatAumCr(amc.aumCr)],
    ["Best 3Y return", best3y === null ? "—" : `${best3y.toFixed(1)}%`],
    ["Minimum", "₹50 lakh"],
  ];

  return (
    <div className="font-ui min-h-screen" style={{ background: "var(--page)", color: "var(--ink)" }}>
      <StructuredData
        data={breadcrumbSchema([
          { name: "Home", url: siteConfig.url },
          { name: "PMS", url: `${siteConfig.url}/investment-products/pms` },
          { name: amc.manager, url: canonical },
        ])}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/investment-products/pms" className="font-ui inline-flex items-center gap-1.5 hover:underline"
          style={{ fontSize: 13, fontWeight: 500, color: "var(--green-deep)" }}>
          <ArrowLeft size={14} /> PMS Explorer
        </Link>

        <h1 className="font-display mt-4" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.1 }}>
          {amc.manager} — PMS strategies
        </h1>

        <p className="font-ui" style={{ fontSize: 15, color: "var(--muted)", marginTop: 10, maxWidth: 640, lineHeight: 1.55 }}>
          {amc.manager} is a SEBI-registered portfolio manager running{" "}
          <strong style={{ color: "var(--ink)" }}>{n} {n === 1 ? "strategy" : "strategies"}</strong> in our tracker
          {amc.aumCr !== null && (
            <>
              , holding <strong style={{ color: "var(--ink)" }}>{formatAumCr(amc.aumCr)}</strong> in aggregate AUM
              {withAum < n && ` across the ${withAum} that publish a figure`}
            </>
          )}
          . Every one of them is listed below with its 3-year annualised return, as on {asOn}. Figures come from the
          monthly APMI disclosures every registered manager is required to file — not from the manager&apos;s own marketing.
        </p>

        {/* aggregate facts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {facts.map(([k, v]) => (
            <div key={k} className="rounded-xl px-3 py-2.5" style={{ background: "var(--flat-bg)" }}>
              <div className="font-ui" style={{ fontSize: 11, color: "var(--muted)" }}>{k}</div>
              <div className="font-num" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{v}</div>
            </div>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-5">
            <span className="font-ui" style={{ fontSize: 12.5, color: "var(--muted)" }}>Categories:</span>
            {categories.map(([category, count]) => (
              <a key={category} href={`/pms/category/${pmsCategorySlug(category)}`}
                className="font-ui rounded-full px-3 py-1 hover:underline"
                style={{ fontSize: 12.5, fontWeight: 500, color: "var(--green-deep)", background: "var(--green-tint)" }}>
                {category} ({count})
              </a>
            ))}
          </div>
        )}

        <h2 className="font-ui mt-8 mb-2" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
          All {n} {n === 1 ? "strategy" : "strategies"} from {amc.manager}
        </h2>
        <StrategyLinkList items={items} showManager={false} label={`${amc.manager} PMS strategies`} />

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link href="/investment-products/pms" className="font-ui flex-1 text-center rounded-xl py-3 px-5"
            style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", background: "#fff", border: "1px solid var(--line)" }}>
            Compare against other managers
          </Link>
          <Link href="/pms/all" className="font-ui flex-1 text-center rounded-xl py-3 px-5"
            style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", background: "#fff", border: "1px solid var(--line)" }}>
            Browse all PMS strategies A–Z
          </Link>
        </div>

        <ComplianceFootnote asOn={asOn} benchName={BENCH_NAME} />
      </div>
    </div>
  );
}
