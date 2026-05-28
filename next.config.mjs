/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/webp", "image/avif"],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // Redirects for previously-sent download email links that used the old
  // /downloads/[slug].pdf URL scheme. New emails use /resources/guides/[slug].
  async redirects() {
    return [
      { source: "/downloads/financial-health-check.pdf",     destination: "/resources/guides/financial-health-check",     permanent: true },
      { source: "/downloads/defence-transition-planner.pdf", destination: "/resources/guides/defence-transition-planner", permanent: true },
      { source: "/downloads/nri-india-cheatsheet.pdf",       destination: "/resources/guides/nri-india-cheatsheet",       permanent: true },
      { source: "/downloads/pms-empanelment-guide.pdf",      destination: "/resources/guides/pms-empanelment-guide",      permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
