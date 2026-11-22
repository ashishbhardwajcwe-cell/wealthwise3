import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finance Glossary — 60+ Investing Terms",
  description:
    "Plain-English definitions of 60+ terms Indian investors meet: PMS, AIF, alpha, XIRR, expense ratio, DTAA, FEMA and more.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
