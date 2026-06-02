import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { CTASection } from "@/components/CTASection";
import { MarketsNav } from "@/components/markets/MarketsNav";
import { LiveMarketsSection } from "@/components/markets/LiveMarketsSection";
import { LiveMetalsSection } from "@/components/markets/LiveMetalsSection";
import { CryptoLiveTable } from "@/components/crypto-tracker/CryptoLiveTable";
import { MFLiveTable } from "@/components/markets/MFLiveTable";
import { GoldSilverETFTable } from "@/components/markets/GoldSilverETFTable";
import { getTopCryptoInINR, getCoinUsdPrices } from "@/lib/crypto";
import { getTrackedMFNAVs, TRACKED_METAL_ETFS } from "@/lib/mutual-funds";

export const metadata: Metadata = {
  title: "Markets — Live Crypto, Stocks, Mutual Funds, Gold & Silver",
  description:
    "Auris Wealth's consolidated live markets hub: sortable screeners for cryptocurrencies, Indian & US stocks, Indian mutual funds, and gold/silver ETFs — all in one place.",
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

  const usdPrices = coins.length > 0
    ? await getCoinUsdPrices(coins.map((c) => c.id))
    : {};

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

      <MarketsNav />

      <section id="stocks" className="scroll-mt-32">
        <LiveMarketsSection />
      </section>

      <section id="crypto" className="scroll-mt-32">
        <CryptoLiveTable coins={coins} usdPrices={usdPrices} />
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
    </>
  );
}
