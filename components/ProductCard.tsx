import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getNamedIcon, FallbackIcon } from "@/components/nav-icons";

interface ProductCardProps {
  icon: string;
  name: string;
  short: string;
  href: string;
}

export function ProductCard({ icon, name, short, href }: ProductCardProps) {
  const Icon = getNamedIcon(icon) ?? FallbackIcon;

  return (
    <Link href={href} className="card-soft group block">
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-lg bg-[var(--color-sand)]/70 flex items-center justify-center group-hover:bg-[var(--color-gold)]/15 transition-colors">
          <Icon className="w-5 h-5 text-[var(--color-gold-dim)]" />
        </div>
        <ArrowRight className="w-4 h-4 text-[var(--color-slate)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
      </div>
      <h3 className="text-base font-semibold mb-1.5">{name}</h3>
      <p className="text-sm text-[var(--color-slate)] leading-relaxed">{short}</p>
    </Link>
  );
}
