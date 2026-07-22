/**
 * OCR path for the unlisted-shares price importer.
 *
 * The partner's daily PDF is sometimes a designed export with ALL text drawn
 * as vector outlines (zero fonts) — text extraction finds nothing. This
 * module renders each page to a PNG (pdf-parse + @napi-rs/canvas) and OCRs it
 * with tesseract.js (fully offline: language data ships via
 * @tesseract.js-data/eng), then classifies each OCR line into a data row
 * with classifyOcrLine().
 *
 * CONFIDENTIALITY: the dealer-price column is excluded by x-coordinate band
 * inside classifyOcrLine — dealer tokens are never read into a row, logged,
 * or printed. See unlisted-matching.mjs.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { classifyOcrLine, findOcrHeaderDate } from "./unlisted-matching.mjs";

const require = createRequire(import.meta.url);

/** Render each PDF page and OCR it into rows.
 *  Returns { rows, skipped, headerDateRaw, pages }. */
export async function ocrPriceListPdf(filePath, { scale = 2, log = () => {} } = {}) {
  let PDFParse, createWorker, OEM;
  try {
    ({ PDFParse } = await import("pdf-parse"));
    ({ createWorker, OEM } = await import("tesseract.js"));
    require.resolve("@napi-rs/canvas"); // page rendering needs a node canvas
  } catch {
    throw new Error(
      "OCR mode needs pdf-parse, tesseract.js, @tesseract.js-data/eng and @napi-rs/canvas.\n" +
      "They're in devDependencies — run: npm install",
    );
  }
  const langDir = require.resolve("@tesseract.js-data/eng/package.json").replace(/package\.json$/, "4.0.0");

  const parser = new PDFParse({ data: readFileSync(filePath) });
  let shots;
  try {
    shots = await parser.getScreenshot({ scale });
  } finally {
    await parser.destroy();
  }

  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    langPath: langDir,
    gzip: true,
    cacheMethod: "none",
  });

  const rows = [];
  const skipped = [];
  let headerDateRaw = null;
  try {
    for (const [i, page] of shots.pages.entries()) {
      const buf = page.nodeBuffer ?? (page.dataUrl ? Buffer.from(page.dataUrl.split(",")[1], "base64") : null);
      if (!buf) continue;
      const pageWidth = (page.width ?? 612 * scale);
      const { data } = await worker.recognize(buf, {}, { blocks: true, text: true });
      if (!headerDateRaw && data.text) headerDateRaw = findOcrHeaderDate(data.text);

      let pageRows = 0;
      for (const block of data.blocks ?? []) {
        for (const para of block.paragraphs ?? []) {
          for (const line of para.lines ?? []) {
            const words = line.words.map((w) => ({
              text: w.text,
              x0: w.bbox.x0,
              x1: w.bbox.x1,
              // Per-symbol boxes let classifyOcrLine correct the ₹-glyph
              // misread geometrically (see retailFromSymbols).
              symbols: (w.symbols ?? []).map((s) => ({ text: s.text, x0: s.bbox.x0, x1: s.bbox.x1 })),
            }));
            const parsed = classifyOcrLine(words, pageWidth);
            if (!parsed) continue;
            if (parsed.error) {
              // parsed.context is redacted to the name+retail zone — it can
              // never contain the dealer column.
              skipped.push({ line: `page ${i + 1}: ${parsed.context ?? ""}`, reason: parsed.error });
              continue;
            }
            rows.push(parsed);
            pageRows++;
          }
        }
      }
      log(`  page ${i + 1}/${shots.pages.length}: ${pageRows} rows`);
    }
  } finally {
    await worker.terminate();
  }

  return { rows, skipped, headerDateRaw, pages: shots.pages.length };
}
