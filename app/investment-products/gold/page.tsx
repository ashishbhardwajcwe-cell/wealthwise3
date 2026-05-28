import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { goldData } from "@/lib/product-data";

export const metadata: Metadata = {
  title: "Gold — Physical vs ETF vs Sovereign Gold Bond (SGB) Compared",
  description:
    "Best way to own gold in India: SGB vs Gold ETF vs physical, 2.5% SGB interest, tax treatment, and why 5–10% allocation is enough.",
};

export default function Page() {
  return <InvestmentProductPage data={goldData} />;
}
