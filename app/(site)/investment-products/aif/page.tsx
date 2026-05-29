import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { aifData } from "@/lib/product-data";
import { AIFGraph } from "@/components/ProductGraphs";
import { AIFTable } from "@/components/data-tables/AIFTable";
import { getAifFunds } from "@/lib/investment-data";

export const metadata: Metadata = {
  title: "AIF Categories I, II, III — Alternative Investment Funds in India",
  description:
    "Alternative Investment Funds explained: Cat I, II, III differences, taxation, lock-in, fees, and when AIFs make sense vs PMS vs Mutual Funds.",
};

export const revalidate = 300;

export default async function Page() {
  const funds = await getAifFunds();
  return (
    <>
      <InvestmentProductPage data={{ ...aifData, graphic: <AIFGraph /> }} />
      {funds.length > 0 && <AIFTable funds={funds} />}
    </>
  );
}
