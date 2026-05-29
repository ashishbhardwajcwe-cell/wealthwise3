import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { pmsData } from "@/lib/product-data";
import { PMSGraph } from "@/components/ProductGraphs";
import { PMSTable } from "@/components/data-tables/PMSTable";
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
      {strategies.length > 0 && <PMSTable strategies={strategies} />}
    </>
  );
}
