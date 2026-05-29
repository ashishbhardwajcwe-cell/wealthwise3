import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { mutualFundsData } from "@/lib/product-data";
import { MutualFundsGraph } from "@/components/ProductGraphs";

export const metadata: Metadata = {
  title: "Mutual Funds in India — Direct vs Regular, Tax, How to Pick",
  description:
    "Everything Indian investors need on mutual funds: SIP vs lumpsum, Direct vs Regular plans, ELSS, taxation, and how to build a 3–5 fund portfolio.",
};

export default function Page() {
  return <InvestmentProductPage data={{ ...mutualFundsData, graphic: <MutualFundsGraph /> }} />;
}
