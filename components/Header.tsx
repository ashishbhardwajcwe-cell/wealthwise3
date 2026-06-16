"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ExternalLink, ChevronDown } from "lucide-react";
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
  { href: "/plan", label: "All planners — overview", desc: "Compare snapshot, guided plan and the full app side-by-side" },
  { href: "/ai-wealth-planner", label: "AI Snapshot", desc: "60-second personalised snapshot · No signup" },
  { href: "/guided", label: "Guided Plan", desc: "10-minute YNAB-style Q&A · No signup" },
];

const resourcesMenu: NavMenuItem[] = [
  { href: "/blog", label: "Blog", desc: "Guides, analysis and playbooks" },
  { href: "/resources/calculators", label: "Calculators", desc: "SIP, retirement, FIRE, EMI and more" },
  { href: "/resources/glossary", label: "Glossary", desc: "Plain-English finance terms, explained" },
  { href: "/resources/downloads", label: "Free downloads", desc: "Checklists and PDF playbooks" },
  { href: "/about", label: "About", desc: "Our story, mission and the team" },
];

/** A nav head is "active" when the current path falls under any of its prefixes. */
function isActive(pathname: string, match: string | string[]): boolean {
  const prefixes = Array.isArray(match) ? match : [match];
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState(false);
  const [planners, setPlanners] = useState(false);
  const [forMenu, setForMenu] = useState(false);
  const [resources, setResources] = useState(false);
  const pathname = usePathname() || "/";

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="container-wide flex items-center justify-between gap-4 h-16">
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 mr-1 transition-transform hover:scale-[1.02]"
          aria-label="PlanMyCashflows — Home"
        >
          <Image src="/auris-logo.png" alt="PlanMyCashflows" width={34} height={34} priority className="rounded-md" />
          <span className="text-base font-semibold tracking-tight whitespace-nowrap" style={{ fontFamily: "var(--font-display)" }}>
            PlanMy<span className="text-[var(--color-gold-dim)]">Cashflows</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1.5">
          <DropdownNavItem
            label="Products"
            open={products}
            setOpen={setProducts}
            active={isActive(pathname, "/investment-products")}
            items={investmentProducts.map((p) => ({ href: `/investment-products/${p.slug}`, label: p.name, desc: p.short }))}
          />
          <DropdownNavItem
            label="Planners"
            open={planners}
            setOpen={setPlanners}
            active={isActive(pathname, ["/plan", "/ai-wealth-planner", "/guided"])}
            items={plannersMenu}
            width="w-[26rem]"
          />
          <NavLink href="/markets" active={isActive(pathname, "/markets")}>Markets</NavLink>
          <NavLink href="/equity/analysis" active={isActive(pathname, "/equity")}>Research</NavLink>
          <DropdownNavItem
            label="For"
            open={forMenu}
            setOpen={setForMenu}
            active={isActive(pathname, "/for")}
            items={audiences.map((a) => ({ href: `/for/${a.slug}`, label: a.name, desc: a.short }))}
          />
          <DropdownNavItem
            label="Resources"
            open={resources}
            setOpen={setResources}
            active={isActive(pathname, ["/blog", "/resources", "/about"])}
            items={resourcesMenu}
            width="w-[24rem]"
          />
          <NavLink href="/pricing" active={isActive(pathname, "/pricing")}>Pricing</NavLink>
        </nav>

        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <CurrencySwitcher />
          <AccountButton />
          <a
            href={siteConfig.appDeepLink}
            target="_blank"
            rel="noreferrer"
            className="btn-primary text-sm py-2 px-3.5 whitespace-nowrap"
            title="Open the AI Wealth Planner — goes straight to data entry"
          >
            AI Planner <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <button aria-label="Toggle menu" className="lg:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden glass border-t border-[var(--color-silver)]/40">
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

function NavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className="nav-pill" data-active={active ? "true" : undefined}>
      {children}
    </Link>
  );
}

function MobileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="px-2 py-3 text-base font-medium text-[var(--color-navy)] border-b border-[var(--color-silver)]/30">
      {children}
    </Link>
  );
}

function DropdownNavItem({
  label,
  open,
  setOpen,
  active,
  items,
  width = "w-[28rem]",
}: {
  label: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  active?: boolean;
  items: NavMenuItem[];
  width?: string;
}) {
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className="nav-pill" data-active={active ? "true" : undefined}>
        {label}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className={`absolute top-full left-0 pt-2 ${width}`}>
          <div className="glass-panel rounded-xl p-3 grid grid-cols-1 gap-1">
            {items.map((item) => {
              const content = (
                <div className="rounded-lg px-3 py-2 hover:bg-[var(--color-sand)]/70 transition-colors">
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
