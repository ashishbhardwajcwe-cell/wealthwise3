import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { cryptoData } from "@/lib/product-data";
import { CryptoGraph } from "@/components/ProductGraphs";

export const metadata: Metadata = {
  title: "Cryptocurrency in India — Tax, Exchanges, Allocation, Custody",
  description:
    "Crypto in India: 30% tax + 1% TDS reality, BTC/ETH allocation guidance, Indian vs global exchanges, self-custody basics, and US tax for NRIs.",
};

export default function Page() {
  return <InvestmentProductPage data={{ ...cryptoData, graphic: <CryptoGraph /> }} />;
}
