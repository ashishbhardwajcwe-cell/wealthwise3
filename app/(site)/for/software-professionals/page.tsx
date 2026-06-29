import type { Metadata } from "next";
import { AudienceLanding } from "@/components/AudienceLanding";

export const metadata: Metadata = {
  title: "Financial Planning for Software & IT Professionals — ESOPs, RSUs & Tax",
  description:
    "For software and IT professionals: ESOP/RSU strategy, US-stock RSU tax, concentration risk, high-income tax optimisation, and a realistic path to financial independence.",
};

export default function Page() {
  return (
    <AudienceLanding
      content={{
        eyebrow: "For Software & IT Professionals",
        title: "Big package, vesting RSUs, and a nagging feeling it could be working harder.",
        subtitle:
          "For engineers, product managers and IT leaders earning ₹25L–₹1.5Cr — often with ESOPs, RSUs in a US parent, and a real shot at financial independence if the money is organised well.",
        intro: [
          "Software professionals are among the best-paid people in India — and among the most concentrated. A large slice of net worth sits in a single employer's stock (often a US-listed parent), salary depends on that same company, and the RSU vesting calendar quietly drives the whole financial life.",
          "The common leaks are predictable: RSUs left un-sold for years out of inertia (or optimism), double-taxation confusion on US stock, term cover that never kept pace with the home loan, the new-vs-old tax regime chosen by copy-paste, and an EPF/NPS stack nobody actively manages. Tidying this up is usually worth several lakhs a year — and years off the path to FIRE.",
        ],
        whatYouGet: [
          "ESOP / RSU strategy: when to exercise, sell-to-cover vs hold, and tax-efficient diversification out of employer concentration",
          "US-listed RSU tax handled correctly: perquisite tax at vest, capital gains at sale, FA schedule disclosure, and DTAA / foreign tax credit basics",
          "Concentration check: how much of your net worth (and income) rides on one company or one sector — and how to de-risk in tranches",
          "High-income tax optimisation: old vs new regime with your real numbers, 80C/NPS, HRA, home-loan interest",
          "FIRE math: the corpus that makes work optional, and whether your current savings rate gets you there at 45, 50 or 55",
          "Term + health cover gap analysis sized to your loans and dependents",
        ],
        commonSituations: [
          {
            title: "“I have ₹1.2Cr in vested RSUs of my employer — should I sell?”",
            copy: "Almost certainly diversify in tranches. Your salary already depends on that company; letting your wealth ride on it too is a double bet. We model a tax-aware sell-down (and STP into broad indices) so you cut risk without a needless tax shock.",
          },
          {
            title: "“My RSUs are in a US-listed parent — how is this taxed in India?”",
            copy: "Two events: a perquisite (taxed as salary) at vesting, and capital gains when you sell. Foreign holdings also need Schedule FA disclosure, and US tax withheld may be creditable under the DTAA. We map the full picture so nothing is missed at filing.",
          },
          {
            title: "“I switch jobs every 2–3 years — does that hurt my planning?”",
            copy: "Not if it's structured. Job hops mean EPF transfers, lapsed group insurance between roles, and un-exercised options left on the table. A plan keeps cover continuous, consolidates EPF, and tracks every option grant so nothing expires worthless.",
          },
          {
            title: "“Can I retire early / take a sabbatical?”",
            copy: "Often yes — software incomes make aggressive saving possible. We compute your financial-independence number, the bridge corpus for a sabbatical, and the safe withdrawal that keeps it sustainable.",
          },
        ],
        ctaTitle: "See where you stand in 60 seconds",
      }}
    />
  );
}
