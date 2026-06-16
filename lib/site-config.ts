export const siteConfig = {
  name: "PlanMyCashflows",
  legalName: "Auris Pvt Ltd",
  cin: "U70200HR2026PTC141922",
  email: "hello@planmycashflows.com",
  url: "https://planmycashflows.com",
  description:
    "AI-powered financial planning and global wealth management — built for professionals, families, and military officers who want clarity.",
  appUrl: "https://app.planmycashflows.com",
  /** Deep-link that skips wealthwise2's marketing landing and goes
   *  straight to the auth modal / dashboard. Use this for "Open the
   *  AI Wealth Planner" / "Open the app" gold CTAs so the user lands
   *  on data entry in one click. */
  appDeepLink: "https://app.planmycashflows.com/?app=1",
  signupUrl: "https://app.planmycashflows.com/?signup",
  topmateUrl: "https://topmate.io/planmycashflows",
  whatsappNumber: "916009096178",
  whatsappUrl: "https://wa.me/916009096178?text=Hi%20PlanMyCashflows%2C%20I%27d%20like%20to%20know%20more%20about%20your%20services.",
  social: {
    linkedin: "https://www.linkedin.com/company/planmycashflows",
    youtube: "https://www.youtube.com/@planmycashflows",
    twitter: "https://twitter.com/planmycashflows",
    instagram: "https://instagram.com/planmycashflows",
    facebook: "https://facebook.com/planmycashflows",
  },
};

export const investmentProducts = [
  { slug: "mutual-funds", name: "Mutual Funds", short: "Diversified, regulated, professionally managed.", icon: "TrendingUp" },
  { slug: "pms", name: "PMS", short: "Personalised portfolios for ₹50L+ investors.", icon: "Briefcase" },
  { slug: "aif", name: "AIF", short: "Category I, II, III alternatives for HNIs.", icon: "Layers" },
  { slug: "unlisted-shares", name: "Unlisted Shares", short: "Pre-IPO and unlisted equity opportunities.", icon: "Sparkles" },
  { slug: "cryptocurrency", name: "Cryptocurrency", short: "BTC, ETH, altcoins — with India tax context.", icon: "Bitcoin" },
  { slug: "direct-equity", name: "Direct Equity", short: "Stocks on NSE/BSE for long-term investors.", icon: "LineChart" },
  { slug: "insurance", name: "Insurance", short: "Term, health, and what to skip.", icon: "ShieldCheck" },
  { slug: "real-estate", name: "Real Estate", short: "Residential, commercial, REITs.", icon: "Home" },
  { slug: "gold", name: "Gold & Silver", short: "Physical, ETF, SGB, silver ETF — the right way.", icon: "Coins" },
] as const;

export const audiences = [
  { slug: "professionals", name: "Salaried Professionals", short: "Mid-career planning that actually compounds." },
  { slug: "software-professionals", name: "Software & IT Professionals", short: "ESOPs, RSUs and high-income tax planning." },
  { slug: "executives", name: "Corporate Executives", short: "CXOs and senior leaders with complex comp." },
  { slug: "hni", name: "High-Net-Worth", short: "PMS, AIF and structured planning above ₹5 Cr." },
  { slug: "nri", name: "NRIs & Global Indians", short: "Investing across borders, optimised for tax." },
] as const;

export const calculators = [
  { slug: "sip", name: "SIP Calculator", short: "Project monthly investments." },
  { slug: "lumpsum", name: "Lumpsum Calculator", short: "Future value of a one-time investment." },
  { slug: "retirement", name: "Retirement Corpus", short: "How much you need to retire." },
  { slug: "fire", name: "FIRE Calculator", short: "Financial independence age." },
  { slug: "tax-harvesting", name: "Tax Harvesting", short: "Estimate LTCG savings." },
  { slug: "nri-tax", name: "NRI Tax Calculator", short: "DTAA-aware tax projection." },
  { slug: "emi", name: "EMI Calculator", short: "Loan EMIs and amortisation." },
] as const;
