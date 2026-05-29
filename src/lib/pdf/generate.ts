/**
 * RoboJyotish PDF generator
 * -------------------------------------------------------------
 * Converts AI-generated Markdown into a typeset A4 PDF.
 *
 * Key design points:
 * 1. Mixed-script support — English readings often contain Tamil
 *    terms (e.g. "Mithunam / மிதுனம் / Gemini"). We register BOTH
 *    Noto Serif (Latin) and Noto Sans Tamil, and switch fonts on
 *    a per-run basis inside each line so every glyph renders.
 * 2. Flush-safe — uses bufferPages so the footer pass runs before
 *    doc.end(), avoiding last-page truncation.
 * 3. Font path resilient — searches both public/fonts (preferred)
 *    and src/lib/pdf/fonts (dev fallback).
 */

import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { SITE_NAME } from "@/lib/utils";

// ── Font loading ────────────────────────────────────────────────
// Read font files into Buffer at call time, searching multiple candidate
// directories. Passing a Buffer (not a file path) to PDFKit's registerFont
// is the only approach that works reliably on Vercel serverless lambdas,
// because the filesystem layout inside a lambda differs from process.cwd().
function loadFont(filename: string): Buffer {
  const candidates = [
    path.join(process.cwd(), "public/fonts", filename),
    path.join(process.cwd(), "src/lib/pdf/fonts", filename),
    path.join(__dirname, "fonts", filename),
    path.join(__dirname, "../fonts", filename),
    path.join(__dirname, "../../lib/pdf/fonts", filename),
    path.join(__dirname, "../../public/fonts", filename),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return fs.readFileSync(c);
    } catch {
      /* keep trying */
    }
  }
  throw new Error(
    `Font file not found: ${filename}. Tried: ${candidates.join(", ")}`,
  );
}

// ── Script detection ───────────────────────────────────────────
// Tamil block: U+0B80..U+0BFF
const TAMIL_RE = /[\u0B80-\u0BFF]/;
// Devanagari block: U+0900..U+097F (Sanskrit mantras, ॐ, etc.)
const DEVA_RE = /[\u0900-\u097F]/;

type ScriptRun = { text: string; script: "latin" | "tamil" | "devanagari" };

/**
 * Split a string into ordered runs of same-script text.
 * Differentiates Tamil, Devanagari (Sanskrit), and Latin/other.
 */
function splitRuns(s: string): ScriptRun[] {
  if (!s) return [];
  const runs: ScriptRun[] = [];
  let cur = "";
  let curScript: ScriptRun["script"] | null = null;

  const scriptOf = (ch: string): ScriptRun["script"] => {
    if (TAMIL_RE.test(ch)) return "tamil";
    if (DEVA_RE.test(ch)) return "devanagari";
    return "latin";
  };

  for (const ch of s) {
    const sc = scriptOf(ch);
    if (curScript === null) curScript = sc;
    if (sc === curScript) {
      cur += ch;
    } else {
      runs.push({ text: cur, script: curScript });
      cur = ch;
      curScript = sc;
    }
  }
  if (cur) runs.push({ text: cur, script: curScript ?? "latin" });
  return runs;
}

// ── Markdown emphasis cleaner ──────────────────────────────────
function cleanInline(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
}

// ── Markdown table detection ────────────────────────────────────
/** Returns true if the line is a markdown table separator (|---|---|). */
function isTableSeparator(line: string): boolean {
  return /^\|[\s\-:|]+\|/.test(line);
}

/** Returns true if the line starts with | (beginning of a table row). */
function isTableRowStart(line: string): boolean {
  return line.trim().startsWith("|");
}

/** Parse a complete table row string into cell strings. */
function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => cleanInline(c.trim()));
}

/**
 * Fix markdown table lines before grouping.
 *
 * Problems we must handle (all observed in real Claude output):
 *  A) Blank lines or "---" stray HR lines between table rows.
 *  B) A data row word-wrapped mid-cell across multiple lines
 *     (the open row starts with | but the continuation line may
 *      NOT start with |, e.g. Tamil text spilling onto a new line).
 *  C) A row that starts with | but has no closing | on the same line
 *     AND is followed by a blank line before the continuation.
 *
 * Strategy: single forward pass tracking whether we are "inside a table".
 * We enter a table on the first `|`-starting or separator line.
 * We exit a table only when we encounter a non-blank, non-HR line that
 * is neither a table row nor a separator AND we have no open pending row.
 * While inside a table, blanks and HR lines are silently dropped.
 * Pending (unclosed) rows accumulate until they end with `|`.
 */
