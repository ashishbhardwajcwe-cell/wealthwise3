import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for Auris Wealth website and WealthWise application.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      subtitle="The terms governing your use of this website and the WealthWise application."
      lastUpdated="28 May 2026"
      sections={[
        {
          heading: "1. Acceptance of terms",
          content: [
            `By accessing or using ${siteConfig.url} or the WealthWise application, you agree to these Terms of Service. If you do not agree, please do not use our services.`,
          ],
        },
        {
          heading: "2. Educational content only",
          content: [
            `All content on ${siteConfig.url} and the WealthWise application is provided strictly for educational and informational purposes. Nothing on this site or in the application constitutes investment, legal, accounting, or tax advice.`,
            `${siteConfig.name} does not make recommendations to buy, sell, or hold any specific security, mutual fund, PMS, AIF, cryptocurrency, or other financial instrument until and unless we hold a relevant SEBI Registered Investment Adviser licence, in which case such advice will be governed by a separate engagement letter.`,
          ],
        },
        {
          heading: "3. User responsibilities",
          content: [
            "You agree to provide accurate information when using the AI Wealth Planner, registering for the WealthWise app, or contacting us.",
            "You will not use the services for unlawful purposes, attempt to reverse-engineer our software, or scrape content at scale.",
            "You are responsible for maintaining the confidentiality of your WealthWise account credentials.",
          ],
        },
        {
          heading: "4. No guarantee of returns",
          content: [
            "Any projections, illustrations, or scenarios shown by the AI Wealth Planner, the WealthWise app, or any content are based on assumptions clearly stated.",
            "Past performance of any asset class or strategy is not indicative of future returns. All investments carry the risk of loss including loss of principal.",
            `${siteConfig.legalName}, its directors, employees, contractors, and agents do not guarantee any specific investment outcome.`,
          ],
        },
        {
          heading: "5. Third-party content and links",
          content: [
            "This site links to third-party platforms (Topmate, Anthropic, payment processors, exchanges). We are not responsible for the content, privacy practices, or terms of those third parties.",
          ],
        },
        {
          heading: "6. Intellectual property",
          content: [
            `All content on ${siteConfig.url} including text, images, illustrations, code, and design — except where credited to third parties — is the property of ${siteConfig.legalName} and protected by Indian and international copyright law.`,
            "You may share individual articles via links. You may not republish substantial content without written permission.",
          ],
        },
        {
          heading: "7. Limitation of liability",
          content: [
            `To the maximum extent permitted by law, ${siteConfig.legalName} shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or use, arising from your use of the services.`,
            "Our total liability for any claim arising from these terms or your use of the services shall not exceed the amount paid by you to us in the 12 months preceding the claim (which may be zero for free services).",
          ],
        },
        {
          heading: "8. Termination",
          content: [
            "We may suspend or terminate your access to the WealthWise app for breach of these terms, fraud, or if required by law.",
            "You may close your account at any time via the app settings.",
          ],
        },
        {
          heading: "9. Governing law and jurisdiction",
          content: [
            "These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts at Gurugram, Haryana.",
          ],
        },
        {
          heading: "10. Contact",
          content: [
            `For questions about these terms, email ${siteConfig.email}.`,
          ],
        },
      ]}
    />
  );
}
