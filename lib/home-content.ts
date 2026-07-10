/**
 * Content data for the PMS/AIF homepage ("/").
 *
 * Copy here is finalized, compliance-reviewed text — edit only with the
 * same care as the page itself (no superlatives, no invented statistics,
 * keep every source/date label attached to its figure).
 */

export interface HomeFaqItem {
  question: string;
  answer: string;
}

export const homeFaqs: HomeFaqItem[] = [
  {
    question: "What is the minimum investment for PMS and AIF?",
    answer:
      "SEBI mandates a minimum of ₹50 lakh for a Portfolio Management Service and ₹1 crore for an Alternative Investment Fund (₹25 lakh for a fund's own employees/directors). These thresholds are set by regulation and apply across all providers.",
  },
  {
    question: "Who is eligible to invest?",
    answer:
      "PMS and AIF are designed for sophisticated investors — typically affluent professionals, business owners, HNIs, UHNIs, family offices and NRIs — who meet the minimum investment thresholds and understand the associated risks. They are not intended for small retail investors.",
  },
  {
    question: "Can NRIs invest, and how does the process work?",
    answer:
      "Yes. NRIs can invest in eligible PMS and AIF products through their NRE (fully repatriable) or NRO (repatriation capped at USD 1 million per year) accounts, subject to KYC and FEMA compliance; equity-based PMS typically also requires a PIS/demat setup. NRIs can often reduce tax through applicable DTAA benefits by submitting a Tax Residency Certificate and Form 10F. A few managers have additional compliance requirements for US/Canada-based NRIs under FATCA. The process is largely digital and typically takes a couple of weeks; our team helps you navigate it.",
  },
  {
    question: "How are distributors like PlanMyCashflows compensated?",
    answer:
      "As a distribution platform, we may receive a commission or referral fee from the fund house when you invest in a product through us. This does not add a separate charge on top of the product's standard fee structure. We disclose this clearly and aim to present products on an unbiased basis so you can compare on merit.",
  },
  {
    question: "Is PlanMyCashflows a fund manager or an investment adviser?",
    answer:
      "No. PlanMyCashflows is an information and distribution platform that helps you discover, compare and access third-party PMS and AIF products. We do not manage money, run our own fund, or provide personalised investment advice. All products are managed by their respective SEBI-registered managers.",
  },
  {
    question: "What are the main risks?",
    answer:
      "PMS and AIF invest in securities and alternative assets and are subject to market risks, including possible loss of capital. They can be more concentrated, more complex and less liquid than mutual funds, and some AIFs have lock-in periods. Returns are not guaranteed, and past performance is not indicative of future results. Always read all scheme-related documents carefully.",
  },
  {
    question: "How is PMS taxed compared with a mutual fund?",
    answer:
      "In a PMS you own securities directly, so you're taxed on each transaction the manager makes as if you traded it yourself (for listed equity, broadly 20% short-term and 12.5% long-term above ₹1.25 lakh for FY 2025–26 onward; dividends at your slab). Mutual fund taxation is based on the fund units you hold and when you redeem them. AIF taxation depends on the category. Tax rules change with each Budget — consult a tax adviser.",
  },
  {
    question: "How is PMS different from a mutual fund, in simple terms?",
    answer:
      "A mutual fund pools money from many investors and gives you units; a PMS builds a portfolio in your own name with securities held directly by you, offering more customisation and transparency, but with a much higher minimum and different risk and fee profile.",
  },
  {
    question: "Can I move my existing shares into a PMS?",
    answer:
      "In many cases, yes — this is known as bringing in a 'corpus in kind.' The specifics depend on the portfolio manager and applicable rules; our team can explain the options.",
  },
  {
    question: "How do I get started?",
    answer:
      "Explore strategies on our platform, then click 'Book a Call' or 'Talk to an Expert.' We'll understand your goals, help you compare suitable options, and guide you through onboarding with the relevant fund house.",
  },
];

export const strategyCategories = [
  "All",
  "Multi Cap / Flexi Cap",
  "Large Cap",
  "Mid & Small Cap",
  "Thematic",
  "Multi Asset",
  "AIF Cat II",
  "AIF Cat III",
] as const;

export type StrategyCategory = (typeof strategyCategories)[number];

export interface StrategyCardData {
  /** Placeholder until the live APMI-backed feed is wired in. */
  strategy: string;
  fundHouse: string;
  category: Exclude<StrategyCategory, "All">;
  returns1y: string;
  returns3y: string;
  returns5y: string;
  aum: string;
  minInvestment: string;
}

