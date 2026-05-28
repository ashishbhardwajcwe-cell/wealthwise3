import type { Metadata } from "next";
import { AudienceLanding } from "@/components/AudienceLanding";

export const metadata: Metadata = {
  title: "Financial Planning for Defence Officers — Auris Wealth",
  description:
    "Built by a Colonel. Specialised financial planning for serving and veteran defence officers: pension optimisation, AGIF, DSOP, post-retirement transition.",
};

export default function Page() {
  return (
    <AudienceLanding
      content={{
        eyebrow: "For Defence Officers",
        title: "Built by a Colonel — for officers who&apos;ve served, are serving, or are transitioning.",
        subtitle: "Pension maths, AGIF, DSOP, second career planning, NPS, and the financial discipline that fits a uniformed life.",
        intro: [
          "Most financial advice in India is written for salaried civilians or salaried HNIs. Almost none of it accounts for the realities of defence service — frequent postings, late promotion to financial peak, mandatory funds (DSOP, AGIF), the pension structure, the canteen-and-CSD ecosystem, or the brutal financial cliff that hits at superannuation.",
          "Auris Wealth was founded by Col Ashish Bhardwaj after 20 years in the Army. We understand the gap between what you&apos;ve been told (mostly by LIC agents in the unit canteen) and what actually helps over 30 years.",
        ],
        whatYouGet: [
          "Specific pension optimisation: commutation vs no-commutation, DR vs basic split, Cat-1 OROP impact on your category",
          "AGIF, DSOP, NPS optimisation — when each adds value, when each is sub-optimal",
          "Post-retirement transition plan: second career income modelling, healthcare beyond ECHS, asset allocation shift from accumulation to drawdown",
          "Honest analysis of LIC and other insurance taken in service — what to keep, what to convert to paid-up, what to surrender",
          "Tax planning for pension + second career income (special considerations for Defence pension under Sec 87A and pension-specific deductions)",
          "Specific guidance for SHKP, EHKP, married accommodation purchase decisions",
          "Family financial briefing — so your spouse knows the full picture, not just &apos;Papa handles the money&apos;",
        ],
        commonSituations: [
          {
            title: "&ldquo;I&apos;m 38, JC, and I&apos;ve only ever bought LIC&rdquo;",
            copy: "We&apos;ll calculate the real IRR on each of your LIC policies, identify which to convert to paid-up vs surrender, set up term + health correctly, and redirect the freed premiums into goal-aligned investments. Most officers free up ₹50k–₹2L per year of underperforming premium this way.",
          },
          {
            title: "&ldquo;I&apos;m retiring in 18 months and I have no plan&rdquo;",
            copy: "Most officers face this. We build a 90-day transition plan: pension election decisions (commutation Y/N), AGIF maturity deployment, healthcare bridge, second career income strategy, and asset allocation rebalance for the next 25 years.",
          },
          {
            title: "&ldquo;I want my kids to have what I didn&apos;t&rdquo;",
            copy: "Education planning for officer families is its own thing — Sainik School scholarships, dependent quotas, civilian colleges with reservation, abroad options. We model each path&apos;s cost and the SIP needed to reach it.",
          },
          {
            title: "&ldquo;My peer just lost ₹40 lakhs in &lsquo;pre-IPO shares&rsquo;&rdquo;",
            copy: "Defence officers are heavily targeted by dubious financial schemes, especially close to retirement. We help you separate legitimate opportunities (yes, some are real) from outright frauds — and build the kind of robust plan that doesn&apos;t need a 30% return to succeed.",
          },
        ],
        ctaTitle: "Take 60 seconds and run a snapshot",
      }}
    />
  );
}
