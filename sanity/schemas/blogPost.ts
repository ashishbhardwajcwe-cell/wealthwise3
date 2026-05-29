import { defineType, defineField } from "sanity";

export const blogPost = defineType({
  name: "blogPost",
  title: "Blog Post",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "meta", title: "Metadata" },
    { name: "seo", title: "SEO & Social" },
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