function fixTableLines(rawLines: string[]): string[] {
  const HR_RE = /^[-*]{3,}$/;
  const result: string[] = [];
  let pending = "";      // open table row being assembled
  let inTable = false;   // are we currently inside a table block?

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trimEnd();
    const isBlankOrHr = line === "" || HR_RE.test(line);
    const isTableLine = isTableRowStart(line) || isTableSeparator(line);

    // If we have an open row being assembled, look ahead to see if the
    // table is about to end (next non-blank line is not a table line).
    // If so, close the pending row now regardless.
    if (pending) {
      if (isBlankOrHr) {
        // Peek ahead: is the next non-blank line still a table line?
        let j = i + 1;
        while (j < rawLines.length && (rawLines[j].trimEnd() === "" || HR_RE.test(rawLines[j].trimEnd()))) j++;
        const nextReal = rawLines[j]?.trimEnd() ?? "";
        const nextIsTable = isTableRowStart(nextReal) || isTableSeparator(nextReal);
        if (!nextIsTable) {
          // Table ended — flush whatever we have and exit
          result.push(pending.trim());
          pending = "";
          inTable = false;
        }
        // Either way, skip the blank/HR line itself
        continue;
      }
      // Non-blank line while row is open: append to it
      pending += " " + line.trim();
      if (pending.trimEnd().endsWith("|")) {
        result.push(pending.trim());
        pending = "";
      }
      // pending stays open if still no closing |
      continue;
    }

    if (isTableLine) {
      inTable = true;
      if (line.trimEnd().endsWith("|")) {
        result.push(line);
      } else {
        pending = line; // open a new pending row
      }
      continue;
    }

    // Not a table line and no open row
    if (inTable && isBlankOrHr) {
      // We're inside a table — peek ahead to see if the table continues
      let j = i + 1;
      while (j < rawLines.length && (rawLines[j].trimEnd() === "" || HR_RE.test(rawLines[j].trimEnd()))) j++;
      const nextReal = rawLines[j]?.trimEnd() ?? "";
      const nextIsTable = isTableRowStart(nextReal) || isTableSeparator(nextReal);
      if (nextIsTable) {
        // Table continues — drop this blank/HR
        continue;
      } else {
        // Table ended
        inTable = false;
        result.push(line); // emit the blank as a paragraph separator
        continue;
      }
    }

    // Regular non-table line
    inTable = false;
    result.push(line);
  }

  // Flush any residual open row
  if (pending) result.push(pending.trim());
  return result;
}

/**
 * Measure the rendered height of a string in a given column width.
 * Uses PDFKit's heightOfString which respects word-wrap.
 */
function cellHeight(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  fontName: string,
  fontSize: number,
  colWidth: number,
  padding: number,
): number {
  doc.font(fontName).fontSize(fontSize);
  const h = doc.heightOfString(text, { width: colWidth - padding * 2 });
  return h + padding * 2;
}

/**
 * Render a markdown table (header row + separator + data rows) onto the PDF.
 * Rows expand dynamically to fit multi-line cell content.
 */
