import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Message us, WhatsApp or book a free 30-minute call about PMS, AIF, NRI investing and financial planning. Most messages answered within 24 hours.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
