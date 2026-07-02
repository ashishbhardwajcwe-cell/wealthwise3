/**
 * Static map for the icons referenced by string name in lib/site-config.ts
 * (products, audiences, nav menus). Named imports keep tree-shaking intact —
 * `import * as Icons from "lucide-react"` would pull the entire icon library
 * (~1,500 icons) into the client bundle of every page that renders the header.
 *
 * Adding a new icon name to site-config? Import it here and add it to the map.
 */

import {
  BookA,
  BookOpen,
  Briefcase,
  Building2,
  Bitcoin,
  Calculator,
  Circle,
  Coins,
  Cpu,
  Download,
  Gem,
  Home,
  Info,
  Layers,
  LayoutGrid,
  LineChart,
  ListChecks,
  Plane,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

const NAMED_ICONS: Record<string, LucideIcon> = {
  BookA,
  BookOpen,
  Briefcase,
  Building2,
  Bitcoin,
  Calculator,
  Circle,
  Coins,
  Cpu,
  Download,
  Gem,
  Home,
  Info,
  Layers,
  LayoutGrid,
  LineChart,
  ListChecks,
  Plane,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
};

/** Resolve a site-config icon name; warns once in dev for unmapped names. */
export function getNamedIcon(name?: string): LucideIcon | null {
  if (!name) return null;
  const icon = NAMED_ICONS[name];
  if (!icon && process.env.NODE_ENV !== "production") {
    console.warn(`nav-icons: "${name}" is not in the icon map — add it to components/nav-icons.ts`);
  }
  return icon ?? null;
}

/** Fallback icon for unknown names where a visible placeholder is preferred. */
export const FallbackIcon = Circle;
