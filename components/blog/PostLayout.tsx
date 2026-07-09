import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, Calendar, ArrowRight } from "lucide-react";
import { ReadingProgress } from "@/components/ReadingProgress";
import { TableOfContents } from "@/components/TableOfContents";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { ShareButtons } from "@/components/ShareButtons";
import { EngagementBar } from "@/components/blog/EngagementBar";
import { CommentsSection } from "@/components/blog/CommentsSection";
import type { BlogCardData } from "@/lib/blog";
import { siteConfig } from "@/lib/site-config";

/**
 * Shared editorial layout for a blog post. The Sanity and legacy-local
 * branches of the post page render the exact same chrome — header, hero,
 * sticky TOC, newsletter CTA, share strip, author bio, related posts —
 * differing only in how the body is produced, which arrives as children.
 */

export interface PostLayoutProps {
  slug: string;
  title: string;
  excerpt: string;
  /** Display name of the category (e.g. "Tax Planning"). */
  category: string;
  /** Link target for the category label; plain text when omitted. */
  categoryHref?: string;
  author: string;
  authorRole?: string;
  /** ISO-ish date string; formatted for display internally. */
  date: string;
  readTime?: string;
  heroImageUrl?: string | null;
  heroImageAlt?: string;
  related: BlogCardData[];
  /** Server-fetched engagement counts (SEO + no hydration pop). */
  initialLikes?: number;
  initialComments?: number;
  children: React.ReactNode;
}

function formatDate(d: string): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return d;
  }
}

export function PostLayout({
  slug,
  title,
  excerpt,
  category,
  categoryHref,
  author,
  authorRole,
  date,
  readTime,
  heroImageUrl,
  heroImageAlt,
  related,
  initialLikes,
  initialComments,
  children,
}: PostLayoutProps) {
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
            {categoryHref ? (
              <Link href={categoryHref} className="eyebrow hover:text-[var(--color-navy)] transition-colors">
                {category}
              </Link>
            ) : (
              <span className="eyebrow">{category}</span>
            )}
            <h1
              className="mt-3 text-balance leading-[1.05]"
              style={{ fontSize: "clamp(2.25rem, 5.5vw, 4rem)" }}
            >
              {title}
            </h1>
            <p className="mt-5 text-xl md:text-2xl text-[var(--color-slate)] text-balance leading-relaxed max-w-3xl">
              {excerpt}
            </p>

            <div className="mt-8 flex items-center gap-6 text-sm text-[var(--color-slate)] flex-wrap">
              <span className="font-semibold text-[var(--color-navy)]">{author}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {formatDate(date)}</span>
              {readTime && (
                <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {readTime}</span>
              )}
            </div>

            <EngagementBar slug={slug} initialLikes={initialLikes} initialComments={initialComments} />
          </div>
        </div>

        {heroImageUrl && (
          <div className="container-wide pb-10 md:pb-14">
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-[var(--color-sand)]">
              <Image
                src={heroImageUrl}
                alt={heroImageAlt ?? title}
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
              <div className="prose-article">{children}</div>

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
                <ShareButtons url={`${siteConfig.url}/blog/${slug}`} title={title} summary={excerpt} utmCampaign={`blog-${slug}`} />
              </div>

              <AuthorBio authorName={author} authorRole={authorRole} />

              {/* Contributor CTA */}
              <div className="mt-6 text-sm text-[var(--color-slate)]">
                Have a perspective worth publishing?{" "}
                <Link href="/blog/contribute" className="font-semibold text-[var(--color-gold-dim)] hover:underline">
                  Write for the Journal →
                </Link>
              </div>

              {/* Reader discussion */}
              <CommentsSection slug={slug} />
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
