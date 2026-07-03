import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { aifData } from "@/lib/product-data";
import { AIFGraph } from "@/components/ProductGraphs";
import { AIFTable } from "@/components/data-tables/AIFTable";
import { DataOnboardingNotice } from "@/components/data-tables/DataOnboardingNotice";
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
      {funds.length > 0 ? (
        <AIFTable funds={funds} />
      ) : (
        <DataOnboardingNotice
          title="AIF fund tracker — coming online"
          description="AIF performance is vintage-specific and disclosed quarterly through manager letters and CRISIL's AIF benchmarks. The first dataset is being onboarded — meanwhile, the guide above explains Category I / II / III structures, fees, and how to read an AIF track record."
        />
      )}
    </>
  );
}
