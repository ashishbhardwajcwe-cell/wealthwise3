import { PortableText } from "@portabletext/react";
import type { PortableTextComponents } from "@portabletext/react";
import Link from "next/link";
import Image from "next/image";
import { urlFor } from "@/sanity/client";
import { slugifyHeading } from "@/lib/slugify";
import { TradingViewChart } from "./TradingViewChart";
import { YouTubeEmbed } from "./YouTubeEmbed";
import { SymbolInfo } from "./markets/SymbolInfo";

function extractText(children: React.ReactNode): string {
  if (children == null) return "";
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (typeof children === "object" && "props" in children) {
    const props = (children as { props?: { children?: React.ReactNode } }).props;
    return extractText(props?.children);
  }
  return "";
}

const components: PortableTextComponents = {
  block: {
    h2: ({ children }) => {
      const id = slugifyHeading(extractText(children));
      return <h2 id={id}>{children}</h2>;
    },
    h3: ({ children }) => {
      const id = slugifyHeading(extractText(children));
      return <h3 id={id}>{children}</h3>;
    },
    h4: ({ children }) => {
      const id = slugifyHeading(extractText(children));
      return <h4 id={id}>{children}</h4>;
    },
    blockquote: ({ children }) => <blockquote>{children}</blockquote>,
    normal: ({ children }) => <p>{children}</p>,
  },
  marks: {
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    code: ({ children }) => <code className="px-1 py-0.5 bg-[var(--color-sand)]/60 rounded text-sm">{children}</code>,
    link: ({ children, value }) => {
      const href = value?.href ?? "#";
      const external = value?.external ?? !href.startsWith("/");
      return (
        <Link href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
          {children}
        </Link>
      );
    },
  },
  types: {
    image: ({ value }) => {
      if (!value?.asset) return null;
      const url = urlFor(value).width(960).url();
      return (
        <figure className="my-6">
          <Image
            src={url}
            alt={value.alt ?? ""}
            width={960}
            height={540}
            className="rounded-lg w-full h-auto"
          />
          {value.caption && (
            <figcaption className="text-xs text-[var(--color-slate)] mt-2 text-center italic">{value.caption}</figcaption>
          )}
        </figure>
      );
    },
    callout: ({ value }) => {
      const toneStyles: Record<string, string> = {
        info: "bg-[var(--color-teal)]/8 border-[var(--color-teal)]/30",
        warning: "bg-[var(--color-amber)]/8 border-[var(--color-amber)]/30",
        success: "bg-[var(--color-emerald)]/8 border-[var(--color-emerald)]/30",
        tip: "bg-[var(--color-gold)]/8 border-[var(--color-gold)]/30",
      };
      const cls = toneStyles[value?.tone ?? "tip"] ?? toneStyles.tip;
      return (
        <div className={`my-6 p-4 border-l-4 rounded-r-lg ${cls}`}>
          <p className="text-sm leading-relaxed text-[var(--color-navy)] m-0">{value.body}</p>
        </div>
      );
    },
    youtubeEmbed: ({ value }) => <YouTubeEmbed url={value.url} caption={value.caption} />,
    tradingViewChart: ({ value }) => (
      <TradingViewChart
        symbol={value.symbol}
        interval={value.interval}
        height={value.height}
        caption={value.caption}
      />
    ),
    stockQuote: ({ value }) => <SymbolInfo symbol={value.symbol} />,
  },
};

interface Props { value: unknown }

export function PortableContent({ value }: Props) {
  if (!value) return null;
  // Cast — Sanity returns Portable Text blocks; PortableText accepts unknown.
  return <PortableText value={value as never} components={components} />;
}
