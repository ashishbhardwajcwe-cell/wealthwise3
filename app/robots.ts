import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

/**
 * robots.txt, replacing the one next-sitemap generated into public/.
 *
 * That generator emitted TWO separate `User-agent: *` groups — one allowing
 * `/`, a second disallowing the API and Studio paths. Google merges same-agent
 * groups, but the behaviour isn't guaranteed across crawlers and the file read
 * as malformed. This emits a single well-formed group, and points at the one
 * sitemap route (app/sitemap.ts).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/studio/", "/app/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
