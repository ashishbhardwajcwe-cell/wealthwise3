import type { Metadata, Viewport } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "PlanMyCashflows Studio",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

/** Studio renders fullscreen without the marketing site chrome. */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
