import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Investing Guides",
  description:
    "Free guides on a 15-minute financial health check, NRI investing in India and how to evaluate a PMS manager. Sent to your inbox.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
