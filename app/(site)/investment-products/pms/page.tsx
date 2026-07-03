import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { pmsData } from "@/lib/product-data";
import { PMSGraph } from "@/components/ProductGraphs";
import { PMSTable } from "@/components/data-tables/PMSTable";
import { DataOnboardingNotice } from "@/components/data-tables/DataOnboardingNotice";
import { getPmsStrategies } from "@/lib/investment-data";

export const metadata: Metadata = {
  title: "PMS (Portfolio Management Services) — Complete Guide for Indian HNI",
  description:
    "Portfolio Management Services in India: ₹50L minimum, fee structures, top strategies, how to evaluate a manager, and PMS vs Mutual Funds vs AIF.",
};

export const revalidate = 300;

export default async function Page() {
  const strategies = await getPmsStrategies();
  return (
    <>
      <InvestmentProductPage data={{ ...pmsData, graphic: <PMSGraph /> }} />
      {strategies.length > 0 ? (
        <PMSTable strategies={strategies} />
      ) : (
        <DataOnboardingNotice
          title="PMS performance tracker — coming online"
          description="We refresh PMS strategy returns monthly from APMI, the SEBI-mandated industry body where every registered portfolio manager publishes standardised TWRR performance. The first dataset is being onboarded — meanwhile, the guide above covers how to evaluate any PMS manager."
        />
      )}
    </>
  );
}
