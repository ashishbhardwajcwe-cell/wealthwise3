import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/Hero";
import { BlogCard } from "@/components/BlogCard";
import { getAllBlogCards, getFeaturedOrLatest, BLOG_CATEGORIES } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Auris Wealth Blog — Wealth, Tax, Planning, Defence, NRI",
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

  return (
    <>
      <Hero
        eyebrow="Blog"
        title="Notes on wealth, written for the long view."
        subtitle="In-depth essays — usually 1,500-3,000 words — on what actually compounds (investing, tax, planning) and what doesn&apos;t (fads, products, hot tips)."
      />

      {featured && (
        <section className="py-16">
          <div className="container-wide">
            <Link href={`/blog/${featured.slug}`} className="card-soft block group">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="aspect-[4/3] bg-[var(--color-sand)] rounded-lg flex items-center justify-center text-xs text-[var(--color-slate)]">
                  [Featured image]
                </div>
                <div>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-slate)] mb-3">
                    <span className="px-2 py-1 bg-[var(--color-gold)]/15 text-[var(--color-gold-dim)] uppercase tracking-wider rounded font-semibold">Featured</span>
                    <span className="uppercase tracking-wider font-semibold">{featured.category}</span>
                    <span>·</span>
                    <span>{featured.date}</span>
                  </div>
                  <h2 className="text-2xl mb-3 group-hover:text-[var(--color-gold-dim)] transition-colors">{featured.title}</h2>
                  <p className="text-[var(--color-slate)] leading-relaxed">{featured.excerpt}</p>
                  <div className="mt-5 text-sm font-semibold text-[var(--color-gold-dim)]">
                    Read full essay →
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="py-8 border-y border-[var(--color-silver)]/40">
        <div className="container-wide flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-sm font-semibold text-[var(--color-slate)] mr-2">Categories:</span>
            {BLOG_CATEGORIES.map((c) => (
              <Link
                key={c}
                href={`/blog/category/${c.toLowerCase().replace(/\s+/g, "-").replace("&", "and")}`}
                className="px-3 py-1.5 bg-white border border-[var(--color-silver)]/40 rounded-full text-sm hover:border-[var(--color-gold)] transition-colors"
              >
                {c}
              </Link>
            ))}
          </div>
          <a
            href="/rss.xml"
            className="text-xs font-semibold text-[var(--color-gold-dim)] hover:underline inline-flex items-center gap-1"
            title="Subscribe via RSS"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20A2.18 2.18 0 0 1 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z" />
            </svg>
            RSS Feed
          </a>
        </div>
      </section>

      <section className="py-16">
        <div className="container-wide">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rest.map((post) => (
              <BlogCard
                key={post.slug}
                slug={post.slug}
                title={post.title}
                excerpt={post.excerpt}
                category={post.category}
                date={post.date}
                readTime={post.readTime}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
