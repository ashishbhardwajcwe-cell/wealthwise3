/**
 * Minimal markdown → Portable Text converter for guest submissions.
 * Supports what the contribute form advertises: headings (##, ###),
 * paragraphs, bullet/numbered lists, blockquotes, and inline
 * **bold** / *italic* / `code` / [links](url). Anything fancier is left
 * as literal text for the editor to tidy in Sanity Studio.
 */

interface Span {
  _type: "span";
  _key: string;
  text: string;
  marks: string[];
}

interface MarkDef {
  _type: "link";
  _key: string;
  href: string;
}

export interface PortableBlock {
  _type: "block";
  _key: string;
  style: string;
  listItem?: "bullet" | "number";
  level?: number;
  markDefs: MarkDef[];
  children: Span[];
}

let keyCounter = 0;
function key(): string {
  keyCounter += 1;
  return `sub${Date.now().toString(36)}${keyCounter.toString(36)}`;
}

/** Parse inline markdown into spans + link markDefs. */
function parseInline(text: string): { children: Span[]; markDefs: MarkDef[] } {
  const children: Span[] = [];
  const markDefs: MarkDef[] = [];
  // Tokenise links first, then bold/italic/code inside plain segments.
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  const pushStyled = (segment: string, extraMarks: string[] = []) => {
    const styleRe = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)|(`([^`]+)`)/g;
    let sLast = 0;
    let sm: RegExpExecArray | null;
    while ((sm = styleRe.exec(segment)) !== null) {
      if (sm.index > sLast) {
        children.push({ _type: "span", _key: key(), text: segment.slice(sLast, sm.index), marks: [...extraMarks] });
      }
      if (sm[2]) children.push({ _type: "span", _key: key(), text: sm[2], marks: [...extraMarks, "strong"] });
      else if (sm[4]) children.push({ _type: "span", _key: key(), text: sm[4], marks: [...extraMarks, "em"] });
      else if (sm[6]) children.push({ _type: "span", _key: key(), text: sm[6], marks: [...extraMarks, "em"] });
      else if (sm[8]) children.push({ _type: "span", _key: key(), text: sm[8], marks: [...extraMarks, "code"] });
      sLast = styleRe.lastIndex;
    }
    if (sLast < segment.length) {
      children.push({ _type: "span", _key: key(), text: segment.slice(sLast), marks: [...extraMarks] });
    }
  };

  while ((m = linkRe.exec(text)) !== null) {
    if (m.index > last) pushStyled(text.slice(last, m.index));
    const linkKey = key();
    markDefs.push({ _type: "link", _key: linkKey, href: m[2] });
    pushStyled(m[1], [linkKey]);
    last = linkRe.lastIndex;
  }
  if (last < text.length) pushStyled(text.slice(last));

  if (children.length === 0) {
    children.push({ _type: "span", _key: key(), text: "", marks: [] });
  }
  return { children, markDefs };
}

function block(style: string, text: string, listItem?: "bullet" | "number"): PortableBlock {
  const { children, markDefs } = parseInline(text);
  const b: PortableBlock = { _type: "block", _key: key(), style, markDefs, children };
  if (listItem) {
    b.listItem = listItem;
    b.level = 1;
  }
  return b;
}

export function markdownToPortableText(markdown: string): PortableBlock[] {
  const blocks: PortableBlock[] = [];
  // Paragraphs are separated by blank lines; consecutive list lines group naturally
  // because each list line becomes its own block.
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(block("normal", paragraph.join(" ")));
      paragraph = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flushParagraph(); continue; }

    // "#"/"##" are section headings (the article title lives in its own field).
    if (line.startsWith("#### ")) { flushParagraph(); blocks.push(block("h4", line.slice(5))); }
    else if (line.startsWith("### ")) { flushParagraph(); blocks.push(block("h3", line.slice(4))); }
    else if (line.startsWith("## ")) { flushParagraph(); blocks.push(block("h2", line.slice(3))); }
    else if (line.startsWith("# ")) { flushParagraph(); blocks.push(block("h2", line.slice(2))); }
    else if (line.startsWith("> ")) { flushParagraph(); blocks.push(block("blockquote", line.slice(2))); }
    else if (/^[-*]\s+/.test(line)) { flushParagraph(); blocks.push(block("normal", line.replace(/^[-*]\s+/, ""), "bullet")); }
    else if (/^\d+[.)]\s+/.test(line)) { flushParagraph(); blocks.push(block("normal", line.replace(/^\d+[.)]\s+/, ""), "number")); }
    else paragraph.push(line);
  }
  flushParagraph();

  return blocks;
}

/** "7 min" style read-time estimate at ~200 wpm. */
export function estimateReadTime(markdown: string): string {
  const words = markdown.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min`;
}
