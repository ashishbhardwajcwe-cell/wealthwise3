"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ExternalLink, ChevronDown } from "lucide-react";
import { getNamedIcon } from "@/components/nav-icons";
import { cn } from "@/lib/utils";
import { investmentProducts, siteConfig } from "@/lib/site-config";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { AccountButton } from "./auth/AccountButton";

interface NavMenuItem {
  href: string;
  label: string;
  desc: string;
  icon?: string;
  /** Accent colour (hex) for the lucide-icon fallback tile. */
  tone?: string;
  /** Preferred display glyph — a colour emoji shown in place of the icon. */
  emoji?: string;
  external?: boolean;
}

// All major investment themes, PMS-first. Cryptocurrency is intentionally
// not promoted in navigation (the page stays live and in the sitemap).
const investMenu: NavMenuItem[] = investmentProducts
  .filter((p) => p.slug !== "cryptocurrency")
  .map((p) => ({ href: `/investment-products/${p.slug}`, label: p.name, desc: p.short, icon: p.icon, tone: p.tone, emoji: p.emoji }));

const learnMenu: NavMenuItem[] = [
  { href: "/blog", label: "Education Hub", desc: "Guides, explainers and analysis on PMS, AIF and more", icon: "BookOpen", tone: "#2563EB", emoji: "📰" },
  { href: "/blog/complete-guide-to-pms-india-2026", label: "PMS Guide", desc: "The complete guide to PMS in India", icon: "BookA", tone: "#4F46E5", emoji: "📗" },
  { href: "/resources/calculators", label: "Calculators", desc: "PMS fees, SIP, retirement, FIRE and more", icon: "Calculator", tone: "#7C3AED", emoji: "🧮" },
  { href: "/resources/glossary", label: "Glossary", desc: "Plain-English finance terms, explained", icon: "BookA", tone: "#0F766E", emoji: "📖" },
  { href: "/resources/downloads", label: "Free PDFs", desc: "Checklists and PDF playbooks", icon: "Download", tone: "#16A34A", emoji: "📥" },
];

const plannersMenu: NavMenuItem[] = [
  { href: "/financial-planning", label: "Financial Planning", desc: "Our financial-planning and wealth-management hub", icon: "Compass", tone: "#1E3A8A", emoji: "🧭" },
  { href: "/plan", label: "All planners — overview", desc: "Compare snapshot, guided plan and the full app side-by-side", icon: "LayoutGrid", tone: "#334155", emoji: "🗂️" },
  { href: "/ai-wealth-planner", label: "AI Snapshot", desc: "60-second personalised snapshot · No signup", icon: "Sparkles", tone: "#D97706", emoji: "✨" },
  { href: "/guided", label: "Guided Plan", desc: "10-minute YNAB-style Q&A · No signup", icon: "ListChecks", tone: "#0F766E", emoji: "✅" },
];

