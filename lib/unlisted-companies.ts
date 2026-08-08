/**
 * Mode-1 seed data for the "Explore companies" section of the unlisted-shares
 * page. This is representative, editorially-maintained placeholder data — no
 * prices are included in Mode 1. Later this array is expected to be replaced
 * by a Sanity `unlistedCompany` query with the same shape.
 *
 * Compliance notes:
 *  - Every `about` is a neutral, one-line business description. No person
 *    names, no invented statistics, no price or return claims.
 *  - `drhpFiled` is a coarse status flag for the on-page filter; it is
 *    informational only and must be re-verified before Mode 2 goes live.
 *  - The optional `indicativePrice` / `priceAsOf` fields are intentionally
 *    left undefined in Mode 1. The card is built to reveal an "Indicative"
 *    price pill with an as-on date the moment those fields are populated,
 *    so Mode 2 can ship without a rebuild.
 */

export interface UnlistedCompany {
  name: string;
  slug: string;
  sector: string;
  about: string;
  drhpFiled: boolean;
  /** Mode 2 only — indicative price per share (₹). Hidden while undefined. */
  indicativePrice?: number;
  /** Mode 2 only — ISO date the indicative price was recorded. */
  priceAsOf?: string;
  /** Mode 2 only — minimum lot size (shares). */
  lotSize?: number;
  /** Mode 2 only — where the shares can settle, e.g. "NSDL & CDSL". */
  depository?: string;
  /**
   * Mode 2 only — the indicative price from the prior distinct as-of date, and
   * the date it was recorded. Derived by the importer so the card can show a
   * change indicator without loading the full history. Two indicative quotes,
   * not a return.
   */
  previousPrice?: number;
  previousPriceAsOf?: string;
  /** Company logo URL (Sanity asset), when seeded. Falls back to a monogram. */
  logoUrl?: string;
}

export const unlistedCompanies: UnlistedCompany[] = [
  {
    name: "National Stock Exchange of India (NSE)",
    slug: "national-stock-exchange",
    sector: "Financial Markets",
    about: "Operator of India's largest equities and derivatives exchange; itself an unlisted company widely held in the private market.",
    drhpFiled: false,
  },
  {
    name: "Metropolitan Stock Exchange (MSEI)",
    slug: "metropolitan-stock-exchange",
    sector: "Financial Markets",
    about: "Exchange operator running equity, currency-derivatives and debt segments.",
    drhpFiled: false,
  },
  {
    name: "NSDL",
    slug: "nsdl",
    sector: "Financial Markets",
    about: "Securities depository providing dematerialised custody and settlement infrastructure.",
    drhpFiled: true,
  },
  {
    name: "Tata Capital",
    slug: "tata-capital",
    sector: "Financial Services",
    about: "Diversified non-banking financial company offering retail, SME and corporate lending.",
    drhpFiled: true,
  },
  {
    name: "Hero FinCorp",
    slug: "hero-fincorp",
    sector: "Financial Services",
    about: "Non-banking financial company providing consumer, two-wheeler and business loans.",
    drhpFiled: true,
  },
  {
    name: "HDB Financial Services",
    slug: "hdb-financial-services",
    sector: "Financial Services",
    about: "Retail-focused non-banking financial company offering lending and business services.",
    drhpFiled: true,
  },
  {
    name: "Care Health Insurance",
    slug: "care-health-insurance",
    sector: "Insurance",
    about: "Standalone health insurer offering retail and group medical cover.",
    drhpFiled: false,
  },
  {
    name: "SBI Funds Management",
    slug: "sbi-funds-management",
    sector: "Asset Management",
    about: "Asset-management company running one of India's largest mutual-fund businesses.",
    drhpFiled: false,
  },
  {
    name: "Motilal Oswal Home Finance",
    slug: "motilal-oswal-home-finance",
    sector: "Housing Finance",
    about: "Affordable-housing finance company serving retail home-loan borrowers.",
    drhpFiled: false,
  },
  {
    name: "Chennai Super Kings",
    slug: "chennai-super-kings",
    sector: "Sports & Entertainment",
    about: "Franchise cricket team and sports-entertainment business.",
    drhpFiled: false,
  },
  {
    name: "Cochin International Airport (CIAL)",
    slug: "cochin-international-airport",
    sector: "Infrastructure",
    about: "Airport operator built under a public-private partnership, with its own solar-power capacity.",
    drhpFiled: false,
  },
  {
    name: "Oravel Stays (OYO)",
    slug: "oravel-stays-oyo",
    sector: "Travel & Hospitality",
    about: "Technology platform for branded budget hospitality and short-stay accommodation.",
    drhpFiled: true,
  },
  {
    name: "Imagine Marketing (boAt)",
    slug: "imagine-marketing-boat",
    sector: "Consumer Electronics",
    about: "Consumer-electronics brand across audio wearables and lifestyle tech.",
    drhpFiled: true,
  },
  {
    name: "Lava International",
    slug: "lava-international",
    sector: "Consumer Electronics",
    about: "Domestic mobile-handset and consumer-electronics manufacturer.",
    drhpFiled: true,
  },
  {
    name: "API Holdings (PharmEasy)",
    slug: "api-holdings-pharmeasy",
    sector: "Healthcare",
    about: "Digital healthcare and e-pharmacy platform.",
    drhpFiled: false,
  },
  {
    name: "Serum Institute of India",
    slug: "serum-institute-of-india",
    sector: "Pharmaceuticals",
    about: "Vaccine and biologics manufacturer.",
    drhpFiled: false,
  },
  {
    name: "B9 Beverages (Bira 91)",
    slug: "b9-beverages-bira-91",
    sector: "Consumer & Beverages",
    about: "Craft-beer and beverages company.",
    drhpFiled: false,
  },
  {
    name: "Parle Products",
    slug: "parle-products",
    sector: "FMCG",
    about: "Packaged-foods and biscuits fast-moving consumer-goods company.",
    drhpFiled: false,
  },
  {
    name: "Studds Accessories",
    slug: "studds-accessories",
    sector: "Auto Components",
    about: "Manufacturer of two-wheeler helmets and riding accessories.",
    drhpFiled: true,
  },
  {
    name: "Vikram Solar",
    slug: "vikram-solar",
    sector: "Renewable Energy",
    about: "Solar photovoltaic module manufacturer and EPC provider.",
    drhpFiled: true,
  },
];

/** Distinct sectors present in the data, sorted — used to build the filter. */
export function unlistedSectors(companies: UnlistedCompany[] = unlistedCompanies): string[] {
  return Array.from(new Set(companies.map((c) => c.sector))).sort();
}
