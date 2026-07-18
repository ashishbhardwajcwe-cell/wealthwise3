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

export const allAifFundsQuery = groq`
  *[_type == "aifFund"]
    | order(asOfDate desc)
    { _id, fundName, manager, category, vintage, fundSize,
      minCommitmentCr, tenor, fees, returns, asOfDate, notes }
`;

export const allUnlistedSharesQuery = groq`
  *[_type == "unlistedShare"]
    | order(company asc)
    { _id, company, "slug": slug.current, sector,
      priceLowINR, priceHighINR, lotSize, ipoStatus,
      platformsAvailable, asOfDate, summary, risks }
`;

export const stockAnalysisSlugsQuery = groq`
  *[_type == "stockAnalysis" && defined(slug.current)][].slug.current
`;

export const stockAnalysisCountQuery = groq`count(*[_type == "stockAnalysis"])`;
export const pmsStrategyCountQuery   = groq`count(*[_type == "pmsStrategy"])`;
export const aifFundCountQuery       = groq`count(*[_type == "aifFund"])`;
export const unlistedShareCountQuery = groq`count(*[_type == "unlistedShare"])`;

