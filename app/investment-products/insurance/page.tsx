import type { Metadata } from "next";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { insuranceData } from "@/lib/product-data";

export const metadata: Metadata = {
  title: "Insurance — Term Life, Health, Why to Avoid ULIPs and Endowment",
  description:
    "Insurance done right: how much term cover you need, family floater health insurance, why endowment plans and ULIPs are bad investments, riders worth buying.",
};

export default function Page() {
  return <InvestmentProductPage data={insuranceData} />;
}
