"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { investmentProducts, audiences } from "@/lib/site-config";
import { CurrencySwitcher } from "./CurrencySwitcher";

export function Header() {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState(false);
  const [forMenu, setForMenu] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--color-offwhite)]/85 border-b border-[var(--color-silver)]/40">
      <div className="container-wide flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Auris Wealth — Home">
          <Image
            src="/auris-logo.png"
            alt="Auris Wealth"
            width={36}
            height={36}
            priority
            className="rounded-md"
          />
          <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Auris<span className="text-[var(--color-gold-dim)]">Wealth</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          <DropdownNavItem
            label="Investment Products"
            open={products}
            setOpen={setProducts}
            items={investmentProducts.map((p) => ({
              href: `/investment-products/${p.slug}`,
              label: p.name,
              desc: p.short,
            }))}
          />
          <NavLink href="/ai-wealth-planner">AI Planner</NavLink>
          <NavLink href="/wealthwise">WealthWise App</NavLink>
          <DropdownNavItem
            label="For"
            open={forMenu}
            setOpen={setForMenu}
            items={audiences.map((a) => ({
              href: `/for/${a.slug}`,
              label: a.name,
              desc: a.short,
            }))}
          />
          <NavLink href="/blog">Blog</NavLink>
          <NavLink href="/resources/calculators">Calculators</NavLink>
          <NavLink href="/about">About</NavLink>
          <NavLink href="/pricing">Pricing</NavLink>
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <CurrencySwitcher />
          <Link href="/guided" className="text-sm font-semibold text-[var(--color-navy)] hover:text-[var(--color-gold-dim)] inline-flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-[var(--color-gold)]" />
            Guided Plan
          </Link>
          <Link href="/ai-wealth-planner" className="btn-primary text-sm py-2 px-4">
            Try AI Planner
          </Link>
        </div>

        <button
          aria-label="Toggle menu"
          className="lg:hidden p-2"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-[var(--color-silver)]/40 bg-white">
          <div className="container-wide py-4 flex flex-col gap-1">
            <MobileLink href="/investment-products/mutual-funds">Investment Products</MobileLink>
            <MobileLink href="/ai-wealth-planner">AI Planner</MobileLink>
            <MobileLink href="/wealthwise">WealthWise App</MobileLink>
            <MobileLink href="/for/professionals">For You</MobileLink>
            <MobileLink href="/blog">Blog</MobileLink>
            <MobileLink href="/resources/calculators">Calculators</MobileLink>
            <MobileLink href="/about">About</MobileLink>
            <MobileLink href="/pricing">Pricing</MobileLink>
            <MobileLink href="/guided">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[var(--color-gold)]" /> Guided Plan
              </span>
            </MobileLink>
            <Link href="/ai-wealth-planner" className="btn-primary text-sm mt-3" onClick={() => setOpen(false)}>
              Try AI Planner
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 text-sm font-medium text-[var(--color-navy)] hover:text-[var(--color-gold-dim)] transition-colors"
    >
      {children}
    </Link>
  );
}

function MobileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-2 py-3 text-base font-medium text-[var(--color-navy)] border-b border-[var(--color-silver)]/30"
    >
      {children}
    </Link>
  );
}

function DropdownNavItem({
  label,
  open,
  setOpen,
  items,
}: {
  label: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  items: { href: string; label: string; desc: string }[];
}) {
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button className="px-3 py-2 text-sm font-medium text-[var(--color-navy)] hover:text-[var(--color-gold-dim)]">
        {label}
      </button>
      {open && (
        <div className="absolute top-full left-0 pt-2 w-[28rem]">
          <div className="bg-white border border-[var(--color-silver)]/50 rounded-xl shadow-lg p-3 grid grid-cols-1 gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 hover:bg-[var(--color-sand)]/60 transition-colors",
                )}
              >
                <div className="text-sm font-semibold text-[var(--color-navy)]">{item.label}</div>
                <div className="text-xs text-[var(--color-slate)] mt-0.5">{item.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
