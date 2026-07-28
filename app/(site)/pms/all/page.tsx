import type { Metadata } from "next";
import { PmsDirectory, pmsDirectoryMetadata } from "@/components/pms/PmsDirectory";

/*
  /pms/all — page 1 of the complete A–Z strategy directory.

  Pages 2..N live at /pms/all/[page]; both routes render the same component so
  the listing, pagination and rel prev/next stay in one place. Daily ISR, same
  cadence as the strategy pages themselves.
*/

export const revalidate = 86400;

export function generateMetadata(): Promise<Metadata> {
  return pmsDirectoryMetadata(1);
}

export default function PmsDirectoryFirstPage() {
  return <PmsDirectory page={1} />;
}
