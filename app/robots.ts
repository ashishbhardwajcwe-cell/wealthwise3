import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

/** Replaces the robots.txt next-sitemap used to generate at postbuild —
 *  same policy, now served by the App Router alongside app/sitemap.ts. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/studio/"] }],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
