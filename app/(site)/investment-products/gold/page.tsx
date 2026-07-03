import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { goldData } from "@/lib/product-data";
import { GoldGraph } from "@/components/ProductGraphs";
import { LiveMetalsSection } from "@/components/markets/LiveMetalsSection";
import { GoldSilverETFTable } from "@/components/markets/GoldSilverETFTable";
import { getMetalETFs } from "@/lib/mutual-funds";

export const metadata: Metadata = {
  title: "Gold & Silver — Physical, ETF, Sovereign Gold Bond (SGB) Compared",
  description:
    "Best way to own gold & silver in India: SGB vs Gold ETF vs physical, silver ETFs, 2.5% SGB interest, tax treatment, and why 5–10% allocation is enough.",
};

// AMFI publishes once a day at ~10pm IST. 6h ISR is plenty.
export const revalidate = 21600;

export default async function Page() {
  const etfRows = await getMetalETFs();
  return (
    <InvestmentProductPage
      data={{ ...goldData, graphic: <GoldGraph /> }}
      liveSection={
        <>
          <LiveMetalsSection />
          <GoldSilverETFTable rows={etfRows} />
        </>
      }
    />
  );
}
