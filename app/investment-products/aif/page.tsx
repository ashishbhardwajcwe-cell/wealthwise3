import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { aifData } from "@/lib/product-data";

export const metadata: Metadata = {
  title: "AIF Categories I, II, III — Alternative Investment Funds in India",
  description:
    "Alternative Investment Funds explained: Cat I, II, III differences, taxation, lock-in, fees, and when AIFs make sense vs PMS vs Mutual Funds.",
};

export default function Page() {
  return <InvestmentProductPage data={aifData} />;
}
