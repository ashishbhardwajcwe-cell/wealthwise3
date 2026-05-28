import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Script from "next/script";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
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
    default: "Auris Wealth — Wealth that compounds. Plans that hold under fire.",
    template: "%s | Auris Wealth",
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
    title: "Auris Wealth — Wealth that compounds. Plans that hold under fire.",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Auris Wealth",
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <DisclaimerBanner />
        <Footer />

        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}

        {/* Organisation structured data */}
        <Script
          id="org-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: siteConfig.name,
              legalName: siteConfig.legalName,
              url: siteConfig.url,
              email: siteConfig.email,
              identifier: siteConfig.cin,
              sameAs: Object.values(siteConfig.social),
            }),
          }}
        />
      </body>
    </html>
  );
}
