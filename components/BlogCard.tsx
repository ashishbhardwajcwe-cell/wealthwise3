import Link from "next/link";
import { Clock } from "lucide-react";

interface BlogCardProps {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime?: string;
  image?: string;
}

export function BlogCard({ slug, title, excerpt, category, date, readTime, image }: BlogCardProps) {
  return (
    <Link href={`/blog/${slug}`} className="card-soft group block">
      {image && (
        <div className="aspect-[16/9] bg-[var(--color-sand)] rounded-lg mb-4 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      )}
      <div className="flex items-center gap-3 text-xs text-[var(--color-slate)] mb-2">
        <span className="uppercase tracking-wider font-semibold text-[var(--color-gold-dim)]">{category}</span>
        <span>·</span>
        <span>{date}</span>
        {readTime && (
          <>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {readTime}
            </span>
          </>
        )}
      </div>
      <h3 className="text-lg font-semibold mb-2 group-hover:text-[var(--color-gold-dim)] transition-colors">
        {title}
      </h3>
      <p className="text-sm text-[var(--color-slate)] leading-relaxed line-clamp-3">{excerpt}</p>
    </Link>
  );
}
