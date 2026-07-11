import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "SEBI Compliance",
  description: "Regulatory disclosures and compliance information for PlanMyCashflows.",
};

export default function SEBICompliancePage() {
  return (
    <LegalPage
      title="SEBI Compliance"
      subtitle="Regulatory disclosures and compliance information."
      lastUpdated="10 July 2026"
      sections={[
        {
          heading: "Current regulatory status",
          content: [
            `${siteConfig.name} is an information and distribution platform. The Portfolio Management Services (PMS) and Alternative Investment Funds (AIF) featured on this website are third-party products managed by their respective SEBI-registered portfolio managers and fund managers, and are regulated by SEBI.`,
            `${siteConfig.name} is **not** a SEBI-registered investment adviser and does not provide personalised investment advice or specific investment recommendations.`,
            "Registrations relevant to our distribution activities, when obtained, will be displayed on this page.",
          ],
        },
        {
          heading: "What we do",
          content: [
            "**Educational content** — articles, deep-dives, guides on investment products and tax planning. No specific recommendations.",
            "**Free tools** — the AI Wealth Planner, calculators, Guided Plan. All outputs are educational and illustrative.",
            "**CashFlow Planner application** — portfolio tracking, goal projection, scenario planning. The app provides analysis tools; the user makes investment decisions.",
            "**Distribution facilitation** — helping investors discover, compare and access third-party PMS and AIF products, and assisting with documentation and onboarding with the relevant fund house.",
          ],
        },
        {
          heading: "How we are compensated",
          content: [
            `As a distribution platform, ${siteConfig.name} may receive a commission or referral fee from a fund house when you invest in a product through us. This does not add a separate charge on top of the product's standard fee structure.`,
            "We aim to present products on an unbiased basis so you can compare on merit, and we disclose our compensation model clearly.",
            "If we introduce features that involve additional revenue sharing with product providers, the arrangement will be disclosed prominently on every page where such products appear, and you will always have the option to invest directly.",
          ],
        },
        {
          heading: "Suitability of content",
          content: [
            "Content on this site is general and does not consider any individual's specific financial situation, risk profile, or investment objectives.",
            "The AI Wealth Planner generates a personalised snapshot based on inputs you provide, but it does not constitute a suitability analysis under SEBI regulations.",
            "For personalised, suitability-based advice, please engage a SEBI-registered investment adviser.",
          ],
        },
        {
          heading: "Investor education on regulator hierarchy",
          content: [
            "**SEBI (Securities and Exchange Board of India):** Regulator for securities markets, mutual funds, PMS, AIF, RIAs, distributors.",
            "**RBI (Reserve Bank of India):** Regulator for banks, NBFCs, payment systems, FEMA / cross-border flows.",
            "**IRDAI (Insurance Regulatory and Development Authority):** Regulator for insurance products.",
            "**PFRDA (Pension Fund Regulatory and Development Authority):** Regulator for NPS and pension funds.",
            "The products featured on this platform fall under SEBI's regulatory ambit. Insurance, banking, and pension activities are outside our scope.",
          ],
        },
        {
          heading: "Reporting concerns",
          content: [
            "If you believe PlanMyCashflows has acted inconsistently with these disclosures or any SEBI requirement, please email compliance@planmycashflows.com.",
            "You may also report concerns directly to SEBI via the SCORES portal at https://scores.sebi.gov.in.",
          ],
        },
      ]}
    />
  );
}
