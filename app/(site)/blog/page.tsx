import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock } from "lucide-react";
import { BlogCard } from "@/components/BlogCard";
import { getAllBlogCards, getFeaturedOrLatest, BLOG_CATEGORIES } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — PlanMyCashflows",
  description:
    "In-depth essays on wealth management, taxation, financial planning, defence officer transition, and NRI investing — by Col Ashish Bhardwaj.",
};

export const revalidate = 60;

export default async function BlogIndexPage() {
  const [allPosts, featured] = await Promise.all([
    getAllBlogCards(),
    getFeaturedOrLatest(),
  ]);
  const rest = allPosts.filter((p) => !featured || p.slug !== featured.slug);
  const latest = rest.slice(0, 6);
  const older = rest.slice(6);

  return (
    <>
      {/* Slim editorial masthead */}
      <header className="border-b border-[var(--color-silver)]/30">
        <div className="container-wide py-10 md:py-14">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <span className="eyebrow">PlanMyCashflows Journal</span>
              <h1 className="mt-2 text-balance" style={{ fontSize: "clamp(2rem, 4.5vw, 3.25rem)" }}>
                Notes on wealth, written for the long view.
              </h1>
              <p className="mt-3 text-[var(--color-slate)] max-w-2xl leading-relaxed">
                In-depth essays on what actually compounds — investing, tax, planning, the boring discipline.
              </p>
            </div>
            <a
              href="/rss.xml"
              className="text-xs font-semibold text-[var(--color-gold-dim)] hover:underline inline-flex items-center gap-1.5 flex-shrink-0"
              title="Subscribe via RSS"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20A2.18 2.18 0 0 1 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z" />
              </svg>
              RSS
            </a>
          </div>
        </div>
      </header>

      {/* Magazine-style featured */}
      {featured && (
        <section className="py-12 md:py-16">
          <div className="container-wide">
            <Link href={`/blog/${featured.slug}`} className="group grid md:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="md:col-span-7">
                {featured.image ? (
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-[var(--color-sand)]">
                    <Image
                      src={featured.image}
                      alt={featured.imageAlt ?? featured.title}
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 60vw"
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-700"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/10] rounded-2xl bg-gradient-to-br from-[var(--color-navy)] to-[var(--color-midnight)] flex items-center justify-center">
                    <span className="text-5xl text-[var(--color-gold)]/40" style={{ fontFamily: "var(--font-display)" }}>PlanMyCashflows</span>
                  </div>
                )}
              </div>
              <div className="md:col-span-5">
                <div className="flex items-center gap-3 text-xs">
                  <span className="px-2 py-1 bg-[var(--color-gold)]/15 text-[var(--color-gold-dim)] uppercase tracking-wider rounded font-semibold">Featured</span>
                  <span className="uppercase tracking-wider font-semibold text-[var(--color-gold-dim)]">{featured.category}</span>
                </div>
                <h2 className="mt-4 text-balance leading-[1.1]" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
                  {featured.title}
                </h2>
                <p className="mt-4 text-lg text-[var(--color-slate)] leading-relaxed line-clamp-4">
                  {featured.excerpt}
                </p>
                <div className="mt-6 flex items-center gap-3 text-sm text-[var(--color-slate)]">
                  {featured.authorName && <span>{featured.authorName}</span>}
                  {featured.authorName && <span aria-hidden>·</span>}
                  <span>{formatDate(featured.date)}</span>
                  {featured.readTime && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{featured.readTime}</span>
                    </>
                  )}
                </div>
                <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-gold-dim)] group-hover:gap-2.5 transition-all">
                  Read full essay <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Category filter strip */}
      <section className="py-6 border-y border-[var(--color-silver)]/30 bg-[var(--color-parchment)]/30">
        <div className="container-wide">
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs uppercase tracking-wider font-semibold text-[var(--color-slate)] mr-2">Browse</span>
            <Link
              href="/blog"
              className="px-3 py-1.5 rounded-full text-sm font-semibold bg-[var(--color-navy)] text-[var(--color-cream)]"
            >
              All
            </Link>
            {BLOG_CATEGORIES.map((c) => (
              <Link
                key={c}
                href={`/blog/category/${c.toLowerCase().replace(/\s+/g, "-").replace("&", "and")}`}
                className="px-3 py-1.5 rounded-full text-sm bg-white border border-[var(--color-silver)]/40 hover:border-[var(--color-gold)] hover:text-[var(--color-gold-dim)] transition-colors"
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Latest essays — grid */}
      {latest.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container-wide">
            <div className="flex items-end justify-between gap-4 mb-8">
              <h2 className="text-2xl md:text-3xl">Latest essays</h2>
              <span className="text-sm text-[var(--color-slate)]">{rest.length} {rest.length === 1 ? "essay" : "essays"}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {latest.map((post) => (
                <BlogCard
                  key={post.slug}
                  slug={post.slug}
                  title={post.title}
                  excerpt={post.excerpt}
                  category={post.category}
                  date={post.date}
                  readTime={post.readTime}
                  image={post.image}
                  imageAlt={post.imageAlt}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Archive — every essay in a clean list (the "index" the user asked for) */}
      {older.length > 0 && (
        <section className="py-12 md:py-16 border-t border-[var(--color-silver)]/30">
          <div className="container-wide">
            <div className="grid md:grid-cols-12 gap-8">
              <aside className="md:col-span-3">
                <h2 className="text-xl md:text-2xl mb-2">Archive</h2>
                <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                  Every essay we&apos;ve published. Click any title to read.
                </p>
              </aside>
              <div className="md:col-span-9">
                {older.map((post) => (
                  <BlogCard
                    key={post.slug}
                    slug={post.slug}
                    title={post.title}
                    excerpt={post.excerpt}
                    category={post.category}
                    date={post.date}
                    readTime={post.readTime}
                    image={post.image}
                    imageAlt={post.imageAlt}
                    variant="list"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Empty state if no posts at all */}
      {allPosts.length === 0 && (
        <section className="py-24">
          <div className="container-narrow text-center">
            <p className="text-[var(--color-slate)]">The journal is being seeded. New essays will appear here as they&apos;re published.</p>
          </div>
        </section>
      )}
    </>
  );
}

function formatDate(d: string): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return d;
  }
}
