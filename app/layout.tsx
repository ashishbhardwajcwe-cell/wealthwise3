import type { Metadata } from "next";
import { Inter, Fraunces, IBM_Plex_Mono } from "next/font/google";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Fonts for the PMS Explorer design system. Fraunces (variable) and IBM Plex
// Mono are exposed as CSS variables alongside the existing Inter, which the
// explorer reuses for its `.font-ui` helper. See app/globals.css.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "PlanMyCashflows | Explore India's Leading PMS & AIF Strategies",
    template: "%s | PlanMyCashflows",
  },
  description: siteConfig.description,
  keywords: [
    "PMS India",
    "AIF India",
    "portfolio management services",
    "alternative investment funds",
    "alternative investments India",
    "wealth management India",
    "AI financial planner",
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
    title: "PlanMyCashflows | Explore India's Leading PMS & AIF Strategies",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "PlanMyCashflows | Explore India's Leading PMS & AIF Strategies",
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: "./",
    types: {
      "application/rss+xml": [{ url: "/rss.xml", title: "PlanMyCashflows Blog" }],
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${fraunces.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
