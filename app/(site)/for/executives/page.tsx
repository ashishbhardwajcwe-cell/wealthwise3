import type { Metadata } from "next";
import { AudienceLanding } from "@/components/AudienceLanding";

export const metadata: Metadata = {
  title: "Financial Planning for Corporate Executives — CXOs & Senior Leaders",
  description:
    "For CXOs and senior corporate leaders: ESOP and deferred-comp strategy, concentration risk, tax efficiency, estate and succession planning, and post-retirement income design.",
};

export default function Page() {
  return (
    <AudienceLanding
      content={{
        eyebrow: "For Corporate Executives",
        title: "Complex compensation, scarce time, and decisions that deserve a second set of eyes.",
        subtitle:
          "For CXOs, business heads and senior leaders with multi-part pay — base, bonus, ESOPs, deferred and long-term incentives — who want one clear, conflict-free view of the whole picture.",
        intro: [
          "Senior executives rarely have a money problem; they have a complexity-and-time problem. Compensation arrives in layers — salary, performance bonus, ESOPs, RSUs, deferred and long-term incentive plans — each with its own vesting, tax and liquidity profile. The result is wealth that is substantial but scattered, concentrated in the employer, and rarely looked at as one portfolio.",
          "What's usually missing is not products but architecture: a single view of net worth, a deliberate plan to de-risk employer concentration, tax-efficient sequencing of stock and bonus, adequate protection, and — increasingly important at this stage — estate and succession planning so the next generation isn't left untangling it.",
        ],
        whatYouGet: [
          "One consolidated net-worth view across salary, bonus, ESOPs/RSUs, deferred comp and personal investments",
          "Concentration de-risking: a tax-aware, multi-year plan to reduce dependence on a single employer's stock",
          "Tax efficiency across the comp stack: perquisite vs capital-gains treatment, LTCG harvesting, regime choice",
          "Protection sized to your standard of living — term, health, and personal accident cover, plus key-person considerations",
          "Estate & succession basics: nominations, will, and how assets pass — coordinated with your lawyer and CA",
          "Post-retirement income design: turning the corpus into a stable, inflation-aware cash flow",
        ],
        commonSituations: [
          {
            title: "“My pay is base + bonus + ESOPs + LTIP — I can't see the whole picture.”",
            copy: "That's the core issue. We build a single dashboard across every component and vesting schedule, so for the first time you can see total net worth, upcoming liquidity events, and concentration at a glance — and plan around them.",
          },
          {
            title: "“Most of my wealth is in my company's stock. Is that a problem?”",
            copy: "It's the classic executive risk: income and wealth both depend on one company. We design a disciplined, tax-aware diversification over several years that respects insider-trading windows and your conviction, while steadily reducing single-stock risk.",
          },
          {
            title: "“I haven't done estate planning and I keep postponing it.”",
            copy: "Common, and avoidable. We cover the essentials — nominations, a valid will, ownership and succession structure — and coordinate with your lawyer so your family inherits clarity, not a puzzle.",
          },
          {
            title: "“I'll step back in a few years. Will the income hold?”",
            copy: "We model your post-employment cash flow: corpus required, a sustainable withdrawal rate, and how to sequence stock sales and bonuses so the transition out of a salary is smooth and tax-efficient.",
          },
        ],
        ctaTitle: "Get a clear read in 60 seconds",
      }}
    />
  );
}
