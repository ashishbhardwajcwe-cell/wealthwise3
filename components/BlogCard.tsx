import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";

interface BlogCardProps {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime?: string;
  image?: string;
  imageAlt?: string;
  /** Visual variant. "card" = grid card. "list" = compact row with thumbnail. */
  variant?: "card" | "list";
}

export function BlogCard({
  slug, title, excerpt, category, date, readTime, image, imageAlt, variant = "card",
}: BlogCardProps) {
  const href = `/blog/${slug}`;

  if (variant === "list") {
    return (
      <Link href={href} className="group flex gap-5 items-start py-5 border-b border-[var(--color-silver)]/30 hover:opacity-90 transition-opacity">
        {image ? (
          <div className="relative w-32 h-24 md:w-40 md:h-28 rounded-lg overflow-hidden bg-[var(--color-sand)] flex-shrink-0">
            <Image src={image} alt={imageAlt ?? title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="160px" />
          </div>
        ) : (
          <div className="w-32 h-24 md:w-40 md:h-28 rounded-lg bg-gradient-to-br from-[var(--color-sand)] to-[var(--color-parchment)] flex-shrink-0 flex items-center justify-center">
            <span className="text-[var(--color-gold-dim)]/40 text-xl" style={{ fontFamily: "var(--font-display)" }}>A</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <Meta category={category} date={date} readTime={readTime} />
          <h3 className="text-base md:text-lg font-semibold mt-1 leading-snug text-balance group-hover:text-[var(--color-gold-dim)] transition-colors">{title}</h3>
          <p className="text-sm text-[var(--color-slate)] leading-relaxed mt-1.5 line-clamp-2">{excerpt}</p>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="group block">
      {image ? (
        <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-[var(--color-sand)] mb-4">
          <Image src={image} alt={imageAlt ?? title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, 33vw" />
        </div>
      ) : (
        <div className="aspect-[16/10] rounded-xl bg-gradient-to-br from-[var(--color-sand)] to-[var(--color-parchment)] mb-4 flex items-center justify-center">
          <span className="text-3xl text-[var(--color-gold-dim)]/40" style={{ fontFamily: "var(--font-display)" }}>PlanMyCashflows</span>
        </div>
      )}
      <Meta category={category} date={date} readTime={readTime} />
      <h3 className="text-lg font-semibold mt-2 leading-snug text-balance group-hover:text-[var(--color-gold-dim)] transition-colors">{title}</h3>
      <p className="text-sm text-[var(--color-slate)] leading-relaxed mt-2 line-clamp-3">{excerpt}</p>
    </Link>
  );
}

function Meta({ category, date, readTime }: { category: string; date: string; readTime?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--color-slate)]">
      <span className="uppercase tracking-wider font-semibold text-[var(--color-gold-dim)]">{category}</span>
      <span aria-hidden>·</span>
      <span>{formatDate(date)}</span>
      {readTime && (
        <>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {readTime}
          </span>
        </>
      )}
    </div>
  );
}

function formatDate(d: string): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}
