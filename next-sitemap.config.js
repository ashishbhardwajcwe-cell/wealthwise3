/** @type {import('next-sitemap').IConfig} */

// Per-path priority + changefreq overrides. Anything not listed
// falls back to the global priority/changefreq below.
const HIGH_PRIORITY_PATHS = {
  "/":                 { priority: 1.0,  changefreq: "weekly" },
  "/plan":             { priority: 0.95, changefreq: "weekly" },
  "/markets":          { priority: 0.95, changefreq: "hourly" },
  "/ai-wealth-planner":{ priority: 0.9,  changefreq: "weekly" },
  "/guided":           { priority: 0.9,  changefreq: "weekly" },
  "/pricing":          { priority: 0.85, changefreq: "weekly" },
  "/about":            { priority: 0.8,  changefreq: "monthly" },
  "/contact":          { priority: 0.75, changefreq: "monthly" },
};

module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://auriswealth.co",
  generateRobotsTxt: true,
  sitemapSize: 7000,
  changefreq: "weekly",
  priority: 0.7,
  exclude: ["/admin/*", "/api/*", "/studio", "/studio/*"],
  transform: async (config, path) => {
    const override = HIGH_PRIORITY_PATHS[path];
    return {
      loc: path,
      changefreq: override?.changefreq ?? config.changefreq,
      priority: override?.priority ?? config.priority,
      lastmod: new Date().toISOString(),
    };
  },
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/api/", "/admin/", "/studio/"] },
    ],
  },
};
