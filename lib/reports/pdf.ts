import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type ReportKpi = { label: string; value: string };
export type ReportColumn = { header: string; width: number; align?: "left" | "right" };
export type ReportTable = {
  title: string;
  columns: ReportColumn[];
  rows: string[][];
  empty?: string;
};
export type ReportPdfInput = {
  title: string;
  subtitle?: string;
  meta?: string;
  kpis?: ReportKpi[];
  tables?: ReportTable[];
};

/** StandardFonts (WinAnsi) can't encode ₦, em-dashes, curly quotes, arrows… */
function safe(s: string): string {
  return String(s ?? "")
    .replace(/[—–]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[•·]/g, "-")
    .replace(/[→]/g, "->")
    .replace(/[^\x00-\xff]/g, "");
}

/** A branded, paginated report PDF: title, KPI grid and tables. */
export async function buildReportPdf(input: ReportPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28;
  const H = 841.89; // A4
  const margin = 48;
  const maxW = W - margin * 2;
  const wine = rgb(0.55, 0.153, 0.263);
  const ink = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.42, 0.42, 0.42);
  const lineCol = rgb(0.88, 0.85, 0.86);

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - margin;

  function newPage() {
    page = doc.addPage([W, H]);
    y = H - margin;
  }
  function ensure(h: number) {
    if (y - h < margin) newPage();
  }
  function fit(text: string, f: PDFFont, size: number, width: number): string {
    let s = safe(text);
    if (f.widthOfTextAtSize(s, size) <= width) return s;
    while (s.length > 1 && f.widthOfTextAtSize(s + "…".replace("…", "..."), size) > width) {
      s = s.slice(0, -1);
    }
    return s + "..";
  }

  // Header
  page.drawText("countribus", { x: margin, y, size: 16, font: bold, color: wine });
  y -= 26;
  page.drawText(safe(input.title), { x: margin, y, size: 20, font: bold, color: ink });
  y -= 18;
  if (input.subtitle) {
    page.drawText(fit(input.subtitle, font, 11, maxW), {
      x: margin,
      y,
      size: 11,
      font,
      color: gray,
    });
    y -= 15;
  }
  if (input.meta) {
    page.drawText(fit(input.meta, font, 9, maxW), { x: margin, y, size: 9, font, color: gray });
    y -= 12;
  }
  y -= 6;
  page.drawLine({
    start: { x: margin, y },
    end: { x: W - margin, y },
    thickness: 1,
    color: lineCol,
  });
  y -= 22;

  // KPI grid (3 per row)
  if (input.kpis && input.kpis.length > 0) {
    const perRow = 3;
    const colW = maxW / perRow;
    for (let i = 0; i < input.kpis.length; i += perRow) {
      ensure(46);
      const rowY = y;
      for (let c = 0; c < perRow; c++) {
        const k = input.kpis[i + c];
        if (!k) continue;
        const x = margin + c * colW;
        page.drawText(fit(k.label.toUpperCase(), font, 8, colW - 10), {
          x,
          y: rowY,
          size: 8,
          font,
          color: gray,
        });
        page.drawText(fit(k.value, bold, 15, colW - 10), {
          x,
          y: rowY - 18,
          size: 15,
          font: bold,
          color: ink,
        });
      }
      y -= 46;
    }
    y -= 6;
  }

  // Tables
  for (const t of input.tables ?? []) {
    ensure(40);
    page.drawText(safe(t.title), { x: margin, y, size: 12, font: bold, color: ink });
    y -= 16;

    const xs = t.columns.map((_, idx) => {
      let off = 0;
      for (let j = 0; j < idx; j++) off += t.columns[j].width * maxW;
      return margin + off;
    });
    const widths = t.columns.map((c) => c.width * maxW);

    function drawRow(cells: string[], f: PDFFont, size: number, color = ink) {
      t.columns.forEach((col, idx) => {
        const text = fit(cells[idx] ?? "", f, size, widths[idx] - 6);
        const w = f.widthOfTextAtSize(text, size);
        const x = col.align === "right" ? xs[idx] + widths[idx] - 6 - w : xs[idx];
        page.drawText(text, { x, y, size, font: f, color });
      });
    }

    // Header row
    ensure(18);
    drawRow(
      t.columns.map((c) => c.header),
      bold,
      9,
      gray,
    );
    y -= 4;
    page.drawLine({
      start: { x: margin, y },
      end: { x: W - margin, y },
      thickness: 0.75,
      color: lineCol,
    });
    y -= 13;

    if (t.rows.length === 0) {
      page.drawText(safe(t.empty ?? "No data."), { x: margin, y, size: 10, font, color: gray });
      y -= 16;
    } else {
      for (const row of t.rows) {
        ensure(15);
        if (y === H - margin) {
          // fresh page: repeat the table header
          drawRow(
            t.columns.map((c) => c.header),
            bold,
            9,
            gray,
          );
          y -= 4;
          page.drawLine({
            start: { x: margin, y },
            end: { x: W - margin, y },
            thickness: 0.75,
            color: lineCol,
          });
          y -= 13;
        }
        drawRow(row, font, 10);
        y -= 15;
      }
    }
    y -= 14;
  }

  return doc.save();
}
