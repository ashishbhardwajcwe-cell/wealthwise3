import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for PlanMyCashflows — DPDP-compliant. How we collect, use, and protect your personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="How we collect, use, and protect your personal data. DPDP-compliant."
      lastUpdated="28 May 2026"
      sections={[
        {
          heading: "1. Who we are",
          content: [
            `${siteConfig.legalName} (CIN: ${siteConfig.cin}), trading as ${siteConfig.name}, with registered office in Gurugram, Haryana, India, operates this website ${siteConfig.url} and the CashFlow Planner application available at ${siteConfig.appUrl}.`,
            `For privacy-related questions, contact us at privacy@planmycashflows.com.`,
          ],
        },
        {
          heading: "2. What data we collect",
          content: [
            "**On the website:** Information you voluntarily submit (name, email, phone via contact form, newsletter signup, AI Wealth Planner inputs). We do not collect names or contact info via the AI Wealth Planner — only financial inputs to generate a snapshot.",
            "**Analytics:** Anonymised usage data via Google Analytics 4 and (optionally) Plausible. IP address (truncated), pages visited, time on site, referrer. With consent banner per DPDP Act 2023.",
            "**Cookies:** Essential cookies for site functionality, analytics cookies only with consent.",
            "**In the CashFlow Planner app:** Account details, portfolio holdings, financial goals — strictly to provide the service. Read-only API tokens where applicable.",
          ],
        },
        {
          heading: "3. How we use your data",
          content: [
            "**To deliver the service:** Run the AI Wealth Planner, build your CashFlow Planner plan, respond to enquiries, send the newsletter you opted into.",
            "**To improve the product:** Aggregate, anonymised usage analytics. We do not profile individuals.",
            "**To comply with legal obligations:** Where required by Indian law, regulator request, or tax authority.",
            "**We do not:** Sell your data, share with third-party advertisers, or use it to train ML models without explicit consent.",
          ],
        },
        {
          heading: "4. AI Wealth Planner — specific note",
          content: [
            "The AI Wealth Planner sends your anonymised financial inputs (age, savings, income, expenses, country, etc.) to Anthropic's Claude API to generate the snapshot. We strip PII (name, email, phone) before this call.",
            "The snapshot itself is shown to you in your browser and is not persisted on our servers by default.",
          ],
        },
        {
          heading: "5. Data retention",
          content: [
            "Contact form submissions: retained for 24 months for follow-up.",
            "Newsletter subscribers: retained until unsubscribed.",
            "CashFlow Planner app data: retained while your account is active + 12 months after deletion request, then permanently purged (longer if required by tax or regulatory law).",
            "Analytics: retained for 14 months (Google Analytics default).",
          ],
        },
        {
          heading: "6. Your rights under DPDP Act 2023",
          content: [
            "Right to access — request a copy of your personal data we hold.",
            "Right to correction — fix any inaccurate data.",
            "Right to erasure — request deletion of your account and personal data.",
            "Right to data portability — export your CashFlow Planner data in machine-readable format.",
            "Right to nominate — designate someone to manage your data after death or incapacitation.",
            "To exercise any of these rights, email privacy@planmycashflows.com. We respond within 30 days.",
          ],
        },
        {
          heading: "7. Data security",
          content: [
            "All data transmission is over HTTPS (TLS 1.2+).",
            "CashFlow Planner app data is encrypted at rest in our database.",
            "Access to user data is limited to engineers on a strict need-to-access basis, logged and audited.",
            "We do not store payment card data; payments are processed via PCI-DSS compliant providers (Cashfree, Razorpay).",
          ],
        },
        {
          heading: "8. Changes to this policy",
          content: [
            "We will notify you of material changes via email (for registered users) and a banner on this page. The 'Last updated' date above always reflects the current version.",
          ],
        },
      ]}
    />
  );
}
