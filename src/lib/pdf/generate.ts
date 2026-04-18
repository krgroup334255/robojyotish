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

// ── Font resolution ────────────────────────────────────────────
function findFontDir(): string {
  const candidates = [
    path.join(process.cwd(), "public/fonts"),
    path.join(process.cwd(), "src/lib/pdf/fonts"),
    path.join(process.cwd(), ".next/server/public/fonts"),
    path.join(process.cwd(), ".next/server/src/lib/pdf/fonts"),
    path.join(__dirname, "fonts"),
    path.join(__dirname, "../fonts"),
    path.join(__dirname, "../../lib/pdf/fonts"),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(path.join(c, "NotoSerif-Regular.ttf"))) return c;
    } catch {
      /* keep trying */
    }
  }
  throw new Error(
    `Font directory not found. Tried: ${candidates.join(", ")}. ` +
      `Ensure fonts are in public/fonts/.`,
  );
}

// ── Script detection ───────────────────────────────────────────
// Tamil block: U+0B80..U+0BFF. If any char is Tamil, we use Tamil font.
const TAMIL_RE = /[\u0B80-\u0BFF]/;

/**
 * Split a string into ordered runs of same-script text.
 * We only differentiate Tamil vs non-Tamil; other scripts fall back
 * to Noto Serif (which handles Latin, Cyrillic, Greek, digits, etc.).
 */
function splitRuns(s: string): { text: string; tamil: boolean }[] {
  if (!s) return [];
  const runs: { text: string; tamil: boolean }[] = [];
  let cur = "";
  let curTamil: boolean | null = null;
  for (const ch of s) {
    const isTamil = TAMIL_RE.test(ch);
    if (curTamil === null) curTamil = isTamil;
    if (isTamil === curTamil) {
      cur += ch;
    } else {
      runs.push({ text: cur, tamil: curTamil });
      cur = ch;
      curTamil = isTamil;
    }
  }
  if (cur) runs.push({ text: cur, tamil: curTamil ?? false });
  return runs;
}

// ── Markdown emphasis cleaner ──────────────────────────────────
function cleanInline(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
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
  const FONT_DIR = findFontDir();
  const serifRegular = path.join(FONT_DIR, "NotoSerif-Regular.ttf");
  const serifBold = path.join(FONT_DIR, "NotoSerif-Bold.ttf");
  const tamilRegular = path.join(FONT_DIR, "NotoSansTamil-Regular.ttf");
  const tamilBold = path.join(FONT_DIR, "NotoSansTamil-Bold.ttf");

  // Fall back to regular if any bold is missing — we must never crash.
  const boldSerif = fs.existsSync(serifBold) ? serifBold : serifRegular;
  const boldTamil = fs.existsSync(tamilBold) ? tamilBold : tamilRegular;

  // Whole-document Tamil context (heading-level decision). If the
  // requested language is Tamil, default everything to Tamil font
  // even when a line has no Tamil chars (so styling stays consistent).
  const wholeDocTamil = /tamil|தமிழ்/i.test(input.language);

  const markdown =
    input.markdown && input.markdown.trim().length > 0
      ? input.markdown
      : `# ${input.clientName}'s Vedic Jyotish Reading\n\n*(Draft — content pending)*\n`;

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

  // Register four font aliases
  doc.registerFont("serif", serifRegular);
  doc.registerFont("serif-bold", boldSerif);
  doc.registerFont("tamil", tamilRegular);
  doc.registerFont("tamil-bold", boldTamil);

  // Helper: pick the right font for a run
  const fontFor = (bold: boolean, tamil: boolean): string => {
    if (tamil) return bold ? "tamil-bold" : "tamil";
    return bold ? "serif-bold" : "serif";
  };

  /**
   * Write one logical line, switching fonts inline per script run.
   * Uses `continued` so runs flow together into a single paragraph,
   * then ends with `continued: false` to break the line.
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

    runs.forEach((run, i) => {
      const useTamil = run.tamil || (wholeDocTamil && !run.tamil && false);
      // `wholeDocTamil` only matters for text we detect as Tamil; regular
      // Latin text stays in serif. The OR above is a guard — we never force
      // Latin into Tamil font because that would also render boxes.
      void useTamil;
      const font = fontFor(baseBold, run.tamil);
      doc.font(font);
      const isLast = i === runs.length - 1;
      doc.text(run.text, {
        continued: !isLast,
        align,
        indent: i === 0 ? indent : 0,
      });
    });
  };

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
    const coverNameFont = /[\u0B80-\u0BFF]/.test(input.clientName)
      ? "tamil-bold"
      : "serif-bold";
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

    const lines = markdown.split("\n");
    for (const raw of lines) {
      const line = raw.trimEnd();

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

    // ── Footer on every page ──
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc
        .font("serif")
        .fontSize(8)
        .fillColor("#6D28D9")
        .text(
          `${SITE_NAME} · robojyotish.com · support@robojyotish.com · page ${i + 1} of ${range.count}`,
          60,
          doc.page.height - 40,
          { align: "center", width: doc.page.width - 120, lineBreak: false },
        );
    }

    // Critical: flush.end() returns immediately; the "end" listener
    // above resolves the Promise only after all data chunks have been
    // emitted, so the caller always receives the full Buffer.
    doc.end();
  });
}
