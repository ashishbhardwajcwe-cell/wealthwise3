import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { aifData } from "@/lib/product-data";
import { AIFGraph } from "@/components/ProductGraphs";
import { AIFTable } from "@/components/data-tables/AIFTable";
import { AIFDirectory } from "@/components/data-tables/AIFDirectory";
import { DataOnboardingNotice } from "@/components/data-tables/DataOnboardingNotice";
import { getAifFunds, type AifFund } from "@/lib/investment-data";

/** A fund counts as "tracked" once an AMC factsheet gives it real performance. */
function hasPerformance(f: AifFund): boolean {
  const r = f.returns;
  return !!r && [r.netIrr, r.moic, r.dpi, r.tvpi].some((v) => v !== undefined && v !== null);
}

export const metadata: Metadata = {
  title: "AIF Categories I, II, III — Alternative Investment Funds in India",
  description:
    "Alternative Investment Funds explained: Cat I, II, III differences, taxation, lock-in, fees, and when AIFs make sense vs PMS vs Mutual Funds.",
};

export const revalidate = 300;

export default async function Page() {
  const funds = await getAifFunds();
  const tracked = funds.filter(hasPerformance);
  return (
    <>
      <InvestmentProductPage data={{ ...aifData, graphic: <AIFGraph /> }} />
      {/* Performance tracker — only the select funds whose AMCs shared a factsheet. */}
      {tracked.length > 0 && <AIFTable funds={tracked} />}
      {/* The full SEBI registry, browsable. */}
      {funds.length > 0 ? (
        <AIFDirectory funds={funds} />
      ) : (
        <DataOnboardingNotice
          title="AIF directory — coming online"
          description="We publish every SEBI-registered Alternative Investment Fund from SEBI's own list, refreshed monthly. The first pull is being onboarded — meanwhile, the guide above explains Category I / II / III structures, fees, and how to read an AIF track record."
        />
      )}
    </>
  );
}
