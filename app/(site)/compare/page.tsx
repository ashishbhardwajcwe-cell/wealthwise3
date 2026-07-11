import type { Metadata } from "next";
import Link from "next/link";
import { CompareTool } from "@/components/compare/CompareTool";
import { siteConfig } from "@/lib/site-config";
import { getLivePmsStrategies } from "@/lib/investment-data";

export const metadata: Metadata = {
  title: { absolute: "Compare PMS & AIF Strategies | PlanMyCashflows" },
  description:
    "Compare PMS and AIF strategies side-by-side — category, returns, AUM and minimum investment — before you commit. Live performance data is being integrated.",
};

export const revalidate = 300;

export default async function ComparePage() {
  const strategies = await getLivePmsStrategies();
  return (
    <>
      <section className="gradient-hero aurora">
        <div className="container-wide py-16 md:py-20 text-center">
          <span className="eyebrow">Compare</span>
          <h1 className="mt-4 text-balance max-w-3xl mx-auto">Compare PMS &amp; AIF Strategies</h1>
          <p className="mt-5 text-lg text-[var(--color-slate)] leading-relaxed max-w-2xl mx-auto text-balance">
            Put up to three strategies side-by-side — category, returns, AUM and minimum investment.{" "}
            {strategies.length === 0 && (
              <em className="text-sm">
                (Live performance data is being integrated — the values below are illustrative placeholders of what
                you&apos;ll be able to compare.)
              </em>
            )}
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container-wide">
          <CompareTool strategies={strategies} />

          <p className="text-xs text-[var(--color-slate)] italic text-center mt-8 max-w-3xl mx-auto">
            Strategy details shown are for information and education only and do not constitute a recommendation or
            an offer to invest. Past performance is not indicative of future returns. Investments in securities
            markets are subject to market risks; read all scheme-related documents carefully before investing.
          </p>

          <div className="mt-12 max-w-3xl mx-auto card-soft text-center">
            <p className="text-sm md:text-base text-[var(--color-slate)] leading-relaxed">
              Not sure where to start? Learn the basics of{" "}
              <Link href="/investment-products/pms" className="font-semibold text-[var(--color-gold-dim)]">
                PMS
              </Link>{" "}
              and{" "}
              <Link href="/investment-products/aif" className="font-semibold text-[var(--color-gold-dim)]">
                AIF
              </Link>
              , or talk it through with our team.
            </p>
            <a href={siteConfig.topmateUrl} target="_blank" rel="noreferrer" className="btn-primary mt-5 inline-flex">
              Book a Call
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
