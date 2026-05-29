import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { FeatureGrid } from "@/components/FeatureGrid";
import { calculators } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Free Financial Calculators — SIP, Lumpsum, Retirement, FIRE",
  description:
    "Seven free interactive calculators for Indian investors: SIP, lumpsum, retirement corpus, FIRE, tax harvesting, NRI tax, EMI.",
};

const iconMap: Record<string, string> = {
  sip: "TrendingUp",
  lumpsum: "DollarSign",
  retirement: "Sunset",
  fire: "Flame",
  "tax-harvesting": "Receipt",
  "nri-tax": "Globe",
  emi: "Home",
};

export default function CalculatorsIndexPage() {
  return (
    <>
      <Hero
        eyebrow="Resources"
        title="Calculators"
        subtitle="Seven free interactive calculators for the most common Indian investor questions. Each shows you the maths and lets you tweak the inputs."
      />
      <FeatureGrid
        title="Pick a calculator"
        items={calculators.map((c) => ({
          icon: iconMap[c.slug] ?? "Calculator",
          name: c.name,
          short: c.short,
          href: `/resources/calculators/${c.slug}`,
        }))}
        columns={3}
      />
    </>
  );
}
