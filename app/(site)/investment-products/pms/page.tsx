import type { Metadata } from "next";
import Link from "next/link";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { pmsData } from "@/lib/product-data";
import { PMSGraph } from "@/components/ProductGraphs";
import PMSExplorer from "@/components/pms/PMSExplorer";
import { DataOnboardingNotice } from "@/components/data-tables/DataOnboardingNotice";
import { getLivePmsStrategies, getBenchmark } from "@/lib/investment-data";
import { toBenchmark } from "@/components/pms/strategy-shared";

export const metadata: Metadata = {
  title: "PMS (Portfolio Management Services) — Complete Guide for Indian HNI",
  description:
    "Portfolio Management Services in India: ₹50L minimum, fee structures, top strategies, how to evaluate a manager, and PMS vs Mutual Funds vs AIF.",
};

export const revalidate = 300;

export default async function Page() {
  const [strategies, benchmark] = await Promise.all([getLivePmsStrategies(), getBenchmark()]);

  // The live PMS explorer (the data visitors come for) is rendered as
  // InvestmentProductPage's liveSection so it sits right after the hero,
  // before the long educational guide — not buried at the bottom.
  const liveSection = (
    <>
      {strategies.length > 0 ? (
        <PMSExplorer strategies={strategies} benchmark={toBenchmark(benchmark)} />
      ) : (
        <DataOnboardingNotice
          title="PMS performance tracker — coming online"
          description="We refresh PMS strategy returns monthly from APMI, the SEBI-mandated industry body where every registered portfolio manager publishes standardised TWRR performance. The first dataset is being onboarded — meanwhile, the guide below covers how to evaluate any PMS manager."
        />
      )}
      <section className="py-10">
        <div className="container-narrow">
          <div className="card-soft flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm md:text-base text-[var(--color-slate)] leading-relaxed">
              Wondering what fixed and performance fees do to your returns over a decade?
            </p>
            <Link href="/resources/calculators/pms-fees" className="btn-primary text-sm whitespace-nowrap">
              Try the PMS Fee Calculator
            </Link>
          </div>
        </div>
      </section>
    </>
  );

  return <InvestmentProductPage data={{ ...pmsData, graphic: <PMSGraph /> }} liveSection={liveSection} />;
}