function renderTable(
  doc: InstanceType<typeof PDFDocument>,
  rows: string[][],
  fontFor: (bold: boolean, script: ScriptRun["script"]) => string,
): void {
  if (rows.length === 0) return;

  const PAGE_LEFT = doc.page.margins.left;
  const PAGE_RIGHT = doc.page.width - doc.page.margins.right;
  const PAGE_BOTTOM = doc.page.height - doc.page.margins.bottom;
  const tableWidth = PAGE_RIGHT - PAGE_LEFT;
  const colCount = rows[0].length;

  // Give last column more space when there are 4+ columns (it usually holds
  // longer descriptive text like "Character for This Native").
  let colWidths: number[];
  if (colCount === 6) {
    // Planetary positions: Planet | Rasi | Degree | Nakshatra | House | Retro
    // Give Planet and Nakshatra a bit more room; Degree/House/Retro are narrow
    const unit = tableWidth / 18;
    colWidths = [unit * 4, unit * 4, unit * 2, unit * 4, unit * 2, unit * 2];
  } else if (colCount === 4) {
    // Dasha: Mahadasha Lord | Start | End | Character description
    const unit = tableWidth / 14;
    colWidths = [unit * 3, unit * 2, unit * 2, unit * 7];
  } else {
    // Equal columns for everything else
    const w = tableWidth / colCount;
    colWidths = Array(colCount).fill(w);
  }

  const FONT_SIZE = 8.5;
  const PADDING = 4;
  const MIN_ROW_HEIGHT = 16;

  // Colour palette
  const HEADER_BG = "#4C1D95";
  const HEADER_FG = "#FFFFFF";
  const ROW_ALT_BG = "#F5F3FF";
  const ROW_BG = "#FFFFFF";
  const BORDER = "#C4B5FD";
  const TEXT_COLOR = "#1E1B4B";

  // ── Pre-calculate row heights ──
  const cellScript = (cell: string): ScriptRun["script"] =>
    TAMIL_RE.test(cell) ? "tamil" : DEVA_RE.test(cell) ? "devanagari" : "latin";

  const rowHeights: number[] = rows.map((row, ri) => {
    const isBold = ri === 0;
    let maxH = MIN_ROW_HEIGHT;
    row.forEach((cell, ci) => {
      const fn = fontFor(isBold, cellScript(cell));
      const h = cellHeight(doc, cell, fn, FONT_SIZE, colWidths[ci] ?? (tableWidth / colCount), PADDING);
      if (h > maxH) maxH = h;
    });
    return maxH;
  });

  // ── Page-break helper: start table or continue on new page ──
  const startX = PAGE_LEFT;

  function drawRow(
    rowIndex: number,
    y: number,
    isHeader: boolean,
  ): number {
    const row = rows[rowIndex];
    const rowH = rowHeights[rowIndex];
    const bg = isHeader ? HEADER_BG : rowIndex % 2 === 1 ? ROW_BG : ROW_ALT_BG;

    doc.fillColor(bg).rect(startX, y, tableWidth, rowH).fill();

    row.forEach((cell, ci) => {
      const cx = startX + colWidths.slice(0, ci).reduce((a, b) => a + b, 0);
      const cw = colWidths[ci] ?? (tableWidth / colCount);
      doc
        .fillColor(isHeader ? HEADER_FG : TEXT_COLOR)
        .fontSize(FONT_SIZE)
        .font(fontFor(isHeader, cellScript(cell)))
        .text(cell, cx + PADDING, y + PADDING, {
          width: cw - PADDING * 2,
          align: "left",
        });
    });

    doc
      .strokeColor(BORDER)
      .lineWidth(isHeader ? 0.5 : 0.3)
      .rect(startX, y, tableWidth, rowH)
      .stroke();

    return y + rowH;
  }

  let curY = doc.y;

  // Check space for header + first data row before starting
  const headerAndFirstRowH = rowHeights[0] + (rowHeights[1] ?? 0);
  if (curY + headerAndFirstRowH > PAGE_BOTTOM) {
    doc.addPage();
    curY = doc.y;
  }

  // Draw header
  curY = drawRow(0, curY, true);

  // Draw data rows; page-break if needed (re-draw header on new page)
  for (let ri = 1; ri < rows.length; ri++) {
    if (curY + rowHeights[ri] > PAGE_BOTTOM) {
      doc.addPage();
      curY = doc.y;
      // Re-draw header on continuation page
      curY = drawRow(0, curY, true);
    }
    curY = drawRow(ri, curY, false);
  }

  doc.y = curY + 6;
  doc.x = PAGE_LEFT;
}

// ── Public API ─────────────────────────────────────────────────
interface PdfInput {
  markdown: string;
  clientName: string;
  language: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
}

