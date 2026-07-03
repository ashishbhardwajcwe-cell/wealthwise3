import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { cryptoData } from "@/lib/product-data";
import { CryptoGraph } from "@/components/ProductGraphs";
import { CryptoLiveTable } from "@/components/crypto-tracker/CryptoLiveTable";
import { getTopCryptoInINR, getCoinUsdPrices, getCoinLongTermReturns } from "@/lib/crypto";

export const metadata: Metadata = {
  title: "Cryptocurrency in India — Tax, Exchanges, Allocation, Custody",
  description:
    "Crypto in India: 30% tax + 1% TDS reality, BTC/ETH allocation guidance, Indian vs global exchanges, self-custody basics, and US tax for NRIs.",
};

export const revalidate = 300; // 5 min — matches the upstream cache window

export default async function Page() {
  const coins = await getTopCryptoInINR(100);
  const ids = coins.map((c) => c.id);
  const [usdPrices, longTerm] = await Promise.all([
    ids.length > 0 ? getCoinUsdPrices(ids) : Promise.resolve({}),
    // 2Y/3Y/5Y/10Y for the top 30 — long histories matter most for large caps.
    getCoinLongTermReturns(coins.map((c) => ({ id: c.id, symbol: c.symbol })), 30),
  ]);

  const enriched = coins.map((c) => {
    const lt = longTerm.get(c.id);
    return lt ? { ...c, ...lt } : c;
  });

  return (
    <InvestmentProductPage
      data={{ ...cryptoData, graphic: <CryptoGraph /> }}
      liveSection={<CryptoLiveTable coins={enriched} usdPrices={usdPrices} />}
    />
  );
}
