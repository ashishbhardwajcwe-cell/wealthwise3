import type { Metadata } from "next";
import { AudienceLanding } from "@/components/AudienceLanding";

export const metadata: Metadata = {
  title: "Financial Planning for NRIs — Cross-Border, Multi-Currency",
  description:
    "For NRIs in US, UK, UAE, Singapore: DTAA-aware planning, GIFT City structures, US tax for India-source income, return-to-India scenarios.",
};

export default function Page() {
  return (
    <AudienceLanding
      content={{
        eyebrow: "For NRIs & Global Indians",
        title: "Investing across borders, optimised for your tax residency.",
        subtitle: "DTAA-aware planning, GIFT City structures, multi-currency portfolios, and a clear answer to the question every NRI eventually asks: where should the next rupee/dollar go?",
        intro: [
          "NRI financial planning sits at the intersection of three things most advisors don&apos;t fully understand: Indian tax and product regulations (FEMA, RBI, SEBI), your resident-country tax (US PFIC rules, UK ISA limits, UAE corporate tax changes), and the practical operational realities of NRO/NRE/FCNR accounts.",
          "We help NRIs in the US, UK, UAE, Singapore, and beyond build coherent portfolios across India and abroad — and stay compliant on both sides.",
        ],
        whatYouGet: [
          "Where to invest: India equity via NRE mutual funds, GIFT City vehicles, direct equity, vs your resident-country options (401k/IRA, ISA, CPF SA, etc.)",
          "US-specific: PFIC implications of Indian mutual funds, the case for direct stocks instead, Roth backdoor, 8938 and FBAR compliance reminders",
          "UK-specific: ISA / SIPP vs Indian SIP, remittance basis vs arising basis, Tax Year overlap on India income",
          "UAE-specific: leveraging the 9% corporate tax setup, golden visa property routes, when GIFT City wins",
          "DTAA usage: avoiding double tax on dividends, interest, and capital gains across India-US, India-UK, India-UAE, India-Singapore",
          "Return-to-India scenario planning: timing of remittance, RNOR status optimisation, ESOP repatriation strategy",
        ],
        commonSituations: [
          {
            title: "&ldquo;I&apos;m in the US and have Indian mutual funds — am I in trouble?&rdquo;",
            copy: "Indian MFs are PFICs for US tax purposes, and the punitive tax regime can wipe out gains. We help you understand whether to use QEF election, mark-to-market, or transition to direct Indian equity / India-domiciled US-compliant funds. This is the single biggest mistake we see in US-resident NRIs.",
          },
          {
            title: "&ldquo;I&apos;m in Dubai, salary is tax-free, and I have idle cash&rdquo;",
            copy: "UAE residents have unique opportunities: GIFT City NRI investment vehicles (capital gains exempt for non-residents), Indian equity via NRE route, and post-2023 UAE corporate tax considerations if you have business income. We model whether to invest in India, hold in USD/AED, or split — based on your return-to-India horizon.",
          },
          {
            title: "&ldquo;I&apos;m planning to return to India in 3 years&rdquo;",
            copy: "The 3 years before return are the most valuable from a tax-planning perspective — particularly the RNOR window post-return (up to 3 years of preferential treatment on foreign income). We map your remittance timing, asset relocation, ESOP exercise/sale strategy, and the order of unwinding accounts.",
          },
          {
            title: "&ldquo;My parents in India need a financial plan too&rdquo;",
            copy: "Many NRIs end up managing their parents&apos; finances — pension management, senior citizen FD optimisation, medical insurance gaps, succession planning. We can build coordinated plans across the NRI investor and their India-resident parents in a single household view.",
          },
        ],
        ctaTitle: "Get a cross-border snapshot",
      }}
    />
  );
}
