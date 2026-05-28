import { ProductCard } from "@/components/ProductCard";

interface FeatureGridProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  items: { icon: string; name: string; short: string; href: string }[];
  columns?: 2 | 3 | 4;
}

export function FeatureGrid({ eyebrow, title, subtitle, items, columns = 3 }: FeatureGridProps) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <section className="py-20 md:py-28">
      <div className="container-wide">
        <div className="max-w-3xl mb-12">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 className="mt-3">{title}</h2>
          {subtitle && <p className="mt-4 text-lg text-[var(--color-slate)] leading-relaxed">{subtitle}</p>}
        </div>
        <div className={`grid grid-cols-1 ${gridCols} gap-5`}>
          {items.map((item) => (
            <ProductCard key={item.href} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
