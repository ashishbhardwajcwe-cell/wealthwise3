/**
 * Sanity env helpers. We do NOT throw on missing values at module load —
 * the site should still build when Sanity isn't configured (local dev,
 * preview deploys without secrets, etc). The blog adapter falls back to
 * lib/blog-data.ts and the Studio route fails gracefully if visited.
 */

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2024-09-01";

/** Read-only token (Viewer role) used by the Next.js server to fetch content. */
export const token = process.env.SANITY_API_TOKEN;

/** Secret shared between Sanity webhooks and our /api/revalidate route. */
export const revalidateSecret = process.env.SANITY_REVALIDATE_SECRET;

/** True if both required values are present and non-empty. */
export const isSanityConfigured = !!projectId && !!dataset;
