export const siteConfig = {
  name: "PlanMyCashflows",
  // The legal entity name is intentionally absent: the consumer brand is
  // exclusively "PlanMyCashflows" and the entity name must not appear on
  // marketing surfaces. Reinstate here only if counsel confirms a page
  // legally requires it.
  email: "hello@planmycashflows.com",
  url: "https://planmycashflows.com",
  description:
    "Discover, compare and understand Portfolio Management Services (PMS) and Alternative Investment Funds (AIF) across India's leading fund houses. AI-powered, unbiased and education-first — for HNIs, professionals, business owners and NRIs.",
  /** The planner now lives in this same site at /app (migrated out of the
   *  retired wealthwise2 repo). Internal path → one domain, shared session. */
  appUrl: "/app",
  appDeepLink: "/app",
  signupUrl: "/app",
  topmateUrl: "https://topmate.io/planmycashflows",
  whatsappNumber: "916009096178",
  whatsappUrl: "https://wa.me/916009096178?text=Hi%20PlanMyCashflows%2C%20I%27d%20like%20to%20know%20more%20about%20your%20services.",
  social: {
    linkedin: "https://www.linkedin.com/company/planmycashflows",
    youtube: "https://www.youtube.com/@planmycashflows",
    twitter: "https://x.com/planmycashflows",
    instagram: "https://instagram.com/planmycashflows",
    facebook: "https://facebook.com/planmycashflows",
  },
};

// Order is deliberate: lead with the high-touch HNI products (PMS, AIF),
// then the mass-market regulated core (Mutual Funds), then direct stocks,
// then the long-tail alternatives. This sequence drives the header's
// Invest dropdown, product grids and footer lists.
export const investmentProducts = [
  { slug: "pms", name: "PMS", short: "Personalised portfolios for ₹50L+ investors.", icon: "Briefcase", tone: "#4F46E5", emoji: "🏛️" },
  { slug: "aif", name: "AIF", short: "Category I, II, III alternatives for HNIs.", icon: "Layers", tone: "#7C3AED", emoji: "🧬" },
  { slug: "mutual-funds", name: "Mutual Funds", short: "Diversified, regulated, professionally managed.", icon: "TrendingUp", tone: "#0F766E", emoji: "📈" },
  { slug: "direct-equity", name: "Direct Equity", short: "Stocks on NSE/BSE for long-term investors.", icon: "LineChart", tone: "#2563EB", emoji: "📊" },
  { slug: "unlisted-shares", name: "Unlisted Shares", short: "Pre-IPO and unlisted equity opportunities.", icon: "Sparkles", tone: "#DB2777", emoji: "🔒" },
  { slug: "cryptocurrency", name: "Cryptocurrency", short: "BTC, ETH, altcoins — with India tax context.", icon: "Bitcoin", tone: "#F7931A", emoji: "₿" },
  { slug: "insurance", name: "Insurance", short: "Term, health, and what to skip.", icon: "ShieldCheck", tone: "#16A34A", emoji: "🛡️" },
  { slug: "real-estate", name: "Real Estate", short: "Residential, commercial, REITs.", icon: "Home", tone: "#C2410C", emoji: "🏡" },
  { slug: "gold", name: "Gold & Silver", short: "Physical, ETF, SGB, silver ETF — the right way.", icon: "Coins", tone: "#A16207", emoji: "🪙" },
] as const;

/**
 * Long-tail products grouped under "More products" in footer/nav lists.
 * Cryptocurrency is intentionally absent from navigation — the page stays
 * live and in the sitemap, but is not promoted in header/footer menus.
 */
export const moreNavProducts = investmentProducts.filter((p) =>
  ["direct-equity", "unlisted-shares", "insurance", "real-estate", "gold"].includes(p.slug),
);

export const audiences = [
  { slug: "professionals", name: "Salaried Professionals", short: "Mid-career planning that actually compounds.", icon: "Briefcase", tone: "#2563EB", emoji: "💼" },
  { slug: "software-professionals", name: "Software & IT Professionals", short: "ESOPs, RSUs and high-income tax planning.", icon: "Cpu", tone: "#0891B2", emoji: "💻" },
  { slug: "executives", name: "Corporate Executives", short: "CXOs and senior leaders with complex comp.", icon: "Building2", tone: "#1E3A8A", emoji: "👔" },
  { slug: "hni", name: "High-Net-Worth", short: "PMS, AIF and structured planning above ₹5 Cr.", icon: "Gem", tone: "#9333EA", emoji: "👑" },
  { slug: "nri", name: "NRIs & Global Indians", short: "Investing across borders, optimised for tax.", icon: "Plane", tone: "#0284C7", emoji: "🌍" },
] as const;

export const calculators = [
  { slug: "pms-fees", name: "PMS Fee Calculator", short: "Model fixed + performance fees vs a mutual fund." },
  { slug: "sip", name: "SIP Calculator", short: "Project monthly investments." },
  { slug: "lumpsum", name: "Lumpsum Calculator", short: "Future value of a one-time investment." },
  { slug: "retirement", name: "Retirement Corpus", short: "How much you need to retire." },
  { slug: "fire", name: "FIRE Calculator", short: "Financial independence age." },
  { slug: "tax-harvesting", name: "Tax Harvesting", short: "Estimate LTCG savings." },
  { slug: "nri-tax", name: "NRI Tax Calculator", short: "DTAA-aware tax projection." },
  { slug: "emi", name: "EMI Calculator", short: "Loan EMIs and amortisation." },
] as const;
