"use client";

import { useState } from "react";
import { Linkedin, Twitter, MessageCircle, Link as LinkIcon, Check } from "lucide-react";

interface ShareButtonsProps {
  url: string;
  title: string;
  /** Optional summary used for LinkedIn share preview */
  summary?: string;
  /** Optional UTM source override; defaults differ by network */
  utmCampaign?: string;
}

function withUtm(url: string, source: string, medium: string, campaign?: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", source);
    u.searchParams.set("utm_medium", medium);
    if (campaign) u.searchParams.set("utm_campaign", campaign);
    return u.toString();
  } catch {
    return url;
  }
}

export function ShareButtons({ url, title, summary, utmCampaign }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const tw = withUtm(url, "twitter", "social", utmCampaign);
  const li = withUtm(url, "linkedin", "social", utmCampaign);
  const wa = withUtm(url, "whatsapp", "social", utmCampaign);
  const direct = withUtm(url, "direct", "share", utmCampaign);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(tw)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(li)}${summary ? `&summary=${encodeURIComponent(summary)}` : ""}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title} ${wa}`)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(direct);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wider font-semibold text-[var(--color-slate)] mr-1">Share</span>
      <ShareBtn href={twitterUrl} label="Share on Twitter" icon={<Twitter className="w-4 h-4" />} />
      <ShareBtn href={linkedinUrl} label="Share on LinkedIn" icon={<Linkedin className="w-4 h-4" />} />
      <ShareBtn href={whatsappUrl} label="Share on WhatsApp" icon={<MessageCircle className="w-4 h-4" />} />
      <button
        onClick={copy}
        aria-label="Copy link"
        className="w-8 h-8 rounded-full border border-[var(--color-silver)]/40 flex items-center justify-center hover:border-[var(--color-gold)] hover:text-[var(--color-gold-dim)] transition-colors text-[var(--color-slate)]"
      >
        {copied ? <Check className="w-4 h-4 text-[var(--color-emerald)]" /> : <LinkIcon className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ShareBtn({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="w-8 h-8 rounded-full border border-[var(--color-silver)]/40 flex items-center justify-center hover:border-[var(--color-gold)] hover:text-[var(--color-gold-dim)] transition-colors text-[var(--color-slate)]"
    >
      {icon}
    </a>
  );
}
