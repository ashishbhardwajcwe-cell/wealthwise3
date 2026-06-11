import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Check, X, TrendingUp } from "lucide-react";
import { PortableContent } from "@/components/PortableContent";
import { StructuredData, articleSchema } from "@/components/StructuredData";
import { ShareButtons } from "@/components/ShareButtons";
import { SymbolInfo } from "@/components/markets/SymbolInfo";
import { getStockAnalysis, getStockAnalysisSlugs, getStockAnalyses } from "@/lib/investment-data";
import { urlFor } from "@/sanity/client";
import { siteConfig } from "@/lib/site-config";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getStockAnalysisSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await getStockAnalysis(slug);
  if (!a) return { title: "Analysis not found" };
  return {
    title: `${a.title} — Auris Wealth Research`,
    description: a.thesis ?? `${a.company} stock analysis by Col Ashish Bhardwaj`,
  };
}

export default async function StockAnalysisPage({ params }: Props) {
  const { slug } = await params;
  const a = await getStockAnalysis(slug);
  if (!a) notFound();

  const allAnalyses = await getStockAnalyses();
  const related = allAnalyses
    .filter((x) => x.slug !== slug && x.sector === a.sector)
    .slice(0, 3);

  const authorImageUrl = a.author?.image
    ? urlFor(a.author.image as never).width(80).height(80).url()
    : null;

  return (
    <>
      <article className="py-16 md:py-20">
        <div className="container-narrow">
          <Link href="/equity/analysis" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-slate)] hover:text-[var(--color-gold-dim)] mb-8">
            <ArrowLeft className="w-4 h-4" /> All analyses
          </Link>

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="eyebrow">{a.ticker}</span>
            {a.sector && <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-sand)]/60 text-[var(--color-slate)] font-semibold">{a.sector}</span>}
            {a.marketCap && <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-sand)]/60 text-[var(--color-slate)] font-semibold">{a.marketCap} Cap</span>}
          </div>

          <h1 className="text-balance">{a.title}</h1>
          <p className="mt-3 text-lg text-[var(--color-slate)]">{a.company}</p>

          <div className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--color-slate)]">
            <Calendar className="w-4 h-4" /> Analysis dated {a.analysisDate}
          </div>

          
          {a.thesis && (
            <div className="mt-8 bg-[var(--color-parchment)] border border-[var(--color-gold)]/30 rounded-2xl p-6 md:p-7">
              <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">The thesis</div>
              <p className="text-[var(--color-navy)] leading-relaxed text-lg">{a.thesis}</p>
            </div>
          )}

          {/* Live price card — auto-derives the TradingView symbol from the ticker */}
          {a.ticker && (
            <div className="mt-8">
              <SymbolInfo symbol={`BSE:${a.ticker}`} />
            </div>
          )}

          {a.keyMetrics && (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3">
              {a.keyMetrics.cmp !== undefined && <MetricCard label="CMP" value={`₹${a.keyMetrics.cmp.toLocaleString("en-IN")}`} />}
              {a.keyMetrics.pe !== undefined && <MetricCard label="P/E (TTM)" value={a.keyMetrics.pe.toFixed(1)} />}
              {a.keyMetrics.roe !== undefined && <MetricCard label="ROE" value={`${a.keyMetrics.roe.toFixed(0)}%`} />}
              {a.keyMetrics.debtToEquity !== undefined && <MetricCard label="Debt/Equity" value={a.keyMetrics.debtToEquity.toFixed(2)} />}
              {a.keyMetrics.marketCapCr !== undefined && <MetricCard label="Mkt Cap" value={`₹${a.keyMetrics.marketCapCr.toLocaleString("en-IN")} Cr`} />}
            </div>
          )}

          
          {a.body ? (
            <div className="prose-article mt-12">
              <PortableContent value={a.body} />
            </div>
          ) : null}

          
          {((a.strengths && a.strengths.length > 0) || (a.risks && a.risks.length > 0)) && (
            <div className="mt-10 grid md:grid-cols-2 gap-5">
              {a.strengths && a.strengths.length > 0 && (
                <div className="bg-white border border-[var(--color-silver)]/40 rounded-xl p-6">
                  <h3 className="text-base font-semibold mb-4 text-[var(--color-emerald)] flex items-center gap-2">
                    <Check className="w-5 h-5" /> Strengths
                  </h3>
                  <ul className="space-y-3">
                    {a.strengths.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-[var(--color-navy)]">
                        <Check className="w-4 h-4 text-[var(--color-emerald)] mt-0.5 flex-shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {a.risks && a.risks.length > 0 && (
                <div className="bg-white border border-[var(--color-silver)]/40 rounded-xl p-6">
                  <h3 className="text-base font-semibold mb-4 text-[var(--color-ruby)] flex items-center gap-2">
                    <X className="w-5 h-5" /> Risks
                  </h3>
                  <ul className="space-y-3">
                    {a.risks.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-[var(--color-navy)]">
                        <X className="w-4 h-4 text-[var(--color-ruby)] mt-0.5 flex-shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          
          {a.conclusion && (
            <div className="mt-10 bg-[var(--color-navy)] text-[var(--color-cream)] rounded-2xl p-6 md:p-7">
              <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-light)] mb-2">Conclusion</div>
              <p className="text-lg leading-relaxed">{a.conclusion}</p>
            </div>
          )}

          
          {a.author && (
            <div className="mt-12 p-6 bg-[var(--color-parchment)] rounded-xl border border-[var(--color-gold)]/20 flex items-start gap-4">
              {authorImageUrl && (
                <Image src={authorImageUrl} alt={a.author.name ?? "Author"} width={56} height={56} className="rounded-full" />
              )}
              <div>
                <h4 className="font-semibold text-[var(--color-navy)]">{a.author.name}</h4>
                {a.author.role && <p className="text-sm text-[var(--color-slate)] mt-0.5">{a.author.role}</p>}
              </div>
            </div>
          )}

          
          {related.length > 0 && (
            <div className="mt-12">
              <h3 className="text-xl font-semibold mb-6">Related analyses</h3>
              <div className="space-y-2">
                {related.map((r) => (
                  <Link
                    key={r._id}
                    href={`/equity/analysis/${r.slug}`}
                    className="flex items-center justify-between p-4 bg-white border border-[var(--color-silver)]/40 rounded-lg hover:border-[var(--color-gold)] transition-colors group"
                  >
                    <div>
                      <div className="text-xs text-[var(--color-slate)]">{r.ticker} · {r.sector}</div>
                      <div className="font-semibold text-[var(--color-navy)] mt-0.5 group-hover:text-[var(--color-gold-dim)]">{r.title}</div>
                    </div>
                    <TrendingUp className="w-4 h-4 text-[var(--color-slate)] group-hover:text-[var(--color-gold-dim)]" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          
          <div className="mt-12 flex justify-between items-center flex-wrap gap-3 pb-6 border-b border-[var(--color-silver)]/30">
            <span className="text-sm font-semibold text-[var(--color-navy)]">Share this analysis</span>
            <ShareButtons url={`${siteConfig.url}/equity/analysis/${slug}`} title={a.title} summary={a.thesis} utmCampaign={`equity-${slug}`} />
          </div>

          
          <div className="mt-12 text-xs text-[var(--color-slate)] leading-relaxed italic">
            This analysis is for educational purposes only and does not constitute investment, legal, or tax advice.
            Securities mentioned are not specific buy/sell recommendations.
            Please consult a SEBI-registered investment adviser before making investment decisions.
            Key metrics shown were accurate as of the analysis date and change over time.
          </div>
        </div>
      </article>

      <StructuredData
        data={articleSchema({
          title: a.title,
          description: a.thesis ?? `${a.company} stock analysis`,
          author: a.author?.name ?? "Col Ashish Bhardwaj",
          date: a.analysisDate,
          url: `${siteConfig.url}/equity/analysis/${slug}`,
        })}
      />
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-[var(--color-silver)]/40 rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-slate)] font-semibold">{label}</div>
      <div className="text-lg font-semibold text-[var(--color-navy)] mt-1 tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
        {value}
      </div>
    </div>
  );
}
