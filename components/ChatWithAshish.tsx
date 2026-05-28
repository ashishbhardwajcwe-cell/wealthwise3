import { MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export function ChatWithAshish() {
  return (
    <a
      href={siteConfig.topmateUrl}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 right-6 inline-flex items-center gap-2 bg-[var(--color-navy)] text-[var(--color-cream)] px-4 py-3 rounded-full shadow-lg hover:bg-[var(--color-midnight)] transition-colors z-40"
    >
      <MessageCircle className="w-4 h-4 text-[var(--color-gold)]" />
      <span className="text-sm font-semibold">Chat with Ashish</span>
    </a>
  );
}
