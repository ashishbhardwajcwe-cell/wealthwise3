import { PortableText } from "@portabletext/react";
import type { PortableTextComponents } from "@portabletext/react";
import Link from "next/link";
import Image from "next/image";
import { urlFor } from "@/sanity/client";

const components: PortableTextComponents = {
  block: {
    h2: ({ children }) => <h2>{children}</h2>,
    h3: ({ children }) => <h3>{children}</h3>,
    h4: ({ children }) => <h4>{children}</h4>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-[var(--color-gold)] pl-4 italic my-6">{children}</blockquote>,
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
  },
};

interface Props { value: unknown }

export function PortableContent({ value }: Props) {
  if (!value) return null;
  // Cast — Sanity returns Portable Text blocks; PortableText accepts unknown.
  return <PortableText value={value as never} components={components} />;
}
