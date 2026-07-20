import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getLivePmsStrategies, getBenchmark } from "@/lib/investment-data";
import { cleanPmsStrategies, findPmsStrategyBySlug, pmsStrategySlug } from "@/lib/pms";
import { fmtAsOf } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import {
  toStrategy, toneOf, toneColor, alphaFor, toBenchSeries,
  AlphaChip, ConsistencyDots,
  FactsGrid, ReturnsVsBenchmarkTable, HowToReadThis, ComplianceFootnote,
  BENCH_NAME,
} from "@/components/pms/strategy-shared";
import { EnquireButton } from "@/components/pms/EnquireButton";
import { NewsletterBand } from "@/components/pms/NewsletterBand";

/*
  /pms/[slug] — one SEO page per PMS strategy.

  Statically pre-rendered for every strategy in the live feed
  (generateStaticParams) and refreshed daily via ISR, so the monthly APMI
  data updates flow through without a rebuild. Slugs come from
  pmsStrategySlug() — the same util the explorer's links and the sitemap
  use — so URLs are deterministic everywhere.
*/

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 86400; // daily ISR — monthly data refresh flows through

export async function generateStaticParams() {
  const clean = cleanPmsStrategies(await getLivePmsStrategies());
  // De-duplicate: a strategy duplicated verbatim in the feed (same name AND
  // manager) collapses onto one slug — emit it once.
  const slugs = new Set(clean.map((s) => pmsStrategySlug(s, clean)));
  return Array.from(slugs).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const clean = cleanPmsStrategies(await getLivePmsStrategies());
  const s = findPmsStrategyBySlug(clean, slug);
  if (!s) return { title: "Strategy not found" };

  // The root layout templates titles as "%s | PlanMyCashflows" — this title
  // already carries the brand, so mark it absolute to avoid doubling it.
  const title = `${s.strategyName} PMS by ${s.manager} — Returns, AUM & Analysis | PlanMyCashflows`;
  const ret3y = typeof s.returns3y === "number" ? `${s.returns3y.toFixed(1)}% 3Y annualised return` : "returns";
  const description = `${s.strategyName} by ${s.manager}: ${ret3y} vs ${BENCH_NAME}${s.category ? `, ${s.category} category` : ""}. AUM, minimum investment, alpha and consistency analysis, updated monthly from APMI disclosures.`;
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
  const [strategies, benchmark] = await Promise.all([getLivePmsStrategies(), getBenchmark()]);
  const clean = cleanPmsStrategies(strategies);
  const live = findPmsStrategyBySlug(clean, slug);
  if (!live) notFound();

  const s = toStrategy(live, clean);
  const bench = toBenchSeries(benchmark);
  const asOn = fmtAsOf(live.asOfDate);
  const ret3y = s.returns["3Y"];
  const alpha3y = alphaFor(s.returns, "3Y", bench);

  // Up to 6 stablemates from the same category, biggest first, linked.
  const related = live.category
    ? clean
        .filter((r) => r._id !== live._id && r.category === live.category)
        .sort((a, b) => (b.aumCr ?? -1) - (a.aumCr ?? -1))
        .slice(0, 6)
        .map((r) => toStrategy(r, clean))
    : [];

  return (
    <div className="font-ui min-h-screen" style={{ background: "var(--page)", color: "var(--ink)" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* back to the explorer */}
        <Link href="/investment-products/pms" className="font-ui inline-flex items-center gap-1.5 hover:underline"
          style={{ fontSize: 13, fontWeight: 500, color: "var(--green-deep)" }}>
          <ArrowLeft size={14} /> PMS Explorer
        </Link>

        {/* header */}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display" style={{ fontSize: 34, fontWeight: 600, color: "var(--ink)", lineHeight: 1.1 }}>
              {s.strategy} — {s.manager}
            </h1>
            <div className="flex items-center gap-2 mt-2.5">
              {s.category && (
                <span className="font-ui rounded-full px-2.5 py-0.5" style={{ fontSize: 12, fontWeight: 500, color: "var(--green-deep)", background: "var(--green-tint)" }}>
                  {s.category}
                </span>
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
            <ConsistencyDots ret={s.returns} bench={bench} />
          </div>
        </div>

        {/* key facts */}
        <div className="mt-4">
          <FactsGrid s={s} />
        </div>

        {/* returns vs benchmark */}
        <h2 className="font-ui mt-8 mb-2" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Returns vs {BENCH_NAME}</h2>
        <ReturnsVsBenchmarkTable returns={s.returns} bench={bench} />

        {/* honest read */}
        <div className="mt-4">
          <HowToReadThis returns={s.returns} asOn={asOn} bench={bench} />
        </div>

        {/* enquire CTA */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <EnquireButton strategy={s.strategy} source="pms-strategy-page" />
          <Link href="/investment-products/pms" className="font-ui flex-1 text-center rounded-xl py-3 px-5"
            style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", background: "#fff", border: "1px solid var(--line)" }}>
            Explore all PMS strategies
          </Link>
        </div>

        {/* related strategies */}
        {related.length > 0 && (
          <div className="mt-10">
            <h2 className="font-ui mb-3" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
              More {s.category} strategies
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {related.map((r) => {
                const r3 = r.returns["3Y"];
                return (
                  <Link key={r.id} href={`/pms/${r.slug}`}
                    className="group rounded-xl bg-white p-4 flex items-center justify-between gap-3"
                    style={{ border: "1px solid var(--line)" }}>
                    <div className="min-w-0">
                      <div className="font-ui truncate" style={{ fontSize: 11, color: "var(--muted)" }}>{r.manager}</div>
                      <div className="font-display truncate group-hover:underline" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{r.strategy}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="font-num" style={{ fontSize: 14, fontWeight: 600, color: r3 === null ? "var(--muted)" : toneColor[toneOf(r3)] }}>
                          {r3 === null ? "—" : `${r3.toFixed(1)}%`}
                        </div>
                        <div className="font-ui" style={{ fontSize: 10, color: "var(--muted)" }}>3Y</div>
                      </div>
                      <ArrowRight size={14} color="var(--muted)" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* monthly brief signup */}
        <NewsletterBand source="pms-strategy-page" />

        {/* compliance — same disclaimer as the explorer */}
        <ComplianceFootnote asOn={asOn} />
      </div>
    </div>
  );
}
