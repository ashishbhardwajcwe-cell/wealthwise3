import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getLivePmsStrategies } from "@/lib/investment-data";
import {
  cleanPmsStrategies,
  findPmsCategory,
  pmsCategorySlugsInFeed,
  strategiesInPmsCategory,
} from "@/lib/pms";
import { fmtAsOf, latestAmfiDate } from "@/lib/format";
import { formatAumCr } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";
import { StrategyLinkList, toStrategyLink } from "@/components/pms/StrategyLinks";
import { ComplianceFootnote, BENCH_NAME } from "@/components/pms/strategy-shared";
import { StructuredData, breadcrumbSchema } from "@/components/StructuredData";

/*
  /pms/category/[slug] — largecap, midcap, smallcap, multicap, hybrid, debt
  (plus thematic and quant, which the feed also carries).

  Matching is done by slugifying each row's own `category` value rather than by
  looking the slug up in a table, so a category that appears in the data gets a
  working page whether or not PMS_CATEGORIES has editorial copy for it. The
  copy table only supplies the intro. A slug with no strategies behind it 404s
  instead of publishing an empty listing — which is what /pms/category/debt
  does today, since no row in the feed carries a Debt category yet.
*/

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 86400;

export async function generateStaticParams() {
  const clean = cleanPmsStrategies(await getLivePmsStrategies());
  return pmsCategorySlugsInFeed(clean).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const clean = cleanPmsStrategies(await getLivePmsStrategies());
  const strategies = strategiesInPmsCategory(clean, slug);
  if (strategies.length === 0) return { title: "PMS category not found" };

  const label = findPmsCategory(slug)?.label ?? strategies[0].category ?? slug;
  const title = `${label} PMS Strategies in India — All ${strategies.length}, Ranked by AUM | PlanMyCashflows`;
  const description =
    `Every ${label.toLowerCase()} portfolio management service we track — ${strategies.length} strategies from SEBI-registered ` +
    `managers, with AUM and 3-year annualised returns updated monthly from APMI disclosures.`;
  const canonical = `${siteConfig.url}/pms/category/${slug}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: { type: "website", url: canonical, siteName: siteConfig.name, locale: "en_IN", title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PmsCategoryPage({ params }: Props) {
  const { slug } = await params;
  const clean = cleanPmsStrategies(await getLivePmsStrategies());
  const strategies = strategiesInPmsCategory(clean, slug);
  if (strategies.length === 0) notFound();

  const def = findPmsCategory(slug);
  const label = def?.label ?? strategies[0].category ?? slug;
  const items = strategies.map((s) => toStrategyLink(s, clean));
  const asOn = fmtAsOf(latestAmfiDate(strategies.map((s) => s.asOfDate)));

  const withAum = strategies.filter((s) => typeof s.aumCr === "number");
  const totalAum = withAum.length ? withAum.reduce((t, s) => t + (s.aumCr ?? 0), 0) : null;
  const managerCount = new Set(strategies.map((s) => s.manager)).size;
  const best3y = strategies.reduce<number | null>(
    (best, s) => (typeof s.returns3y === "number" && (best === null || s.returns3y > best) ? s.returns3y : best),
    null,
  );

  // Sibling categories, so each category page links every other one.
  const siblings = pmsCategorySlugsInFeed(clean)
    .filter((s) => s !== slug)
    .map((s) => ({ slug: s, label: findPmsCategory(s)?.label ?? s }));

  const canonical = `${siteConfig.url}/pms/category/${slug}`;
  const facts: [string, string][] = [
    ["Strategies", String(strategies.length)],
    ["Managers", String(managerCount)],
    ["Category AUM", formatAumCr(totalAum)],
    ["Best 3Y return", best3y === null ? "—" : `${best3y.toFixed(1)}%`],
  ];

  return (
    <div className="font-ui min-h-screen" style={{ background: "var(--page)", color: "var(--ink)" }}>
      <StructuredData
        data={breadcrumbSchema([
          { name: "Home", url: siteConfig.url },
          { name: "PMS", url: `${siteConfig.url}/investment-products/pms` },
          { name: `${label} PMS`, url: canonical },
        ])}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/investment-products/pms" className="font-ui inline-flex items-center gap-1.5 hover:underline"
          style={{ fontSize: 13, fontWeight: 500, color: "var(--green-deep)" }}>
          <ArrowLeft size={14} /> PMS Explorer
        </Link>

        <h1 className="font-display mt-4" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.1 }}>
          {label} PMS strategies
        </h1>

        <p className="font-ui" style={{ fontSize: 15, color: "var(--muted)", marginTop: 10, maxWidth: 640, lineHeight: 1.55 }}>
          {def?.intro ??
            `Every ${label.toLowerCase()} portfolio management service in our tracker, from SEBI-registered managers filing monthly with APMI.`}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {facts.map(([k, v]) => (
            <div key={k} className="rounded-xl px-3 py-2.5" style={{ background: "var(--flat-bg)" }}>
              <div className="font-ui" style={{ fontSize: 11, color: "var(--muted)" }}>{k}</div>
              <div className="font-num" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{v}</div>
            </div>
          ))}
        </div>

        <h2 className="font-ui mt-8 mb-2" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
          All {strategies.length} {label.toLowerCase()} strategies, largest first
        </h2>
        <StrategyLinkList items={items} showCategory={false} label={`${label} PMS strategies`} />

        {siblings.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-6">
            <span className="font-ui" style={{ fontSize: 12.5, color: "var(--muted)" }}>Other categories:</span>
            {siblings.map((c) => (
              <a key={c.slug} href={`/pms/category/${c.slug}`}
                className="font-ui rounded-full px-3 py-1 hover:underline"
                style={{ fontSize: 12.5, fontWeight: 500, color: "var(--green-deep)", background: "var(--green-tint)" }}>
                {c.label}
              </a>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link href="/investment-products/pms" className="font-ui flex-1 text-center rounded-xl py-3 px-5"
            style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", background: "#fff", border: "1px solid var(--line)" }}>
            Filter and rank by alpha
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
