import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, ArrowRight } from "lucide-react";
import { Hero } from "@/components/Hero";
import { CTASection } from "@/components/CTASection";
import { getStockAnalyses } from "@/lib/investment-data";

export const metadata: Metadata = {
  title: "Stock Analyses — Auris Wealth Research",
  description:
    "In-depth stock research notes by Col Ashish Bhardwaj. Thesis, key metrics, strengths, risks, and conclusion for each analysis.",
};

export const revalidate = 300;

export default async function StockAnalysisIndexPage() {
  const analyses = await getStockAnalyses();

  return (
    <>
      <Hero
        eyebrow="Research"
        title="Stock Analyses"
        subtitle="In-depth research notes. Each analysis covers the thesis, key metrics, strengths, risks, and where I think the right entry zone is. Educational only — never specific buy/sell recommendations."
      />

      <section className="py-16">
        <div className="container-wide">
          {analyses.length === 0 ? (
            <div className="text-center py-16 max-w-md mx-auto">
              <TrendingUp className="w-12 h-12 text-[var(--color-slate)] mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-semibold mb-2">No analyses published yet</h2>
              <p className="text-[var(--color-slate)] text-sm">
                Stock analyses will appear here as they&apos;re published. Subscribe to the newsletter to be notified.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {analyses.map((a) => (
                <Link
                  key={a._id}
                  href={`/equity/analysis/${a.slug}`}
                  className="card-soft group block"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)]">{a.ticker}</div>
                      <div className="text-sm text-[var(--color-slate)] mt-0.5">{a.company}</div>
                    </div>
                    {a.marketCap && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full bg-[var(--color-sand)]/60 text-[var(--color-slate)]">
                        {a.marketCap}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold mb-3 leading-snug group-hover:text-[var(--color-gold-dim)] transition-colors">{a.title}</h3>

                  {a.thesis && (
                    <p className="text-sm text-[var(--color-slate)] leading-relaxed line-clamp-3 mb-4">{a.thesis}</p>
                  )}

                  {a.keyMetrics && (a.keyMetrics.cmp || a.keyMetrics.pe) && (
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--color-silver)]/30">
                      {a.keyMetrics.cmp !== undefined && (
                        <Metric label="CMP" value={`₹${a.keyMetrics.cmp.toLocaleString("en-IN")}`} />
                      )}
                      {a.keyMetrics.pe !== undefined && (
                        <Metric label="P/E" value={a.keyMetrics.pe.toFixed(1)} />
                      )}
                      {a.keyMetrics.roe !== undefined && (
                        <Metric label="ROE" value={`${a.keyMetrics.roe.toFixed(0)}%`} />
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-5 text-xs text-[var(--color-slate)]">
                    <span>{a.analysisDate}</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[var(--color-gold-dim)]" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <CTASection
        title="Want our take on a specific stock?"
        subtitle="Subscribe to the newsletter — we publish 1-2 stock analyses per month."
        primaryCta={{ label: "Try the AI Planner", href: "/plan" }}
        secondaryCta={{ label: "Read the blog", href: "/blog" }}
      />
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-slate)] font-semibold">{label}</div>
      <div className="text-sm font-semibold text-[var(--color-navy)] mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}
