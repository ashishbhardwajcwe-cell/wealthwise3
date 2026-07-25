import { groq } from "next-sanity";

/**
 * Field projections — kept small so we don't fetch the full body unless needed.
 */

const blogCardFields = `
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  readTime,
  featured,
  "category": category->{ title, "slug": slug.current },
  "author": author->{ name, role, image },
  "heroImage": heroImage{ ..., "alt": coalesce(alt, "") }
`;

export const allBlogPostsQuery = groq`
  *[_type == "blogPost" && defined(slug.current)]
    | order(publishedAt desc)
    { ${blogCardFields} }
`;

export const featuredBlogPostQuery = groq`
  *[_type == "blogPost" && featured == true && defined(slug.current)]
    | order(publishedAt desc)[0]
    { ${blogCardFields} }
`;

export const blogPostBySlugQuery = groq`
  *[_type == "blogPost" && slug.current == $slug][0]{
    ${blogCardFields},
    body,
    seoTitle,
    seoDescription,
    "ogImage": ogImage{ asset->{ url } },
    tags
  }
`;

export const blogPostSlugsQuery = groq`
  *[_type == "blogPost" && defined(slug.current)][].slug.current
`;

export const blogPostsByCategoryQuery = groq`
  *[_type == "blogPost" && category->slug.current == $category]
    | order(publishedAt desc)
    { ${blogCardFields} }
`;

export const allCategoriesQuery = groq`
  *[_type == "category"]{ title, "slug": slug.current, description }
`;

export const allStockAnalysesQuery = groq`
  *[_type == "stockAnalysis"]
    | order(analysisDate desc)
    {
      _id, title, "slug": slug.current, ticker, company, sector, marketCap,
      thesis, keyMetrics, analysisDate,
      "author": author->{ name, role }
    }
`;

export const stockAnalysisBySlugQuery = groq`
  *[_type == "stockAnalysis" && slug.current == $slug][0]{
    ...,
    "author": author->{ name, role, image }
  }
`;

export const allPmsStrategiesQuery = groq`
  *[_type == "pmsStrategy"]
    | order(returns.y3 desc)
    { _id, strategyName, manager, category, aumCr, minInvestmentL,
      returns, fees, asOfDate, source, notes }
`;

/**
 * Published PMS strategies with the return fields flattened for the
 * homepage grid, the compare tool, the league table and the PMS
 * explorer. Neutral base order (by manager, then strategy) — the UI
 * re-sorts on demand, so the feed itself does not imply a performance
 * ranking.
 */
export const livePmsStrategiesQuery = groq`
  *[_type == "pmsStrategy" && !(_id in path("drafts.**"))]
    | order(manager asc, strategyName asc)
    {
      _id,
      strategyName,
      manager,
      category,
      aumCr,
      minInvestmentL,
      "returns1m": returns.m1,
      "returns3m": returns.m3,
      "returns6m": returns.m6,
      "returns1y": returns.y1,
      "returns2y": returns.y2,
      "returns3y": returns.y3,
      "returns5y": returns.y5,
      "sinceInception": returns.sinceInception,
      asOfDate,
      source
    }
`;

/**
 * Manager → logo URL, one row per distinct manager.
 *
 * Logos are a property of the FIRM, not the strategy, so projecting
 * `logo.asset->url` onto every strategy row repeated the same ~100-byte URL
 * across all of that manager's strategies — about 173 KB of the feed's ~893 KB
 * payload, for ~361 distinct values. The explorer now receives this small
 * lookup instead and resolves each card's logo from it.
 */
export const pmsManagerLogosQuery = groq`
  *[_type == "pmsStrategy" && !(_id in path("drafts.**")) && defined(logo)]{
    manager,
    "logoUrl": logo.asset->url
  }
`;

/**
 * The single benchmark document (S&P BSE 500 TRI) the PMS explorer measures
 * alpha against. Effectively a singleton — the newest published one wins.
 * Return fields are flattened to match the strategy feed's shape. Absent
 * document → null, and the front-end falls back to its last stored values.
 */
export const benchmarkQuery = groq`
  *[_type == "benchmark" && !(_id in path("drafts.**"))]
    | order(asOfDate desc)[0]{
      name,
      "returns1m": returns.m1,
      "returns3m": returns.m3,
      "returns6m": returns.m6,
      "returns1y": returns.y1,
      "returns2y": returns.y2,
      "returns3y": returns.y3,
      "returns5y": returns.y5,
      "sinceInception": returns.sinceInception,
      asOfDate,
      source
    }
`;

export const allAifFundsQuery = groq`
  *[_type == "aifFund" && !(_id in path("drafts.**"))]
    | order(fundName asc)
    { _id, fundName, registrationNo, category, registrationDate, sponsor,
      manager, vintage, fundSize, minCommitmentCr, tenor, fees, returns,
      asOfDate, source, notes }
`;

/**
 * Public unlisted-shares feed. Auto-created docs stay hidden until an editor
 * clears needsReview; isActive != false keeps soft-deleted rows out. The
 * `partner` provenance code is deliberately NOT projected — it never renders
 * on the site.
 */
export const allUnlistedSharesQuery = groq`
  *[_type == "unlistedShare" && !(_id in path("drafts.**"))
    && isActive == true && needsReview != true]
    | order(company asc)
    { _id, company, "slug": slug.current, sector, summary, ipoStatus,
      indicativePriceINR, lotSize, depository, asOfDate,
      "logoUrl": logo.asset->url }
`;

export const stockAnalysisSlugsQuery = groq`
  *[_type == "stockAnalysis" && defined(slug.current)][].slug.current
`;

export const stockAnalysisCountQuery = groq`count(*[_type == "stockAnalysis"])`;
export const pmsStrategyCountQuery   = groq`count(*[_type == "pmsStrategy"])`;
export const aifFundCountQuery       = groq`count(*[_type == "aifFund"])`;
export const unlistedShareCountQuery = groq`count(*[_type == "unlistedShare"])`;

