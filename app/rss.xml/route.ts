import { getAllBlogCards } from "@/lib/blog";
import { siteConfig } from "@/lib/site-config";

export const revalidate = 300;

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = await getAllBlogCards();
  const now = new Date().toUTCString();

  const items = posts
    .slice(0, 50)
    .map((p) => {
      const pub = p.date ? new Date(p.date).toUTCString() : now;
      return `
    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${siteConfig.url}/blog/${p.slug}</link>
      <guid isPermaLink="true">${siteConfig.url}/blog/${p.slug}</guid>
      <pubDate>${pub}</pubDate>
      <description>${xmlEscape(p.excerpt)}</description>
      <category>${xmlEscape(p.category)}</category>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(siteConfig.name)} — Blog</title>
    <link>${siteConfig.url}/blog</link>
    <description>${xmlEscape(siteConfig.description)}</description>
    <language>en-IN</language>
    <copyright>© ${new Date().getFullYear()} ${xmlEscape(siteConfig.legalName)}</copyright>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${siteConfig.url}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
