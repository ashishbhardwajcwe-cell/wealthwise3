import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar, User } from "lucide-react";
import { BLOG_POSTS } from "@/lib/blog-data";
import { StructuredData, articleSchema } from "@/components/StructuredData";
import { siteConfig } from "@/lib/site-config";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      authors: [post.author],
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const related = BLOG_POSTS.filter((p) => p.slug !== slug && p.category === post.category).slice(0, 3);

  return (
    <>
      <article className="py-16 md:py-20">
        <div className="container-narrow">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-slate)] hover:text-[var(--color-gold-dim)] mb-8">
            <ArrowLeft className="w-4 h-4" /> All articles
          </Link>

          <span className="eyebrow">{post.category}</span>
          <h1 className="mt-4 text-balance">{post.title}</h1>

          <div className="mt-6 flex items-center gap-5 text-sm text-[var(--color-slate)]">
            <span className="inline-flex items-center gap-1.5"><User className="w-4 h-4" /> {post.author}</span>
            <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {post.date}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {post.readTime}</span>
          </div>

          <div className="aspect-[16/9] bg-[var(--color-sand)] rounded-xl mt-8 flex items-center justify-center text-xs text-[var(--color-slate)]">
            [Hero image]
          </div>

          <div className="prose-article mt-10">
            <BlogContent content={post.content} />
          </div>

          {/* Author bio */}
          <div className="mt-16 p-6 bg-[var(--color-parchment)] rounded-xl border border-[var(--color-gold)]/20">
            <h3 className="font-semibold text-[var(--color-navy)]">{post.author}</h3>
            <p className="text-sm text-[var(--color-slate)] mt-1 leading-relaxed">
              Founder of Auris Wealth. Ex-Indian Army (20 years). NISM-certified Investment Adviser. Building tools and writing
              about wealth management for Indian and global investors.
            </p>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-16">
              <h3 className="text-xl font-semibold mb-6">Related reading</h3>
              <div className="space-y-2">
                {related.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="block p-4 bg-white border border-[var(--color-silver)]/40 rounded-lg hover:border-[var(--color-gold)] transition-colors group"
                  >
                    <div className="text-xs text-[var(--color-slate)] mb-1">{p.category} · {p.readTime}</div>
                    <div className="font-semibold text-[var(--color-navy)] group-hover:text-[var(--color-gold-dim)]">{p.title}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-16 text-xs text-[var(--color-slate)] leading-relaxed italic">
            This article is for educational purposes only and does not constitute investment, legal, or tax advice. Please consult a SEBI-registered investment adviser before making investment decisions.
          </div>
        </div>
      </article>

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

function BlogContent({ content }: { content: string }) {
  const lines = content.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("### ")) {
      elements.push(<h3 key={key++}>{trimmed.slice(4)}</h3>);
    } else if (trimmed.startsWith("## ")) {
      elements.push(<h2 key={key++}>{trimmed.slice(3)}</h2>);
    } else if (trimmed.startsWith("- ") || trimmed.match(/^\d+\.\s/)) {
      elements.push(<p key={key++}>{parseInline(trimmed)}</p>);
    } else {
      elements.push(<p key={key++}>{parseInline(trimmed)}</p>);
    }
  }
  return <>{elements}</>;
}

function parseInline(text: string): React.ReactNode {
  // Parse markdown links [text](url) — strip leading bullet/number
  const cleaned = text.replace(/^(?:- |\d+\.\s)/, "");
  const parts: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;
  let i = 0;
  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) parts.push(cleaned.slice(lastIndex, match.index));
    if (match[1] && match[2]) {
      parts.push(<Link key={i++} href={match[2]}>{match[1]}</Link>);
    } else if (match[3]) {
      parts.push(<strong key={i++}>{match[3]}</strong>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < cleaned.length) parts.push(cleaned.slice(lastIndex));
  return parts;
}
