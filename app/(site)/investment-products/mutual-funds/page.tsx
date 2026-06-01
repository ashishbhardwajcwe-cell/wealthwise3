import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { mutualFundsData } from "@/lib/product-data";
import { MutualFundsGraph } from "@/components/ProductGraphs";
import { MFLiveTable } from "@/components/markets/MFLiveTable";
import { getTrackedMFNAVs } from "@/lib/mutual-funds";

export const metadata: Metadata = {
  title: "Mutual Funds in India — Direct vs Regular, Tax, How to Pick",
  description:
    "Everything Indian investors need on mutual funds: SIP vs lumpsum, Direct vs Regular plans, ELSS, taxation, and how to build a 3–5 fund portfolio.",
};

// AMFI publishes once a day at ~10pm IST. 6h ISR is plenty.
export const revalidate = 21600;

export default async function Page() {
  const rows = await getTrackedMFNAVs();
  return (
    <InvestmentProductPage
      data={{ ...mutualFundsData, graphic: <MutualFundsGraph /> }}
      liveSection={<MFLiveTable rows={rows} />}
    />
  );
}
