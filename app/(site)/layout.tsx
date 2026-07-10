import Script from "next/script";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { ConsentBanner } from "@/components/ConsentBanner";
import { Analytics } from "@/components/Analytics";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { ScrollReveal } from "@/components/ScrollReveal";
import { siteConfig } from "@/lib/site-config";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
    <CurrencyProvider>
      <Header />
      <ScrollReveal />
      <main>{children}</main>
      <DisclaimerBanner />
      <Footer />
      <ConsentBanner />
      <WhatsAppFloat />

      {/* Google Analytics — fires only after consent */}
      <Analytics gaId={process.env.NEXT_PUBLIC_GA_ID ?? ""} />

      {/* Organisation structured data */}
      <Script
        id="org-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: siteConfig.name,
            url: siteConfig.url,
            email: siteConfig.email,
            logo: `${siteConfig.url}/auris-logo.png`,
            sameAs: Object.values(siteConfig.social),
          }),
        }}
      />
    </CurrencyProvider>
    </AuthProvider>
  );
}
