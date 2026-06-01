import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { FeatureGrid } from "@/components/FeatureGrid";
import { CTASection } from "@/components/CTASection";
import { investmentProducts } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Investment Products — Every Vehicle, Explained",
  description:
    "Educational deep-dives on every major investment vehicle for Indian and global investors: mutual funds, PMS, AIF, unlisted shares, crypto, equity, insurance, real estate, gold.",
};

export default function InvestmentProductsPage() {
  return (
    <>
      <Hero
        eyebrow="Investment Products"
        title="Every vehicle, explained in plain language"
        subtitle="Nine deep-dives covering everything an Indian (or global Indian) investor will encounter — from mutual funds to alternative investments. Educational, not promotional."
      />
      <FeatureGrid
        title="Pick a product"
        items={investmentProducts.map((p) => ({
          icon: p.icon,
          name: p.name,
          short: p.short,
          href: `/investment-products/${p.slug}`,
        }))}
        columns={3}
      />
      <CTASection
        title="Not sure which products fit your situation?"
        subtitle="The free AI Wealth Planner takes three numbers and suggests where each rupee should go."
        primaryCta={{ label: "Try the AI Wealth Planner", href: "/ai-wealth-planner" }}
        secondaryCta={{ label: "Book a call", href: "/contact" }}
      />
    </>
  );
}
