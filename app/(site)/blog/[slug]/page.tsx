import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, Calendar, ArrowRight } from "lucide-react";
import { StructuredData, articleSchema } from "@/components/StructuredData";
import { PortableContent } from "@/components/PortableContent";
import { ShareButtons } from "@/components/ShareButtons";
import { ReadingProgress } from "@/components/ReadingProgress";
import { TableOfContents } from "@/components/TableOfContents";
import { NewsletterSignup } from "@/components/NewsletterSignup";
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

function formatDate(d: string): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return d;
  }
}

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
        <ReadingProgress />

        {/* Editorial header */}
        <header className="border-b border-[var(--color-silver)]/30">
          <div className="container-wide pt-10 md:pt-14 pb-10">
            <Link href="/blog" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-[var(--color-slate)] hover:text-[var(--color-gold-dim)] mb-8">
              <ArrowLeft className="w-3.5 h-3.5" /> Journal
            </Link>

            <div className="max-w-4xl">
              <Link href={`/blog/category/${category.toLowerCase().replace(/\s+/g, "-").replace("&", "and")}`} className="eyebrow hover:text-[var(--color-navy)] transition-colors">
                {category}
              </Link>
              <h1
                className="mt-3 text-balance leading-[1.05]"
                style={{ fontSize: "clamp(2.25rem, 5.5vw, 4rem)" }}
              >
                {post.title}
              </h1>
              <p className="mt-5 text-xl md:text-2xl text-[var(--color-slate)] text-balance leading-relaxed max-w-3xl">
                {post.excerpt}
              </p>

              <div className="mt-8 flex items-center gap-6 text-sm text-[var(--color-slate)] flex-wrap">
                <span className="font-semibold text-[var(--color-navy)]">{author}</span>
                <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {formatDate(date)}</span>
                {post.readTime && (
                  <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {post.readTime}</span>
                )}
              </div>
            </div>
          </div>

          {heroImageUrl && (
            <div className="container-wide pb-10 md:pb-14">
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-[var(--color-sand)]">
                <Image
                  src={heroImageUrl}
                  alt={post.heroImage?.alt ?? post.title}
                  fill
                  priority
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </header>

        {/* Article body with optional sticky TOC */}
        <article className="py-12 md:py-16">
          <div className="container-wide">
            <div className="grid lg:grid-cols-[1fr_minmax(0,_42rem)_1fr] lg:gap-12">
              {/* Sticky TOC (left rail on desktop only) */}
              <aside className="hidden lg:block">
                <div className="sticky top-24">
                  <TableOfContents />
                </div>
              </aside>

              {/* Article body */}
              <div>
                <div className="prose-article">
                  <PortableContent value={post.body} />
                </div>

                {/* Inline newsletter CTA */}
                <div className="my-12 p-6 md:p-7 rounded-2xl bg-[var(--color-navy)] text-[var(--color-cream)]">
                  <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-light)] mb-2">Get the weekly note</div>
                  <h3 className="text-[var(--color-cream)] mb-3" style={{ fontSize: "1.5rem" }}>
                    One five-minute read every Friday.
                  </h3>
                  <p className="text-sm text-[var(--color-silver)] mb-4 leading-relaxed">
                    Practical wealth notes for Indian and global investors — what compounds, what doesn&apos;t, and what to do about it.
                  </p>
                  <NewsletterSignup source={`blog-${slug}`} />
                </div>

                {/* Share strip */}
                <div className="mt-10 flex justify-between items-center flex-wrap gap-3 py-5 border-y border-[var(--color-silver)]/30">
                  <span className="text-sm font-semibold text-[var(--color-navy)]">Enjoyed this? Share it.</span>
                  <ShareButtons url={`${siteConfig.url}/blog/${slug}`} title={post.title} summary={post.excerpt} utmCampaign={`blog-${slug}`} />
                </div>

                <AuthorBio authorName={author} authorRole={post.author?.role} />
              </div>

              {/* Reserved right rail (empty on most screens, holds floating CTAs in future) */}
              <aside className="hidden lg:block" aria-hidden />
            </div>

            {related.length > 0 && (
              <div className="max-w-4xl mx-auto mt-16 pt-12 border-t border-[var(--color-silver)]/30">
                <h2 className="text-xl md:text-2xl mb-6">Keep reading</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {related.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/blog/${p.slug}`}
                      className="group block p-5 bg-white border border-[var(--color-silver)]/40 rounded-xl hover:border-[var(--color-gold)] transition-colors"
                    >
                      <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">{p.category}</div>
                      <div className="font-semibold text-[var(--color-navy)] leading-snug group-hover:text-[var(--color-gold-dim)]">{p.title}</div>
                      {p.readTime && <div className="text-xs text-[var(--color-slate)] mt-3">{p.readTime}</div>}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="max-w-4xl mx-auto mt-12 text-xs text-[var(--color-slate)] leading-relaxed italic">
              This article is for educational purposes only and does not constitute investment, legal, or tax advice.
              Please consult a SEBI-registered investment adviser before making investment decisions.
            </div>

            <div className="text-center mt-12">
              <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-gold-dim)] hover:gap-2.5 transition-all">
                <ArrowLeft className="w-4 h-4" /> Back to all essays <ArrowRight className="w-4 h-4 opacity-0" />
              </Link>
            </div>
          </div>
        </article>

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
      <ReadingProgress />

      <header className="border-b border-[var(--color-silver)]/30">
        <div className="container-wide pt-10 md:pt-14 pb-10">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-[var(--color-slate)] hover:text-[var(--color-gold-dim)] mb-8">
            <ArrowLeft className="w-3.5 h-3.5" /> Journal
          </Link>

          <div className="max-w-4xl">
            <span className="eyebrow">{post.category}</span>
            <h1 className="mt-3 text-balance leading-[1.05]" style={{ fontSize: "clamp(2.25rem, 5.5vw, 4rem)" }}>
              {post.title}
            </h1>
            <p className="mt-5 text-xl md:text-2xl text-[var(--color-slate)] text-balance leading-relaxed max-w-3xl">
              {post.excerpt}
            </p>

            <div className="mt-8 flex items-center gap-6 text-sm text-[var(--color-slate)] flex-wrap">
              <span className="font-semibold text-[var(--color-navy)]">{post.author}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {formatDate(post.date)}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {post.readTime}</span>
            </div>
          </div>
        </div>
      </header>

      <article className="py-12 md:py-16">
        <div className="container-wide">
          <div className="grid lg:grid-cols-[1fr_minmax(0,_42rem)_1fr] lg:gap-12">
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <TableOfContents />
              </div>
            </aside>

            <div>
              <div className="prose-article">
                <LegacyBlogContent content={post.content} />
              </div>

              <div className="my-12 p-6 md:p-7 rounded-2xl bg-[var(--color-navy)] text-[var(--color-cream)]">
                <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-light)] mb-2">Get the weekly note</div>
                <h3 className="text-[var(--color-cream)] mb-3" style={{ fontSize: "1.5rem" }}>
                  One five-minute read every Friday.
                </h3>
                <p className="text-sm text-[var(--color-silver)] mb-4 leading-relaxed">
                  Practical wealth notes for Indian and global investors.
                </p>
                <NewsletterSignup source={`blog-${post.slug}`} />
              </div>

              <div className="mt-10 flex justify-between items-center flex-wrap gap-3 py-5 border-y border-[var(--color-silver)]/30">
                <span className="text-sm font-semibold text-[var(--color-navy)]">Enjoyed this? Share it.</span>
                <ShareButtons url={`${siteConfig.url}/blog/${post.slug}`} title={post.title} summary={post.excerpt} utmCampaign={`blog-${post.slug}`} />
              </div>

              <AuthorBio authorName={post.author} />
            </div>

            <aside className="hidden lg:block" aria-hidden />
          </div>

          {related.length > 0 && (
            <div className="max-w-4xl mx-auto mt-16 pt-12 border-t border-[var(--color-silver)]/30">
              <h2 className="text-xl md:text-2xl mb-6">Keep reading</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {related.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className="group block p-5 bg-white border border-[var(--color-silver)]/40 rounded-xl hover:border-[var(--color-gold)] transition-colors">
                    <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">{p.category}</div>
                    <div className="font-semibold text-[var(--color-navy)] leading-snug group-hover:text-[var(--color-gold-dim)]">{p.title}</div>
                    {p.readTime && <div className="text-xs text-[var(--color-slate)] mt-3">{p.readTime}</div>}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="max-w-4xl mx-auto mt-12 text-xs text-[var(--color-slate)] leading-relaxed italic">
            This article is for educational purposes only and does not constitute investment, legal, or tax advice.
            Please consult a SEBI-registered investment adviser before making investment decisions.
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

function AuthorBio({ authorName, authorRole }: { authorName: string; authorRole?: string }) {
  return (
    <div className="mt-12 p-6 md:p-7 bg-[var(--color-parchment)] rounded-2xl border border-[var(--color-gold)]/20">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-[var(--color-navy)] text-[var(--color-gold)] flex items-center justify-center font-semibold text-lg flex-shrink-0" style={{ fontFamily: "var(--font-display)" }}>
          {authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div>
          <h3 className="font-semibold text-[var(--color-navy)]" style={{ fontSize: "1.0625rem" }}>{authorName}</h3>
          <p className="text-sm text-[var(--color-slate)] mt-1 leading-relaxed">
            {authorRole ?? "Founder of PlanMyCashflows. Ex-Indian Army (20 years). NISM-certified Investment Adviser. Writes about wealth management for Indian and global investors."}
          </p>
        </div>
      </div>
    </div>
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
