import { defineType, defineField } from "sanity";

export const blogPost = defineType({
  name: "blogPost",
  title: "Blog Post",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "meta", title: "Metadata" },
    { name: "seo", title: "SEO & Social" },
    { name: "submission", title: "Guest submission" },
  ],
  fields: [
    defineField({
      name: "title",
      type: "string",
      group: "content",
      validation: (r) => r.required().max(120),
    }),
    defineField({
      name: "slug",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "excerpt",
      type: "text",
      rows: 3,
      group: "content",
      description: "1-2 sentence summary shown in blog cards and meta description",
      validation: (r) => r.required().max(220),
    }),
    defineField({
      name: "heroImage",
      type: "image",
      group: "content",
      options: { hotspot: true },
      fields: [{ name: "alt", type: "string", title: "Alt text" }],
    }),
    defineField({
      name: "body",
      title: "Article body",
      type: "array",
      group: "content",
      of: [
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H2", value: "h2" },
            { title: "H3", value: "h3" },
            { title: "H4", value: "h4" },
            { title: "Quote", value: "blockquote" },
          ],
          marks: {
            decorators: [
              { title: "Bold", value: "strong" },
              { title: "Italic", value: "em" },
              { title: "Code", value: "code" },
            ],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Link",
                fields: [
                  { name: "href", type: "url", title: "URL" },
                  { name: "external", type: "boolean", title: "Open in new tab" },
                ],
              },
            ],
          },
        },
        { type: "image", options: { hotspot: true }, fields: [{ name: "alt", type: "string" }, { name: "caption", type: "string" }] },
        {
          type: "object",
          name: "callout",
          title: "Callout box",
          fields: [
            { name: "tone", type: "string", options: { list: ["info", "warning", "success", "tip"] } },
            { name: "body", type: "text", rows: 3 },
          ],
        },
        {
          type: "object",
          name: "youtubeEmbed",
          title: "YouTube video",
          fields: [
            {
              name: "url",
              type: "url",
              title: "YouTube URL",
              description: "Paste the full URL — youtube.com/watch?v=... or youtu.be/...",
              validation: (r) => r.required(),
            },
            { name: "caption", type: "string", title: "Caption (optional)" },
          ],
          preview: {
            select: { url: "url", caption: "caption" },
            prepare({ url, caption }) {
              return { title: caption || "YouTube video", subtitle: url };
            },
          },
        },
        {
          type: "object",
          name: "tradingViewChart",
          title: "TradingView chart",
          fields: [
            {
              name: "symbol",
              type: "string",
              title: "Symbol",
              description: 'e.g. "NSE:RELIANCE", "NSE:NIFTY", "BSE:SENSEX", "BINANCE:BTCINR"',
              validation: (r) => r.required(),
            },
            {
              name: "interval",
              type: "string",
              title: "Default interval",
              options: { list: ["1D", "1W", "1M", "3M", "1Y", "5Y"] },
              initialValue: "1Y",
            },
            {
              name: "height",
              type: "number",
              title: "Height (px)",
              initialValue: 400,
            },
            { name: "caption", type: "string", title: "Caption (optional)" },
          ],
          preview: {
            select: { symbol: "symbol", caption: "caption" },
            prepare({ symbol, caption }) {
              return { title: caption || `Chart: ${symbol}`, subtitle: symbol };
            },
          },
        },
        {
          type: "object",
          name: "stockQuote",
          title: "Live stock quote",
          fields: [
            {
              name: "symbol",
              type: "string",
              title: "Symbol",
              description: 'e.g. "NSE:TCS", "NSE:RELIANCE", "BSE:RELIANCE". Renders a small live-quote card.',
              validation: (r) => r.required(),
            },
          ],
          preview: {
            select: { symbol: "symbol" },
            prepare({ symbol }) {
              return { title: `Live quote: ${symbol}`, subtitle: "TradingView card" };
            },
          },
        },
      ],
    }),
    defineField({
      name: "author",
      type: "reference",
      to: [{ type: "author" }],
      group: "meta",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "category",
      type: "reference",
      to: [{ type: "category" }],
      group: "meta",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "tags",
      type: "array",
      group: "meta",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "publishedAt",
      type: "datetime",
      group: "meta",
      validation: (r) => r.required(),
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "readTime",
      title: "Read time",
      type: "string",
      group: "meta",
      description: 'e.g. "14 min"',
    }),
    defineField({
      name: "featured",
      title: "Featured post",
      description: "Show this post in the home page hero / featured slot",
      type: "boolean",
      group: "meta",
      initialValue: false,
    }),
    // --- Guest submission tracking (set by /api/submissions, read-only) ---
    // Drafts created from reader submissions carry these fields; review the
    // draft, assign a real Author, then Publish to approve. The contributor's
    // status page flips to "published" automatically via submissionId.
    defineField({
      name: "isGuestSubmission",
      title: "Guest submission",
      type: "boolean",
      group: "submission",
      initialValue: false,
      readOnly: true,
      description: "Set automatically when a reader submits via /blog/contribute",
    }),
    defineField({
      name: "guestAuthorName",
      title: "Submitted author name",
      type: "string",
      group: "submission",
      readOnly: true,
      description: "Create/assign an Author document with this name before publishing",
      hidden: ({ document }) => !document?.isGuestSubmission,
    }),
    defineField({
      name: "guestAuthorBio",
      title: "Submitted author bio",
      type: "text",
      rows: 3,
      group: "submission",
      readOnly: true,
      hidden: ({ document }) => !document?.isGuestSubmission,
    }),
    defineField({
      name: "submitterEmail",
      title: "Submitter email",
      type: "string",
      group: "submission",
      readOnly: true,
      hidden: ({ document }) => !document?.isGuestSubmission,
    }),
    defineField({
      name: "submissionId",
      title: "Submission ID",
      type: "string",
      group: "submission",
      readOnly: true,
      description: "Links back to the blog_submissions row in Supabase",
      hidden: ({ document }) => !document?.isGuestSubmission,
    }),
    defineField({
      name: "seoTitle",
      title: "SEO Title (overrides default)",
      type: "string",
      group: "seo",
      validation: (r) => r.max(70),
    }),
    defineField({
      name: "seoDescription",
      title: "SEO Description (overrides excerpt)",
      type: "text",
      rows: 2,
      group: "seo",
      validation: (r) => r.max(170),
    }),
    defineField({
      name: "ogImage",
      title: "Custom OG image",
      type: "image",
      group: "seo",
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "category.title",
      media: "heroImage",
      featured: "featured",
    },
    prepare({ title, subtitle, media, featured }) {
      return {
        title: featured ? `★ ${title}` : title,
        subtitle,
        media,
      };
    },
  },
});
