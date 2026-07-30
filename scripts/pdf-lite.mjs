/**
 * pdf-lite.mjs — just enough PDF to write a data report. No dependencies.
 *
 * Every script in this folder runs on stock Node with nothing installed, and
 * the monthly archive is not worth a PDF toolchain: this produces PDF 1.4 with
 * the standard 14 fonts (no font embedding), text runs, lines and filled
 * rectangles. That is the whole feature set a tabular report needs.
 *
 * Two deliberate constraints:
 *
 *  - Table cells are set in Courier. It is a fixed-width standard font
 *    (600/1000 em per glyph), so column widths and truncation are exact
 *    arithmetic rather than an embedded metrics table, and figures line up
 *    down the column the way a data table should.
 *  - Text is WinAnsi-encoded, which has no ₹. Anything outside the encoding is
 *    transliterated (₹ → "Rs", en/em dashes → "-", smart quotes → straight)
 *    rather than emitted as a broken glyph.
 *
 * Coordinates are given with the ORIGIN AT THE TOP-LEFT and y growing
 * downward, because that is how a table is laid out; the PDF's bottom-left
 * origin is an internal detail.
 */

const FONTS = [
  ["F1", "Helvetica"],
  ["F2", "Helvetica-Bold"],
  ["F3", "Courier"],
  ["F4", "Courier-Bold"],
];

/** Courier advance width, in points, for `length` characters at `size`. */
export const courierWidth = (length, size) => length * size * 0.6;

/** Characters per `width` points of Courier at `size` — the truncation rule. */
export const courierFit = (width, size) => Math.max(0, Math.floor(width / (size * 0.6)));

const TRANSLITERATE = {
  "₹": "Rs", "—": "-", "–": "-", "−": "-", "’": "'", "‘": "'",
  "“": '"', "”": '"', "…": "...", " ": " ", "•": "-", "α": "alpha",
};

/** To WinAnsi-safe text: transliterate what we can, drop what we can't. */
export function winAnsi(input) {
  let out = "";
  for (const ch of String(input ?? "")) {
    if (TRANSLITERATE[ch] !== undefined) { out += TRANSLITERATE[ch]; continue; }
    const code = ch.codePointAt(0);
    // Printable ASCII, plus the Latin-1 range WinAnsi shares with Latin-1.
    if (code >= 0x20 && code <= 0x7e) out += ch;
    else if (code >= 0xa0 && code <= 0xff) out += ch;
    else if (ch === "\t") out += " ";
    // everything else (unmapped scripts, control chars) is dropped
  }
  return out;
}

/** Escape a PDF literal string. */
const pdfString = (s) => `(${winAnsi(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`;

/** Truncate to fit `width` points of Courier at `size`, with an ellipsis. */
export function clipCourier(text, width, size) {
  const s = winAnsi(text);
  const max = courierFit(width, size);
  if (s.length <= max) return s;
  return max <= 1 ? s.slice(0, max) : `${s.slice(0, max - 1)}~`;
}

export function createPdf({ width = 842, height = 595 } = {}) {
  const pages = [];
  let current = null;

  const requirePage = () => {
    if (!current) throw new Error("call addPage() before drawing");
    return current;
  };

  return {
    width,
    height,

    addPage() {
      current = { ops: [] };
      pages.push(current);
      return current;
    },

    /**
     * Point subsequent drawing at an already-created page (0-based). Needed
     * for anything that can only be written once the document is finished —
     * "Page 3 of 41" being the obvious one.
     */
    setPage(index) {
      if (!pages[index]) throw new Error(`no page at index ${index}`);
      current = pages[index];
    },

    /** Draw text with its BASELINE at (x, y), y measured from the page top. */
    text(str, x, y, { font = "F1", size = 10, gray = 0 } = {}) {
      const s = winAnsi(str);
      if (!s) return;
      requirePage().ops.push(
        `BT ${gray} g /${font} ${size} Tf 1 0 0 1 ${fmt(x)} ${fmt(height - y)} Tm ${pdfString(s)} Tj ET`,
      );
    },

    /** Right-align Courier text so its last glyph ends at `xRight`. */
    textRightCourier(str, xRight, y, { size = 7, gray = 0, bold = false } = {}) {
      const s = winAnsi(str);
      if (!s) return;
      this.text(s, xRight - courierWidth(s.length, size), y, { font: bold ? "F4" : "F3", size, gray });
    },

    line(x1, y1, x2, y2, { lineWidth = 0.5, gray = 0.75 } = {}) {
      requirePage().ops.push(
        `${fmt(lineWidth)} w ${gray} G ${fmt(x1)} ${fmt(height - y1)} m ${fmt(x2)} ${fmt(height - y2)} l S`,
      );
    },

    rect(x, y, w, h, { gray = 0.92 } = {}) {
      requirePage().ops.push(`${gray} g ${fmt(x)} ${fmt(height - y - h)} ${fmt(w)} ${fmt(h)} re f`);
    },

    pageCount() {
      return pages.length;
    },

    /**
     * Serialise to a Buffer. `date` fixes the CreationDate so re-running the
     * archive for the same month produces a byte-identical file — a snapshot
     * that changes on every run is no use as an audit trail.
     */
    toBuffer({ title = "", date = "1970-01-01" } = {}) {
      const objects = []; // 1-based; objects[i] is object number i+1
      const add = (body) => { objects.push(body); return objects.length; };

      // Reserve 1 (catalog) and 2 (pages tree) so page objects can name them.
      const catalogNum = add(null);
      const pagesNum = add(null);
      const fontNums = FONTS.map(([, name]) => add(`<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`));
      const fontRes = FONTS.map(([alias], i) => `/${alias} ${fontNums[i]} 0 R`).join(" ");

      const pageNums = [];
      for (const page of pages) {
        const stream = page.ops.join("\n");
        const streamNum = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
        pageNums.push(add(
          `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${fmt(width)} ${fmt(height)}] ` +
          `/Resources << /Font << ${fontRes} >> >> /Contents ${streamNum} 0 R >>`,
        ));
      }

      objects[catalogNum - 1] = `<< /Type /Catalog /Pages ${pagesNum} 0 R >>`;
      objects[pagesNum - 1] =
        `<< /Type /Pages /Count ${pageNums.length} /Kids [${pageNums.map((n) => `${n} 0 R`).join(" ")}] >>`;

      const infoNum = add(
        `<< /Title ${pdfString(title)} /Producer (PlanMyCashflows archive-pms.mjs) ` +
        `/CreationDate (D:${String(date).replace(/-/g, "")}000000Z) >>`,
      );

      const chunks = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
      let offset = chunks[0].length;
      const offsets = [];
      objects.forEach((body, i) => {
        const buf = Buffer.from(`${i + 1} 0 obj\n${body}\nendobj\n`, "latin1");
        offsets.push(offset);
        offset += buf.length;
        chunks.push(buf);
      });

      const xrefStart = offset;
      let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
      for (const o of offsets) xref += `${String(o).padStart(10, "0")} 00000 n \n`;
      xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogNum} 0 R /Info ${infoNum} 0 R >>\n` +
        `startxref\n${xrefStart}\n%%EOF\n`;
      chunks.push(Buffer.from(xref, "latin1"));

      return Buffer.concat(chunks);
    },
  };
}

/** Trim float noise — PDF operators don't need 15 decimal places. */
function fmt(n) {
  const r = Math.round(Number(n) * 1000) / 1000;
  return Number.isInteger(r) ? String(r) : String(r);
}
