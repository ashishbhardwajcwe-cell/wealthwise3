import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Disclaimers",
  description: "Investment, tax, and regulatory disclaimers for PlanMyCashflows.",
};

export default function DisclaimersPage() {
  return (
    <LegalPage
      title="Disclaimers"
      subtitle="The investment, tax, and regulatory disclaimers that apply across this website and the CashFlow Planner application."
      lastUpdated="28 May 2026"
      sections={[
        {
          heading: "General investment disclaimer",
          content: [
            // TODO: reinstate exact legal-entity wording here only if counsel confirms it is mandatory.
            `This website is operated by the company behind ${siteConfig.name}, a private limited company registered in India. The content on this site is for educational purposes only and does not constitute investment, legal, or tax advice.`,
            "Investments in mutual funds, PMS, AIF, equities, cryptocurrencies, real estate, gold, and other financial instruments are subject to market risks. Past performance is not indicative of future returns. Please read all scheme-related documents carefully and consult a SEBI-registered investment adviser, chartered accountant, and tax professional in your jurisdiction before making investment decisions.",
            "PlanMyCashflows, its directors, employees, and contractors do not guarantee any returns and are not liable for any losses arising from decisions based on the content of this site.",
          ],
        },
        {
          heading: "Specific product disclaimers",
          content: [
            "**Mutual Funds:** Mutual fund investments are subject to market risks. We do not currently recommend any specific scheme.",
            "**PMS:** Portfolio Management Services involve concentration risk and are intended for investors with prior equity experience and ₹50L+ to invest. Past performance of any PMS strategy does not guarantee future returns. SEBI verification of any PMS manager is the investor's responsibility.",
            "**AIF:** Alternative Investment Funds are intended for sophisticated investors. They involve illiquidity, leverage (in Cat III), and concentration risk. Private Placement Memorandum (PPM) disclosures should be reviewed carefully before investing.",
            "**Unlisted Shares:** Highly illiquid with significant valuation and execution risk. Platform-quoted prices may not reflect realisable value.",
            "**Cryptocurrency:** Highly volatile and may result in loss of all invested capital. In India: 30% tax + 1% TDS over ₹50,000/year, no loss set-off allowed. Self-custody carries operational risk; exchange custody carries counterparty risk.",
          ],
        },
        {
          heading: "Tax disclaimer",
          content: [
            "Tax laws and rates change. The tax rates, exemptions, and treatment referenced on this site are current as of 28 May 2026 to the best of our knowledge.",
            "Tax outcomes depend on your specific situation, residency status, and income mix. Always consult a chartered accountant before relying on tax projections.",
            "We do not file tax returns on your behalf and do not warrant the accuracy of any tax computation shown by our tools.",
          ],
        },
        {
          heading: "Forward-looking statements",
          content: [
            "Projections, illustrations, and scenarios on this site (including the AI Wealth Planner, calculators, and Guided Plan outputs) are based on assumptions clearly stated within each tool — typically including expected return, inflation rate, and time horizon.",
            "These are illustrative only and do not represent guaranteed outcomes. Actual returns will vary, sometimes significantly.",
          ],
        },
        {
          heading: "AI-generated content",
          content: [
            "The AI Wealth Planner uses large language models to generate personalised financial snapshots. While we have designed the prompts to be compliant with SEBI guidelines (no specific recommendations, educational framing), AI outputs can contain errors, omit context, or misjudge situations.",
            "AI-generated content on this site should be treated as a starting point for thought and discussion, not as a final answer.",
          ],
        },
        {
          heading: "Third-party content",
          content: [
            "Where we reference third-party platforms, exchanges, AMCs, or PMS managers, this is for educational illustration only and not a recommendation. We have no commercial relationship with any such party unless explicitly disclosed.",
          ],
        },
        {
          heading: "Regulatory status",
          content: [
            `This website is operated by the company behind PlanMyCashflows, a private limited company registered in India.`,
            "PlanMyCashflows is not a SEBI-registered investment adviser.",
            "We do not provide specific buy/sell recommendations. All content is educational. Registrations relevant to our distribution activities, when obtained, will be displayed on our SEBI Compliance page.",
          ],
        },
      ]}
    />
  );
}
