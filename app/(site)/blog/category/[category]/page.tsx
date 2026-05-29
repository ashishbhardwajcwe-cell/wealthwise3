import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hero } from "@/components/Hero";
import { BlogCard } from "@/components/BlogCard";
import { getBlogPostsByCategory, BLOG_CATEGORIES } from "@/lib/blog";

interface Props {
  params: Promise<{ category: string }>;
}

export const revalidate = 60;

export async function generateStaticParams() {
  return BLOG_CATEGORIES.map((c) => ({
    category: c.toLowerCase().replace(/\s+/g, "-").replace("&", "and"),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = BLOG_CATEGORIES.find(
    (c) => c.toLowerCase().replace(/\s+/g, "-").replace("&", "and") === category,
  );
  return {
    title: `${cat ?? category} — Auris Wealth Blog`,
    description: `All Auris Wealth essays in the ${cat ?? category} category.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const cat = BLOG_CATEGORIES.find(
    (c) => c.toLowerCase().replace(/\s+/g, "-").replace("&", "and") === category,
  );
  if (!cat) notFound();

  const posts = await getBlogPostsByCategory(category);

  return (
    <>
      <Hero eyebrow="Category" title={cat} subtitle={`${posts.length} essays in ${cat}`} />
      <section className="py-16">
        <div className="container-wide">
          {posts.length === 0 ? (
            <p className="text-[var(--color-slate)] text-center">No posts in this category yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {posts.map((post) => (
                <BlogCard
                  key={post.slug} slug={post.slug} title={post.title}
                  excerpt={post.excerpt} category={post.category}
                  date={post.date} readTime={post.readTime}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
