import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { goldData } from "@/lib/product-data";
import { GoldGraph } from "@/components/ProductGraphs";
import { LiveMetalsSection } from "@/components/markets/LiveMetalsSection";

export const metadata: Metadata = {
  title: "Gold & Silver — Physical, ETF, Sovereign Gold Bond (SGB) Compared",
  description:
    "Best way to own gold & silver in India: SGB vs Gold ETF vs physical, silver ETFs, 2.5% SGB interest, tax treatment, and why 5–10% allocation is enough.",
};

export default function Page() {
  return (
    <>
      <InvestmentProductPage data={{ ...goldData, graphic: <GoldGraph /> }} />
      <LiveMetalsSection />
    </>
  );
}
