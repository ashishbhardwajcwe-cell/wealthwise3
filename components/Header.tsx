"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { investmentProducts, audiences, siteConfig } from "@/lib/site-config";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { AccountButton } from "./auth/AccountButton";

interface NavMenuItem {
  href: string;
  label: string;
  desc: string;
  external?: boolean;
}

const plannersMenu: NavMenuItem[] = [
  {
    href: "/plan",
    label: "All planners — overview",
    desc: "Compare snapshot, guided plan and the full app side-by-side",
  },
  {
    href: "/ai-wealth-planner",
    label: "AI Snapshot",
    desc: "60-second personalised snapshot · No signup",
  },
  {
    href: "/guided",
    label: "Guided Plan",
    desc: "10-minute YNAB-style Q&A · No signup",
  },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState(false);
  const [planners, setPlanners] = useState(false);
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
          <DropdownNavItem
            label="Wealth Planners"
            open={planners}
            setOpen={setPlanners}
            items={plannersMenu}
            width="w-[26rem]"
          />
          <NavLink href="/markets">Markets</NavLink>
          <NavLink href="/equity/analysis">Research</NavLink>
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

        <div className="hidden lg:flex items-center gap-4">
          <CurrencySwitcher />
          <AccountButton />
          <a
            href={siteConfig.appDeepLink}
            target="_blank"
            rel="noreferrer"
            className="btn-primary text-sm py-2 px-4"
            title="Open the AI Wealth Planner — skips the marketing landing and goes straight to data entry"
          >
            AI Wealth Planner <ExternalLink className="w-3.5 h-3.5" />
          </a>
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
            <div className="pt-3 pb-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-slate)] px-2">Wealth Planners</div>
            <MobileLink href="/plan">All planners — overview</MobileLink>
            <MobileLink href="/ai-wealth-planner">AI Snapshot · 60 sec</MobileLink>
            <MobileLink href="/guided">Guided Plan · 10 min</MobileLink>
            <a
              href={siteConfig.appDeepLink}
              target="_blank"
              rel="noreferrer"
              className="px-2 py-3 text-base font-semibold text-[var(--color-gold-dim)] border-b border-[var(--color-silver)]/30 inline-flex items-center gap-1.5"
            >
              AI Wealth Planner (app) <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <MobileLink href="/markets">Markets</MobileLink>
            <MobileLink href="/equity/analysis">Research</MobileLink>
            <MobileLink href="/for/professionals">For You</MobileLink>
            <MobileLink href="/blog">Blog</MobileLink>
            <MobileLink href="/resources/calculators">Calculators</MobileLink>
            <MobileLink href="/about">About</MobileLink>
            <MobileLink href="/pricing">Pricing</MobileLink>
            <AccountButton variant="mobile" />
            <a
              href={siteConfig.appDeepLink}
              target="_blank"
              rel="noreferrer"
              className="btn-primary text-sm mt-3"
              onClick={() => setOpen(false)}
            >
              Open the AI Wealth Planner
            </a>
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
  width = "w-[28rem]",
}: {
  label: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  items: NavMenuItem[];
  width?: string;
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
        <div className={`absolute top-full left-0 pt-2 ${width}`}>
          <div className="bg-white border border-[var(--color-silver)]/50 rounded-xl shadow-lg p-3 grid grid-cols-1 gap-1">
            {items.map((item) => {
              const content = (
                <div className="rounded-lg px-3 py-2 hover:bg-[var(--color-sand)]/60 transition-colors">
                  <div className="text-sm font-semibold text-[var(--color-navy)] inline-flex items-center gap-1">
                    {item.label}
                    {item.external && <ExternalLink className="w-3 h-3 text-[var(--color-slate)]" />}
                  </div>
                  <div className="text-xs text-[var(--color-slate)] mt-0.5">{item.desc}</div>
                </div>
              );
              return item.external ? (
                <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className={cn("block")}>
                  {content}
                </a>
              ) : (
                <Link key={item.href} href={item.href} className={cn("block")}>
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
