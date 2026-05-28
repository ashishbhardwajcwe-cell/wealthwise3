import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { realEstateData } from "@/lib/product-data";

export const metadata: Metadata = {
  title: "Real Estate — Residential, Commercial, REITs in India",
  description:
    "Real estate for Indian investors: buy vs rent, residential vs commercial, REITs (Embassy, Mindspace), tax on rental income and capital gains.",
};

export default function Page() {
  return <InvestmentProductPage data={realEstateData} />;
}