/** A nav head is "active" when the current path falls under any of its prefixes. */
function isActive(pathname: string, match: string | string[]): boolean {
  const prefixes = Array.isArray(match) ? match : [match];
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const pathname = usePathname() || "/";

  // Close the mobile drawer and any open dropdown whenever the route
  // changes — otherwise the menu stays open across navigations.
  useEffect(() => {
    setOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  const menuProps = (id: string) => ({
    open: openMenu === id,
    setOpen: (v: boolean) => setOpenMenu(v ? id : null),
  });

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="container-wide flex items-center justify-between gap-3 h-16">
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 transition-transform hover:scale-[1.02]"
          aria-label="PlanMyCashflows — Home"
        >
          <Image src="/pmc-logo.png" alt="" width={34} height={34} priority className="rounded-md" />
          <span className="text-base font-semibold tracking-tight whitespace-nowrap" style={{ fontFamily: "var(--font-display)" }}>
            PlanMy<span className="text-[var(--color-gold-dim)]">Cashflows</span>
          </span>
        </Link>

        <nav className="hidden lg:flex flex-1 items-center justify-center gap-1 xl:gap-2" aria-label="Primary">
          <NavLink href="/investment-products/pms" active={isActive(pathname, "/investment-products/pms")}>PMS</NavLink>
          <NavLink href="/investment-products/aif" active={isActive(pathname, "/investment-products/aif")}>AIF</NavLink>
          <DropdownNavItem
            label="Invest"
            {...menuProps("invest")}
            active={
              isActive(pathname, "/investment-products") &&
              !isActive(pathname, ["/investment-products/pms", "/investment-products/aif"])
            }
            items={investMenu}
            width="w-[36rem]"
            columns={2}
          />
          <NavLink href="/compare" active={isActive(pathname, "/compare")}>Compare</NavLink>
          <DropdownNavItem
            label="Learn"
            {...menuProps("learn")}
            active={isActive(pathname, ["/blog", "/resources"])}
            items={learnMenu}
            width="w-[26rem]"
          />
          <DropdownNavItem
            label="Planners"
            {...menuProps("planners")}
            active={isActive(pathname, ["/plan", "/ai-wealth-planner", "/guided", "/financial-planning"])}
            items={plannersMenu}
            width="w-[26rem]"
          />
          <NavLink href="/about" active={isActive(pathname, "/about")}>About</NavLink>
        </nav>

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <CurrencySwitcher />
          <AccountButton />
          <span className="h-5 w-px bg-[var(--color-silver)]/50" aria-hidden />
          <a
            href={siteConfig.appDeepLink}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-[var(--color-navy)] hover:text-[var(--color-gold-dim)] transition-colors whitespace-nowrap inline-flex items-center gap-1"
            title="Open the AI Wealth Planner — goes straight to data entry"
          >
            AI Planner <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href={siteConfig.topmateUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary text-sm py-2 px-3.5 whitespace-nowrap"
          >
            Book a Call
          </a>
        </div>

        <button
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="lg:hidden p-2"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden glass border-t border-[var(--color-silver)]/40">
          <div className="container-wide py-4 flex flex-col gap-1">
            <MobileLink href="/investment-products/pms">PMS</MobileLink>
            <MobileLink href="/investment-products/aif">AIF</MobileLink>
            <MobileLink href="/compare">Compare</MobileLink>
            <div className="pt-3 pb-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-slate)] px-2">Invest</div>
            {investMenu
              .filter((item) => !["/investment-products/pms", "/investment-products/aif"].includes(item.href))
              .map((item) => (
                <MobileLink key={item.href} href={item.href}>{item.label}</MobileLink>
              ))}
            <div className="pt-3 pb-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-slate)] px-2">Learn</div>
            {learnMenu.map((item) => (
              <MobileLink key={item.href} href={item.href}>{item.label}</MobileLink>
            ))}
            <div className="pt-3 pb-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-slate)] px-2">Planners</div>
            {plannersMenu.map((item) => (
              <MobileLink key={item.href} href={item.href}>{item.label}</MobileLink>
            ))}
            <MobileLink href="/about">About</MobileLink>
            <AccountButton variant="mobile" />
            <a
              href={siteConfig.appDeepLink}
              target="_blank"
              rel="noreferrer"
              className="px-2 py-3 text-base font-semibold text-[var(--color-gold-dim)] inline-flex items-center gap-1.5"
              onClick={() => setOpen(false)}
            >
              AI Planner <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={siteConfig.topmateUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary text-sm mt-3"
              onClick={() => setOpen(false)}
            >
              Book a Call
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
  columns = 1,
}: {
  label: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  active?: boolean;
  items: NavMenuItem[];
  width?: string;
  columns?: 1 | 2;
}) {
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        className="nav-pill"
        data-active={active ? "true" : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        // Click / Enter / Space toggle so the menu works without a mouse.
        onClick={() => setOpen(!open)}
      >
        {label}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className={`absolute top-full left-0 pt-2 ${width}`}>
          <div className={`glass-panel rounded-xl p-3 grid gap-1 ${columns === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {items.map((item) => {
              const Icon = getNamedIcon(item.icon);
              const content = (
                <div className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-[var(--color-sand)]/70 transition-colors">
                  {item.emoji ? (
                    <span className="mt-0.5 w-7 h-7 flex items-center justify-center shrink-0 text-[20px] leading-none" aria-hidden>
                      {item.emoji}
                    </span>
                  ) : Icon ? (
                    <span
                      className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: item.tone ? `${item.tone}26` : "var(--color-sand)" }}
                    >
                      <Icon className="w-4 h-4" style={{ color: item.tone ?? "var(--color-gold-dim)" }} />
                    </span>
                  ) : null}
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-navy)] inline-flex items-center gap-1">
                      {item.label}
                      {item.external && <ExternalLink className="w-3 h-3 text-[var(--color-slate)]" />}
                    </div>
                    <div className="text-xs text-[var(--color-slate)] mt-0.5">{item.desc}</div>
                  </div>
                </div>
              );
              return item.external ? (
                <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className="block">
                  {content}
                </a>
              ) : (
                <Link key={item.href} href={item.href} className="block">
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
