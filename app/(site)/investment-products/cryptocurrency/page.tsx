import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { cryptoData } from "@/lib/product-data";
import { CryptoGraph } from "@/components/ProductGraphs";
import { CryptoLiveTable } from "@/components/crypto-tracker/CryptoLiveTable";
import { getTopCryptoInINR, getCoinUsdPrices } from "@/lib/crypto";

export const metadata: Metadata = {
  title: "Cryptocurrency in India — Tax, Exchanges, Allocation, Custody",
  description:
    "Crypto in India: 30% tax + 1% TDS reality, BTC/ETH allocation guidance, Indian vs global exchanges, self-custody basics, and US tax for NRIs.",
};

export const revalidate = 300; // 5 min — matches the upstream cache window

export default async function Page() {
  const coins = await getTopCryptoInINR(10);
  const usdPrices = coins.length > 0
    ? await getCoinUsdPrices(coins.map((c) => c.id))
    : {};

  return (
    <>
      <InvestmentProductPage data={{ ...cryptoData, graphic: <CryptoGraph /> }} />
      <CryptoLiveTable coins={coins} usdPrices={usdPrices} />
    </>
  );
}
