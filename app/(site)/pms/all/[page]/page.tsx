import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { getLivePmsStrategies } from "@/lib/investment-data";
import { cleanPmsStrategies, pmsDirectoryPageCount } from "@/lib/pms";
import { PmsDirectory, pmsDirectoryMetadata } from "@/components/pms/PmsDirectory";

/*
  /pms/all/[page] — pages 2..N of the A–Z strategy directory (page 1 is
  /pms/all). Every page is pre-rendered: there are only ~18 of them at 100
  strategies per page, they are the crawl path to all ~1,700 strategy pages,
  and a crawler that hits a cold render on page 14 may simply give up.

  /pms/all/1 permanently redirects to /pms/all so the first page has exactly
  one URL.
*/

interface Props {
  params: Promise<{ page: string }>;
}

export const revalidate = 86400;

/** "3" → 3; anything else (0, -1, "2e3", "abc") → NaN, which 404s. */
function parsePage(raw: string): number {
  return /^[1-9]\d*$/.test(raw) ? Number(raw) : NaN;
}

export async function generateStaticParams() {
  const clean = cleanPmsStrategies(await getLivePmsStrategies());
  const totalPages = clean.length === 0 ? 0 : pmsDirectoryPageCount(clean.length);
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({ page: String(i + 2) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  return pmsDirectoryMetadata(parsePage(page));
}

export default async function PmsDirectoryPage({ params }: Props) {
  const { page } = await params;
  const n = parsePage(page);
  if (n === 1) permanentRedirect("/pms/all");
  return <PmsDirectory page={n} />;
}
