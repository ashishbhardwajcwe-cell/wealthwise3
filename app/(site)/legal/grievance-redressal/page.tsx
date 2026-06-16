import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Grievance Redressal",
  description: "How to escalate concerns with PlanMyCashflows. SEBI-required grievance redressal mechanism.",
};

export default function GrievanceRedressalPage() {
  return (
    <LegalPage
      title="Grievance Redressal"
      subtitle="How to raise concerns and escalation routes. SEBI-mandated mechanism for regulated entities."
      lastUpdated="28 May 2026"
      sections={[
        {
          heading: "Level 1 — Direct contact",
          content: [
            `For any concern, complaint, or service issue, please email ${siteConfig.email} or use the contact form on /contact.`,
            "We commit to acknowledge your message within 2 business days and respond substantively within 7 business days.",
            "Most concerns are resolved at this level — please give us a chance to make it right.",
          ],
        },
        {
          heading: "Level 2 — Grievance officer",
          content: [
            "If you are not satisfied with the Level 1 response, escalate to our Grievance Officer:",
            "**Grievance Officer:** Diganta Das",
            `**Email:** grievance@planmycashflows.com`,
            "**Response time:** 5 business days",
            "Please include your original message thread, the date of your initial contact, and a brief summary of why the response was unsatisfactory.",
          ],
        },
        {
          heading: "Level 3 — Founder escalation",
          content: [
            "Unresolved grievances can be escalated to the founder directly:",
            "**Founder:** Col Ashish Bhardwaj",
            "**Email:** ashish@planmycashflows.com",
            "**Response time:** 5 business days",
          ],
        },
        {
          heading: "Level 4 — Regulatory escalation",
          content: [
            "If your grievance remains unresolved after Level 3, or if it relates to a regulatory matter, you may escalate to the relevant authority:",
            "**SEBI SCORES (for investment-related grievances):** https://scores.sebi.gov.in",
            "**RBI Complaint Management System (for banking/payment issues):** https://cms.rbi.org.in",
            "**Consumer Forum:** Local district/state consumer disputes redressal commission.",
          ],
        },
        {
          heading: "What we track",
          content: [
            "We maintain an internal log of every grievance received, response provided, resolution status, and time taken.",
            "Quarterly internal reviews of grievance patterns drive process improvements.",
            "On request, we can provide a summary of grievances logged during your engagement (anonymised where it touches other clients).",
          ],
        },
        {
          heading: "Things we ask of you",
          content: [
            "Please be specific about what went wrong and what outcome you expect.",
            "Please give us a reasonable opportunity to fix the issue before escalating externally.",
            "Please do not name individual employees publicly without prior contact — internal accountability is between us, but we want to handle it through proper channels.",
          ],
        },
      ]}
    />
  );
}
