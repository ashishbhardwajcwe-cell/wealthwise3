import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "PlanMyCashflows — Wealth that compounds. Plans that hold under fire.",
    template: "%s | PlanMyCashflows",
  },
  description: siteConfig.description,
  keywords: [
    "wealth management India",
    "AI financial planner",
    "PMS",
    "AIF",
    "alternative investments India",
    "mutual funds",
    "NRI investing",
  ],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: "PlanMyCashflows — Wealth that compounds. Plans that hold under fire.",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "PlanMyCashflows",
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: siteConfig.url,
    types: {
      "application/rss+xml": [{ url: "/rss.xml", title: "PlanMyCashflows Blog" }],
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