export async function renderReadingPdf(input: PdfInput): Promise<Buffer> {
  // Load fonts as Buffers — works on Vercel lambdas where file paths
  // relative to process.cwd() are unreliable for externally-bundled modules.
  const serifRegularBuf = loadFont("NotoSerif-Regular.ttf");
  const serifBoldBuf = (() => { try { return loadFont("NotoSerif-Bold.ttf"); } catch { return serifRegularBuf; } })();
  const tamilRegularBuf = loadFont("NotoSansTamil-Regular.ttf");
  const tamilBoldBuf = (() => { try { return loadFont("NotoSansTamil-Bold.ttf"); } catch { return tamilRegularBuf; } })();
  const devanagariRegularBuf = (() => { try { return loadFont("NotoSansDevanagari-Regular.ttf"); } catch { return null; } })();

  // Whole-document Tamil context (heading-level decision). If the
  // requested language is Tamil, default everything to Tamil font
  // even when a line has no Tamil chars (so styling stays consistent).
  const wholeDocTamil = /tamil|தமிழ்/i.test(input.language);

  // Normalise markdown: collapse runs of blank lines, strip trailing blanks.
  // Prevents Claude's occasional multi-newline gaps from silently generating
  // empty pages at the tail of the document.
  const rawMd =
    input.markdown && input.markdown.trim().length > 0
      ? input.markdown
      : `# ${input.clientName}'s Vedic Jyotish Reading\n\n*(Draft — content pending)*\n`;
  const markdown = rawMd
    .replace(/\r\n/g, "\n")          // normalise Windows line endings
    .replace(/\n{3,}/g, "\n\n")       // at most ONE blank line between blocks
    .replace(/[ \t]+\n/g, "\n")       // strip trailing spaces on each line
    .replace(/\n+$/, "");             // strip trailing blank lines entirely

  // 60pt top/side margins, 80pt bottom to reserve room for the footer.
  const MARGIN = { top: 60, left: 60, right: 60, bottom: 80 };

  const doc = new PDFDocument({
    size: "A4",
    bufferPages: true,
    margins: MARGIN,
    info: {
      Title: `${input.clientName} — Jyotish Reading`,
      Author: SITE_NAME,
      Subject: "AI Vedic Astrology Reading",
    },
  });

  // ── Register fonts (pass Buffer — not path — for Vercel lambda compat) ──
  const hasDevanagari = devanagariRegularBuf !== null;

  doc.registerFont("serif", serifRegularBuf);
  doc.registerFont("serif-bold", serifBoldBuf);
  doc.registerFont("tamil", tamilRegularBuf);
  doc.registerFont("tamil-bold", tamilBoldBuf);
  if (hasDevanagari) doc.registerFont("devanagari", devanagariRegularBuf!);

  // Helper: pick the right font for a script run
  const fontFor = (bold: boolean, script: ScriptRun["script"]): string => {
    if (script === "tamil") return bold ? "tamil-bold" : "tamil";
    if (script === "devanagari") return hasDevanagari ? "devanagari" : "serif";
    return bold ? "serif-bold" : "serif";
  };

  /**
   * Write one logical line, switching fonts inline per script run.
   * Handles Latin, Tamil, and Devanagari (Sanskrit mantras, ॐ, etc.).
   */
  const writeMixed = (
    text: string,
    opts: {
      bold?: boolean;
      size?: number;
      color?: string;
      indent?: number;
      align?: "left" | "right" | "center" | "justify";
    } = {},
  ) => {
    const runs = splitRuns(text);
    if (runs.length === 0) return;

    const baseBold = opts.bold ?? false;
    const size = opts.size ?? 11;
    const color = opts.color ?? "#1E1B4B";
    const align = opts.align ?? "justify";
    const indent = opts.indent ?? 0;

    doc.fillColor(color).fontSize(size);

    // Fast path: single script → one doc.text() call
    if (runs.length === 1) {
      doc.font(fontFor(baseBold, runs[0].script));
      doc.text(runs[0].text, { align, indent });
      return;
    }

    // Mixed script: emit runs with `continued` so they flow on one line
    runs.forEach((run, i) => {
      doc.font(fontFor(baseBold, run.script));
      const isLast = i === runs.length - 1;
      doc.text(run.text, {
        continued: !isLast,
        align,
        indent: i === 0 ? indent : 0,
      });
    });
  };

  void wholeDocTamil; // reserved for future heading-level Tamil styling

  // ── Render ───────────────────────────────────────────────────
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Cover page ──
    doc
      .fillColor("#4C1D95")
      .rect(0, 0, doc.page.width, doc.page.height)
      .fill();

    doc.fillColor("#F97316").font("serif-bold").fontSize(42).text(
      SITE_NAME,
      60,
      120,
      { align: "center" },
    );
    doc.fillColor("#FFFFFF").font("serif").fontSize(14).text(
      "AI Vedic Astrology Reading",
      { align: "center" },
    );

    doc.moveDown(6);
    const coverNameFont = TAMIL_RE.test(input.clientName) ? "tamil-bold" : "serif-bold";
    doc.fillColor("#FDE68A").font(coverNameFont).fontSize(28).text(
      input.clientName,
      { align: "center" },
    );
    doc
      .fillColor("#FFFFFF")
      .font("serif")
      .fontSize(12)
      .text(
        `${input.birthDate}  ·  ${input.birthTime}\n${input.birthPlace}`,
        { align: "center" },
      );

    doc.moveDown(6);
    doc
      .fillColor("#F5F3FF")
      .fontSize(10)
      .font("serif")
      .text(
        `Generated by ${SITE_NAME} · Swiss Ephemeris (Lahiri) + Anthropic Claude AI\n` +
          `For guidance only. Review by certified astrologer.`,
        { align: "center" },
      );

    // ── Body pages ──
    doc.addPage({ size: "A4", margins: MARGIN });
    doc.fillColor("#1E1B4B").font("serif").fontSize(11);

    // Pre-process lines:
    // 1. Join wrapped table rows (Claude sometimes word-wraps inside a pipe row)
    // 2. Group consecutive table lines into table blocks
    // Each element is either a string (normal line) or string[][] (table rows).
    type LineOrTable = string | string[][];
    const lineOrTableBlocks: LineOrTable[] = [];
    const rawLines = fixTableLines(markdown.split("\n"));
    let i = 0;
    while (i < rawLines.length) {
      const raw = rawLines[i].trimEnd();
      if (isTableRowStart(raw) || isTableSeparator(raw)) {
        // Collect all consecutive table-related lines
        const tableLines: string[] = [];
        while (
          i < rawLines.length &&
          (isTableRowStart(rawLines[i].trimEnd()) || isTableSeparator(rawLines[i].trimEnd()))
        ) {
          tableLines.push(rawLines[i].trimEnd());
          i++;
        }
        // Parse: first row = header, second row = separator (skip), rest = data
        const parsedRows: string[][] = tableLines
          .filter((l) => !isTableSeparator(l))
          .map(parseTableRow);
        if (parsedRows.length > 0) {
          lineOrTableBlocks.push(parsedRows);
        }
      } else {
        lineOrTableBlocks.push(raw);
        i++;
      }
    }

    for (const block of lineOrTableBlocks) {
      // ── Table block ──
      if (Array.isArray(block)) {
        doc.moveDown(0.5);
        renderTable(doc, block as string[][], fontFor);
        doc.moveDown(0.5);
        continue;
      }

      const line = block as string;

      if (line.startsWith("# ")) {
        if (doc.y > 100) doc.addPage();
        doc.moveDown(0.5);
        writeMixed(line.slice(2), {
          bold: true,
          size: 22,
          color: "#7C2D12",
          align: "left",
        });
        doc.moveDown(0.3);
      } else if (line.startsWith("## ")) {
        doc.moveDown(0.8);
        writeMixed(line.slice(3), {
          bold: true,
          size: 15,
          color: "#EA580C",
          align: "left",
        });
        doc.moveDown(0.2);
      } else if (line.startsWith("### ")) {
        doc.moveDown(0.4);
        writeMixed(line.slice(4), {
          bold: true,
          size: 12,
          color: "#6D28D9",
          align: "left",
        });
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        writeMixed(`•  ${line.slice(2)}`, {
          indent: 20,
          align: "justify",
        });
      } else if (line === "") {
        doc.moveDown(0.5);
      } else {
        writeMixed(cleanInline(line), { align: "justify" });
      }
    }

    // ── Footers ──
    // We flush pending pages FIRST so bufferedPageRange() reflects the true
    // page count. Then iterate through every page and stamp a footer showing
    // "page N of TOTAL". Without the flushPages() call, the last textual
    // content can end up on pages that don't yet exist in the buffered range,
    // producing phantom "blank" pages at the tail.
    doc.flushPages();
    const range = doc.bufferedPageRange();
    const total = range.count;
    for (let i = 0; i < total; i++) {
      doc.switchToPage(range.start + i);

      // Save & restore cursor so switchToPage doesn't push the body
      // text flow into a weird position on re-flush.
      const footerY = doc.page.height - 40;

      doc
        .font("serif")
        .fontSize(8)
        .fillColor("#6D28D9")
        .text(
          `${SITE_NAME} · robojyotish.com · support@robojyotish.com · page ${i + 1} of ${total}`,
          60,
          footerY,
          { align: "center", width: doc.page.width - 120, lineBreak: false },
        );
    }

    // doc.end() triggers the "end" event on the stream after all buffered
    // chunks are emitted. Our Promise resolves with the full concatenated Buffer.
    doc.end();
  });
}
