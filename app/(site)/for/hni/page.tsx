import type { Metadata } from "next";
import { AudienceLanding } from "@/components/AudienceLanding";

export const metadata: Metadata = {
  title: "Financial Planning for HNIs — PMS, AIF, Structured Planning",
  description:
    "Independent advisory for HNI / UHNI investors with ₹5 Cr+ portfolios: PMS/AIF selection, family office reporting, succession, tax structuring.",
};

export default function Page() {
  return (
    <AudienceLanding
      content={{
        eyebrow: "For HNI Investors",
        title: "Beyond mutual funds — planning that handles real complexity.",
        subtitle: "When the portfolio crosses ₹5 Cr, the questions change. PMS or AIF? GIFT City or domestic? Family LLP or HUF? We build the structure, not just the asset list.",
        intro: [
          "HNI financial planning isn’t just “bigger mutual fund selection.” The questions shift to asset allocation across PMS strategies and AIF categories, succession through HUFs / family trusts / private trusts, tax structuring including offshore vehicles where relevant, and the operational complexity of tracking 30+ holdings across 8 institutions.",
          "We work with you independently — no PMS or AIF kickbacks. The recommendation is what actually fits your goals, tax situation, and risk profile.",
        ],
        whatYouGet: [
          "Independent PMS and AIF evaluation — we look at process, drawdowns across cycles, fee transparency, manager pedigree, NOT past return tables",
          "Multi-vehicle asset allocation: MF base + targeted PMS + selective AIF + alternatives (unlisted, REIT, private credit)",
          "Family office equivalent reporting: consolidated net worth, cost basis, gain/loss, IRR by vehicle, across multiple family members",
          "Tax structuring: HUF/private trust setup, Section 80GG, REIT distribution tax treatment, cross-vehicle harvesting",
          "Succession framework: will, nominee alignment, asset titling, transfer mechanics, gifting strategy",
          "Quarterly reviews with Ashish, plus an annual deep audit of the entire structure",
        ],
        commonSituations: [
          {
            title: "“I have ₹15 Cr spread across 8 PMSs, 3 AIFs, and 22 mutual funds”",
            copy: "First, we map the actual underlying exposures (you almost certainly have 60–70% overlap between your PMSs in large-cap names). Then we restructure — reducing scheme count, eliminating fee waste, and rebuilding around 3–4 distinct strategies that actually add value.",
          },
          {
            title: "“My CA says HUF, my friend says private trust, I don’t know which”",
            copy: "Structure choice depends on succession goals, family composition, tax bracket of beneficiaries, and operational complexity tolerance. We model the 10-year tax and succession outcomes of each option for your specific situation before recommending a path.",
          },
          {
            title: "“I want to leave a clear plan for my spouse if I’m not around”",
            copy: "We build a one-page ‘continuity binder’ — every account, every passcode location, every advisor contact, the financial plan logic in plain English, what to do in the first 90 days, the next 1 year, and the next 5 years. This single deliverable is often the most valued.",
          },
          {
            title: "“Should I move significant capital to GIFT City?”",
            copy: "Depends on your tax residency, time horizon, and what you’re trying to access (offshore equity, foreign currency hedging, structured products). We model the actual after-tax economics vs domestic alternatives — sometimes GIFT City wins, often it doesn’t.",
          },
        ],
        ctaTitle: "Get a complimentary portfolio review",
      }}
    />
  );
}