/**
 * Illustrative placeholder cards — swap for live data once the
 * APMI import (scripts/import-pms.mjs) feed is connected to "/".
 */
export const placeholderStrategies: StrategyCardData[] = [
  { strategy: "Data coming soon", fundHouse: "—", category: "Multi Cap / Flexi Cap", returns1y: "—", returns3y: "—", returns5y: "—", aum: "—", minInvestment: "—" },
  { strategy: "Data coming soon", fundHouse: "—", category: "Large Cap", returns1y: "—", returns3y: "—", returns5y: "—", aum: "—", minInvestment: "—" },
  { strategy: "Data coming soon", fundHouse: "—", category: "Mid & Small Cap", returns1y: "—", returns3y: "—", returns5y: "—", aum: "—", minInvestment: "—" },
  { strategy: "Data coming soon", fundHouse: "—", category: "Thematic", returns1y: "—", returns3y: "—", returns5y: "—", aum: "—", minInvestment: "—" },
  { strategy: "Data coming soon", fundHouse: "—", category: "AIF Cat II", returns1y: "—", returns3y: "—", returns5y: "—", aum: "—", minInvestment: "—" },
  { strategy: "Data coming soon", fundHouse: "—", category: "AIF Cat III", returns1y: "—", returns3y: "—", returns5y: "—", aum: "—", minInvestment: "—" },
];

export interface ComparisonRow {
  feature: string;
  mutualFunds: string;
  pms: string;
  aif: string;
}

export const comparisonRows: ComparisonRow[] = [
  { feature: "Minimum investment", mutualFunds: "As low as ₹500", pms: "₹50 lakh (SEBI-mandated)", aif: "₹1 crore (SEBI-mandated)" },
  { feature: "Ownership", mutualFunds: "Units in a pooled fund", pms: "Securities held directly in your name/demat", aif: "Units in a pooled fund" },
  { feature: "Customisation", mutualFunds: "Standardised", pms: "High — personalised portfolios", aif: "Strategy-level (pooled)" },
  { feature: "Typical investor", mutualFunds: "Retail to HNI", pms: "HNI / UHNI / NRI", aif: "HNI / UHNI / NRI / institutions" },
  { feature: "Strategies", mutualFunds: "Broad, regulated categories", pms: "Concentrated, high-conviction equity/debt", aif: "Private equity, private credit, real estate, long-short (Cat I/II/III)" },
  { feature: "Transparency", mutualFunds: "Periodic factsheet/NAV", pms: "Full holding-level visibility", aif: "Periodic reporting" },
  { feature: "Liquidity", mutualFunds: "Generally high", pms: "Moderate", aif: "Lower; often lock-ins (esp. Cat I/II)" },
  { feature: "Regulation", mutualFunds: "SEBI", pms: "SEBI", aif: "SEBI" },
  { feature: "Taxation (broad)", mutualFunds: "At investor level", pms: "At investor level (direct holdings)", aif: "Cat I/II pass-through; Cat III at fund level" },
];

export interface IndustryStat {
  value: string;
  label: string;
  source: string;
}

export const industryStats: IndustryStat[] = [
  {
    value: "₹42.5 lakh crore",
    label: "Total PMS industry AUM across ~2.12 lakh client accounts",
    source: "Source: APMI PMS Industry Compendium, May 2026",
  },
  {
    value: "₹16.94 lakh crore",
    label: "Total AIF commitments raised, up ₹3.45 lakh crore year-on-year",
    source: "Source: SEBI, quarter ended 31 March 2026",
  },
  {
    value: "1,849",
    label: "Registered Alternative Investment Funds, up from 732 five years ago",
    source: "Source: SEBI, 31 March 2026",
  },
  {
    value: "2,773",
    label: "Accredited investors in India, up from 649 a year earlier",
    source: "Source: SEBI, 30 April 2026",
  },
];

export interface EducationTile {
  title: string;
  href: string;
}

/**
 * Education Hub teasers. Where a dedicated article doesn't exist yet the
 * tile points at the closest live page so nothing dead-ends.
 */
export const educationTiles: EducationTile[] = [
  { title: "What is PMS? A Beginner's Guide for Indian Investors", href: "/blog/complete-guide-to-pms-india-2026" },
  { title: "AIF Categories I, II & III Explained", href: "/investment-products/aif" },
  { title: "PMS vs AIF vs Mutual Funds: Which Is Right for You?", href: "#comparison" },
  { title: "A Practical Guide for NRIs: Investing in PMS & AIF from Abroad", href: "/for/nri" },
  { title: "Understanding Fees, Taxation & Risks in Alternatives", href: "/investment-products/pms" },
];
