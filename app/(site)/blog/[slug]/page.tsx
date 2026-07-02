import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { StructuredData, articleSchema } from "@/components/StructuredData";
import { PortableContent } from "@/components/PortableContent";
import { PostLayout } from "@/components/blog/PostLayout";
import { getBlogPost, getAllBlogSlugs, getAllBlogCards } from "@/lib/blog";
import { urlFor } from "@/sanity/client";
import { siteConfig } from "@/lib/site-config";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getAllBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getBlogPost(slug);
  if (!result) return { title: "Post not found" };

  if (result.kind === "sanity") {
    const p = result.post;
    return {
      title: p.seoTitle ?? p.title,
      description: p.seoDescription ?? p.excerpt,
      openGraph: {
        title: p.title,
        description: p.excerpt,
        type: "article",
        publishedTime: p.publishedAt,
        authors: p.author?.name ? [p.author.name] : undefined,
        images: p.ogImage?.asset?.url ? [{ url: p.ogImage.asset.url }] : undefined,
      },
    };
  }

  const p = result.post;
  return {
    title: p.title,
    description: p.excerpt,
    openGraph: {
      title: p.title,
      description: p.excerpt,
      type: "article",
      publishedTime: p.date,
      authors: [p.author],
    },
  };
}

const categorySlug = (category: string) =>
  category.toLowerCase().replace(/\s+/g, "-").replace("&", "and");

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const result = await getBlogPost(slug);
  if (!result) notFound();

  const allCards = await getAllBlogCards();

  if (result.kind === "sanity") {
    const post = result.post;
    const category = post.category?.title ?? "Uncategorised";
    const author = post.author?.name ?? "PlanMyCashflows";
    const date = post.publishedAt?.slice(0, 10) ?? "";
    const heroImageUrl = post.heroImage?.asset
      ? urlFor(post.heroImage as never).width(1800).height(1000).fit("crop").auto("format").url()
      : null;

    const related = allCards
      .filter((p) => p.slug !== slug && p.category === category)
      .slice(0, 3);

    return (
      <>
        <PostLayout
          slug={slug}
          title={post.title}
          excerpt={post.excerpt}
          category={category}
          categoryHref={`/blog/category/${categorySlug(category)}`}
          author={author}
          authorRole={post.author?.role}
          date={date}
          readTime={post.readTime}
          heroImageUrl={heroImageUrl}
          heroImageAlt={post.heroImage?.alt}
          related={related}
        >
          <PortableContent value={post.body} />
        </PostLayout>

        <StructuredData
          data={articleSchema({
            title: post.title,
            description: post.excerpt,
            author,
            date,
            image: post.ogImage?.asset?.url ?? heroImageUrl ?? undefined,
            url: `${siteConfig.url}/blog/${slug}`,
          })}
        />
      </>
    );
  }

  // Local fallback — existing markdown-style content
  const post = result.post;
  const related = allCards.filter((p) => p.slug !== slug && p.category === post.category).slice(0, 3);

  return (
    <>
      <PostLayout
        slug={post.slug}
        title={post.title}
        excerpt={post.excerpt}
        category={post.category}
        author={post.author}
        date={post.date}
        readTime={post.readTime}
        related={related}
      >
        <LegacyBlogContent content={post.content} />
      </PostLayout>

      <StructuredData
        data={articleSchema({
          title: post.title,
          description: post.excerpt,
          author: post.author,
          date: post.date,
          url: `${siteConfig.url}/blog/${post.slug}`,
        })}
      />
    </>
  );
}

// Legacy renderer for posts that still live in lib/blog-data.ts as raw markdown
function LegacyBlogContent({ content }: { content: string }) {
  const lines = content.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("### ")) elements.push(<h3 key={key++}>{trimmed.slice(4)}</h3>);
    else if (trimmed.startsWith("## ")) elements.push(<h2 key={key++}>{trimmed.slice(3)}</h2>);
    else elements.push(<p key={key++}>{parseInline(trimmed)}</p>);
  }
  return <>{elements}</>;
}

function parseInline(text: string): React.ReactNode {
  const cleaned = text.replace(/^(?:- |\d+\.\s)/, "");
  const parts: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;
  let i = 0;
  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) parts.push(cleaned.slice(lastIndex, match.index));
    if (match[1] && match[2]) parts.push(<Link key={i++} href={match[2]}>{match[1]}</Link>);
    else if (match[3]) parts.push(<strong key={i++}>{match[3]}</strong>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < cleaned.length) parts.push(cleaned.slice(lastIndex));
  return parts;
}
