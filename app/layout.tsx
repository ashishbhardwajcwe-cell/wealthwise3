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
    default: "Auris Cashflow — Wealth that compounds. Plans that hold under fire.",
    template: "%s | Auris Cashflow",
  },
  description: siteConfig.description,
  keywords: [
    "wealth management India",
    "AI financial planner",
    "PMS",
    "AIF",
    "mutual funds",
    "NRI investing",
    "defence officer financial planning",
    "SEBI RIA",
  ],
  authors: [{ name: "Col Ashish Bhardwaj" }],
  creator: siteConfig.legalName,
  publisher: siteConfig.legalName,
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: "Auris Cashflow — Wealth that compounds. Plans that hold under fire.",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Auris Cashflow",
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: siteConfig.url,
    types: {
      "application/rss+xml": [{ url: "/rss.xml", title: "Auris Cashflow Blog" }],
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
