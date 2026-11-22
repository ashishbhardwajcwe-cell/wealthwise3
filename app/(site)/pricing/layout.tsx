import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing & Plans",
  description:
    "Compare plans for the CashFlow Planner: a free tier, Premium with a 14-day free trial, and HNI and Enterprise options. See what is included in each.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
