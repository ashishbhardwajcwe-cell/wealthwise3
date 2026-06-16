import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "SEBI Compliance",
  description: "Regulatory disclosures and SEBI-mandated information for PlanMyCashflows.",
};

export default function SEBICompliancePage() {
  return (
    <LegalPage
      title="SEBI Compliance"
      subtitle="Regulatory disclosures and SEBI-mandated information."
      lastUpdated="28 May 2026"
      sections={[
        {
          heading: "Current regulatory status",
          content: [
            `${siteConfig.legalName} (CIN: ${siteConfig.cin}) operates the PlanMyCashflows brand. Our current regulatory standing:`,
            "**SEBI Registered Investment Adviser (RIA):** Application under processing. Until granted, we do not provide specific investment recommendations.",
            "**NISM Investment Adviser Levels I and II:** Certified (relevant team members).",
            "**AMFI Mutual Fund Distributor:** ARN application in process.",
            "We will update this page as our regulatory registrations are completed.",
          ],
        },
        {
          heading: "What we do today (pre-RIA)",
          content: [
            "**Educational content** — articles, deep-dives, guides on investment products and tax planning. No specific recommendations.",
            "**Free tools** — the AI Wealth Planner, calculators, Guided Plan. All outputs are educational and illustrative.",
            "**CashFlow Planner application** — portfolio tracking, goal projection, scenario planning. The app provides analysis tools; the user makes investment decisions.",
            "**Consulting and education** — paid sessions with Col Ashish on financial education, planning frameworks, and product evaluation (not specific recommendations until RIA-licensed).",
          ],
        },
        {
          heading: "What we will do post-RIA",
          content: [
            "Once our SEBI RIA registration is granted, we will offer fee-only investment advisory services governed by SEBI (Investment Advisers) Regulations, 2013.",
            "All advice will be provided under formal engagement letters with documented suitability analysis, written recommendations, and conflict-of-interest disclosures.",
            "We will continue to operate on a strict fee-only basis — no commissions on products recommended.",
          ],
        },
        {
          heading: "Conflict of interest policy",
          content: [
            `${siteConfig.name} does not receive commissions or trailing fees from mutual fund AMCs, PMS managers, AIF funds, insurance companies, brokers, or any other financial product manufacturers. Our revenue is entirely from subscription fees and (future) advisory fees paid by clients.`,
            "If we ever introduce features that involve revenue sharing with product providers (e.g. an embedded mutual fund distribution layer), the conflict will be disclosed prominently on every page where such products appear, and you will always have the option to invest directly.",
          ],
        },
        {
          heading: "Suitability of content",
          content: [
            "Content on this site is general and does not consider any individual's specific financial situation, risk profile, or investment objectives.",
            "The AI Wealth Planner generates a personalised snapshot based on inputs you provide, but it does not constitute a suitability analysis under SEBI regulations.",
            "For suitability-based advice, please wait for our SEBI RIA registration or engage a separate SEBI-registered investment adviser.",
          ],
        },
        {
          heading: "Investor education on regulator hierarchy",
          content: [
            "**SEBI (Securities and Exchange Board of India):** Regulator for securities markets, mutual funds, PMS, AIF, RIAs, distributors.",
            "**RBI (Reserve Bank of India):** Regulator for banks, NBFCs, payment systems, FEMA / cross-border flows.",
            "**IRDAI (Insurance Regulatory and Development Authority):** Regulator for insurance products.",
            "**PFRDA (Pension Fund Regulatory and Development Authority):** Regulator for NPS and pension funds.",
            "We are regulated by SEBI for investment-related activities. Insurance, banking, and pension activities are outside our scope.",
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
