export const siteConfig = {
  name: "Auris Wealth",
  legalName: "Auris Pvt Ltd",
  cin: "U70200HR2026PTC141922",
  email: "hello@auriswealth.co",
  url: "https://auriswealth.co",
  description:
    "AI-powered financial planning and global wealth management — built for professionals, families, and military officers who want clarity.",
  appUrl: "https://app.auriswealth.co",
  signupUrl: "https://app.auriswealth.co/?signup",
  topmateUrl: "https://topmate.io/auris8",
  whatsappNumber: "916009096178",
  whatsappUrl: "https://wa.me/916009096178?text=Hi%20Auris%20Wealth%2C%20I%27d%20like%20to%20know%20more%20about%20your%20services.",
  social: {
    linkedin: "https://www.linkedin.com/company/auris-wealth",
    youtube: "https://www.youtube.com/@auriswealth",
    twitter: "https://twitter.com/auriswealth",
    instagram: "https://instagram.com/auriswealth",
    facebook: "https://facebook.com/auriswealth",
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
  { slug: "defence-officers", name: "Defence Officers", short: "From olive greens to financial independence." },
  { slug: "nri", name: "NRIs & Global Indians", short: "Investing across borders, optimised for tax." },
  { slug: "hni", name: "High-Net-Worth", short: "PMS, AIF and structured planning above ₹5 Cr." },
  { slug: "professionals", name: "Salaried Professionals", short: "Mid-career planning that actually compounds." },
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
