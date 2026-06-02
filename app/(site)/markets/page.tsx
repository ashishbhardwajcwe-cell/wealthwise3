import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { CTASection } from "@/components/CTASection";
import { MarketsNav } from "@/components/markets/MarketsNav";
import { MarketsTopMovers } from "@/components/markets/MarketsTopMovers";
import { LiveMarketsSection } from "@/components/markets/LiveMarketsSection";
import { LiveMetalsSection } from "@/components/markets/LiveMetalsSection";
import { CryptoLiveTable } from "@/components/crypto-tracker/CryptoLiveTable";
import { MFLiveTable } from "@/components/markets/MFLiveTable";
import { GoldSilverETFTable } from "@/components/markets/GoldSilverETFTable";
import { StructuredData, breadcrumbSchema, collectionPageSchema } from "@/components/StructuredData";
import { getTopCryptoInINR, getCoinUsdPrices, getCoinLongTermReturns } from "@/lib/crypto";
import { getTrackedMFNAVs, TRACKED_METAL_ETFS } from "@/lib/mutual-funds";

export const metadata: Metadata = {
  title: "Markets — Live Crypto, Stocks, Mutual Funds, Gold & Silver",
  description:
    "Auris Wealth's consolidated live markets hub: sortable screeners for cryptocurrencies, Indian & US stocks, Indian mutual funds, and gold/silver ETFs — all in one place.",
  alternates: { canonical: "https://auriswealth.co/markets" },
  openGraph: {
    title: "Markets — Live Crypto, Stocks, Mutual Funds, Gold & Silver",
    description:
      "Sortable, searchable screeners for every asset class we track. Indian & US stocks, 100 cryptos, hand-picked mutual funds, gold & silver ETFs — one page.",
    url: "https://auriswealth.co/markets",
    type: "website",
  },
};

// All four data sources self-revalidate, but cap the page at 5 min so the
// freshest one (crypto) always re-runs.
export const revalidate = 300;

export default async function Page() {
  // Fetch everything in parallel — total page render is bounded by the slowest source.
  const [coins, mfRows, etfRows] = await Promise.all([
    getTopCryptoInINR(100),
    getTrackedMFNAVs(),
    getTrackedMFNAVs(TRACKED_METAL_ETFS),
  ]);

  const ids = coins.map((c) => c.id);
  const [usdPrices, longTerm] = await Promise.all([
    ids.length > 0 ? getCoinUsdPrices(ids) : Promise.resolve({}),
    getCoinLongTermReturns(ids, 30),
  ]);

  const enrichedCoins = coins.map((c) => {
    const lt = longTerm.get(c.id);
    return lt ? { ...c, ...lt } : c;
  });

  const pageSchema = collectionPageSchema({
    name: "Markets — Live Crypto, Stocks, Mutual Funds, Gold & Silver",
    description:
      "Live screeners for Indian & US stocks, 100 cryptocurrencies, hand-picked mutual funds, and gold/silver ETFs.",
    url: "https://auriswealth.co/markets",
    datasets: [
      {
        name: "Indian & US Stock Screener",
        description:
          "Sortable screener for NSE/BSE and NYSE/NASDAQ stocks via TradingView. Covers market cap, P/E, dividend yield, performance and technicals.",
      },
      {
        name: "Cryptocurrency Screener (Top 100)",
        description:
          "Live INR + USD prices, 24h/7d changes, volume, market cap, sparkline charts and distance from ATH for the top 100 cryptocurrencies by market cap.",
      },
      {
        name: "Indian Mutual Funds Screener",
        description:
          "Hand-picked Indian mutual funds across large cap, flexi cap, mid cap, small cap, ELSS, hybrid and debt categories — with live NAV from AMFI and 1Y/3Y/5Y CAGR from historical NAVs.",
      },
      {
        name: "Gold & Silver ETF Screener",
        description:
          "Live NAVs and 1Y/3Y/5Y returns for every major Indian gold and silver ETF, priced in INR. Includes spot prices and the USD/INR rate for international conversion.",
      },
    ],
  });

  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "https://auriswealth.co/" },
    { name: "Markets", url: "https://auriswealth.co/markets" },
  ]);

  return (
    <>
      <Hero
        eyebrow="Live markets"
        title="Markets hub"
        subtitle="Sortable, searchable screeners for every asset class we track — crypto, Indian & US stocks, mutual funds, and gold/silver ETFs. Updated multiple times daily."
        primaryCta={{ label: "Build my plan", href: "/ai-wealth-planner" }}
        secondaryCta={{ label: "Talk to our expert", href: "/contact" }}
        align="left"
      />

      <MarketsTopMovers coins={enrichedCoins} mfRows={mfRows} etfRows={etfRows} />

      <MarketsNav />

      <section id="stocks" className="scroll-mt-32">
        <LiveMarketsSection />
      </section>

      <section id="crypto" className="scroll-mt-32">
        <CryptoLiveTable coins={enrichedCoins} usdPrices={usdPrices} />
      </section>

      <section id="mutual-funds" className="scroll-mt-32">
        <MFLiveTable rows={mfRows} />
      </section>

      <section id="gold" className="scroll-mt-32">
        <LiveMetalsSection />
        <GoldSilverETFTable rows={etfRows} />
      </section>

      <CTASection
        title="Live data is the start — a plan is what compounds"
        subtitle="Screeners help you understand the universe. A personalised plan tells you what to actually buy, when, and how much."
        primaryCta={{ label: "Run my snapshot", href: "/ai-wealth-planner" }}
        secondaryCta={{ label: "Book a call", href: "/contact" }}
      />

      <StructuredData data={pageSchema} />
      <StructuredData data={breadcrumb} />
    </>
  );
}
