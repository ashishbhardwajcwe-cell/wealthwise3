import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { directEquityData } from "@/lib/product-data";
import { DirectEquityGraph } from "@/components/ProductGraphs";

export const metadata: Metadata = {
  title: "Direct Equity (Stocks) — How to Invest in Indian Stocks",
  description:
    "Direct stock investing on NSE/BSE: how many stocks to own, evaluation framework, long-term vs trading, tax on STCG/LTCG, and why most retail underperform.",
};

export default function Page() {
  return <InvestmentProductPage data={{ ...directEquityData, graphic: <DirectEquityGraph /> }} />;
}
