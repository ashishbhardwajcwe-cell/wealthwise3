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
