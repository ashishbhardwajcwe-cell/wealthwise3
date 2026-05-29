import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { unlistedSharesData } from "@/lib/product-data";
import { UnlistedSharesGraph } from "@/components/ProductGraphs";
import { UnlistedTable } from "@/components/data-tables/UnlistedTable";
import { getUnlistedShares } from "@/lib/investment-data";

export const metadata: Metadata = {
  title: "Unlisted Shares & Pre-IPO Investing in India — 2026 Guide",
  description:
    "Pre-IPO and unlisted equity investing in India: platforms, tax treatment (LTCG 24mo), liquidity, valuation risks, and how to size your allocation.",
};

export const revalidate = 300;

export default async function Page() {
  const shares = await getUnlistedShares();
  return (
    <>
      <InvestmentProductPage data={{ ...unlistedSharesData, graphic: <UnlistedSharesGraph /> }} />
      {shares.length > 0 && <UnlistedTable shares={shares} />}
    </>
  );
}
