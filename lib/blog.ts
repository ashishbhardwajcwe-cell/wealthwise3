/**
 * Blog data adapter — single source of truth for the blog pages.
 *
 * Sanity-first: if a post exists in Sanity (by slug), use the Sanity version.
 * Local fallback: posts that still live in lib/blog-data.ts continue to render
 *   so nothing breaks during the migration.
 *
 * Once you've migrated all 10 seed posts to Sanity, you can delete
 * lib/blog-data.ts entirely.
 */

import { sanityClient, isSanityConfigured } from "@/sanity/client";
import {
  allBlogPostsQuery, featuredBlogPostQuery, blogPostBySlugQuery,
  blogPostSlugsQuery, blogPostsByCategoryQuery,
} from "@/sanity/queries";
import { BLOG_POSTS as LOCAL_POSTS, BLOG_CATEGORIES } from "./blog-data";

export interface BlogCardData {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime?: string;
  image?: string;
}

interface SanityCardShape {
  _id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  readTime?: string;
  featured?: boolean;
  category?: { title?: string; slug?: string };
  author?: { name?: string; role?: string; image?: unknown };
  heroImage?: { asset?: { _ref?: string }; alt?: string };
}

function shapeSanityCard(p: SanityCardShape): BlogCardData {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category?.title ?? "Uncategorised",
    date: p.publishedAt?.slice(0, 10) ?? "",
    readTime: p.readTime,
  };
}

function shapeLocalCard(p: typeof LOCAL_POSTS[number]): BlogCardData {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    date: p.date,
    readTime: p.readTime,
  };
}

/** Merged list — Sanity posts first (latest), then local posts whose slugs aren't in Sanity. */
export async function getAllBlogCards(): Promise<BlogCardData[]> {
  let sanityPosts: BlogCardData[] = [];
  if (isSanityConfigured) {
    try {
      const raw: SanityCardShape[] = await sanityClient.fetch(allBlogPostsQuery, {}, {
        next: { revalidate: 60, tags: ["blog"] },
      });
      sanityPosts = raw.map(shapeSanityCard);
    } catch (err) {
      console.warn("Sanity blog fetch failed, falling back to local posts:", err);
    }
  }
  const sanitySlugs = new Set(sanityPosts.map((p) => p.slug));
  const fallback = LOCAL_POSTS.filter((p) => !sanitySlugs.has(p.slug)).map(shapeLocalCard);
  // newest first by date string sort (yyyy-mm-dd)
  return [...sanityPosts, ...fallback].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getFeaturedOrLatest(): Promise<BlogCardData | null> {
  if (isSanityConfigured) {
    try {
      const raw: SanityCardShape | null = await sanityClient.fetch(featuredBlogPostQuery, {}, {
        next: { revalidate: 60, tags: ["blog"] },
      });
      if (raw) return shapeSanityCard(raw);
    } catch { /* fall through */ }
  }
  const all = await getAllBlogCards();
  return all[0] ?? null;
}

export interface SanityBlogPost extends SanityCardShape {
  body?: unknown;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  ogImage?: { asset?: { url?: string } };
}

/** Returns either a Sanity post (with body as PortableText blocks) or a local TS post. */
export async function getBlogPost(slug: string): Promise<
  { kind: "sanity"; post: SanityBlogPost } | { kind: "local"; post: typeof LOCAL_POSTS[number] } | null
> {
  if (isSanityConfigured) {
    try {
      const post: SanityBlogPost | null = await sanityClient.fetch(
        blogPostBySlugQuery, { slug },
        { next: { revalidate: 60, tags: ["blog", `blog:${slug}`] } },
      );
      if (post) return { kind: "sanity", post };
    } catch { /* fall through */ }
  }
  const local = LOCAL_POSTS.find((p) => p.slug === slug);
  if (local) return { kind: "local", post: local };
  return null;
}

export async function getAllBlogSlugs(): Promise<string[]> {
  const slugs = new Set<string>(LOCAL_POSTS.map((p) => p.slug));
  if (isSanityConfigured) {
    try {
      const sanitySlugs: string[] = await sanityClient.fetch(blogPostSlugsQuery, {}, {
        next: { revalidate: 60 },
      });
      sanitySlugs.forEach((s) => slugs.add(s));
    } catch { /* ignore */ }
  }
  return Array.from(slugs);
}

export async function getBlogPostsByCategory(categorySlug: string): Promise<BlogCardData[]> {
  // Match by category title for now; Sanity uses category reference slugs.
  const all = await getAllBlogCards();
  return all.filter((p) =>
    p.category.toLowerCase().replace(/\s+/g, "-").replace("&", "and") === categorySlug,
  );
}

export { BLOG_CATEGORIES };
