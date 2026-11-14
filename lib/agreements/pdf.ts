import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type AgreementParty = {
  role: string;
  name: string;
  signedAt: string | null;
  signature: string | null; // PNG data URL
};

export type AgreementPdfInput = {
  title: string;
  versionLabel: string;
  clauses: { title: string; body: string }[];
  parties: AgreementParty[];
};

/** WinAnsi-safe: StandardFonts can't encode em-dashes, curly quotes, etc. */
function safe(s: string): string {
  return s
    .replace(/[—–]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[•·]/g, "-")
    .replace(/[^\x00-\xff]/g, "");
}

function pngBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

export async function buildAgreementPdf(input: AgreementPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28;
  const H = 841.89; // A4
  const margin = 56;
  const maxW = W - margin * 2;
  const wine = rgb(0.55, 0.153, 0.263);
  const ink = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.42, 0.42, 0.42);
  const bodyColor = rgb(0.22, 0.22, 0.22);

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - margin;

  function newPage() {
    page = doc.addPage([W, H]);
    y = H - margin;
  }
  function wrap(text: string, f: PDFFont, size: number): string[] {
    const lines: string[] = [];
    for (const raw of text.split("\n")) {
      const words = raw.split(/\s+/).filter(Boolean);
      let line = "";
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (f.widthOfTextAtSize(safe(test), size) > maxW && line) {
          lines.push(line);
          line = w;
        } else line = test;
      }
      lines.push(line);
    }
    return lines;
  }
  function para(text: string, f: PDFFont, size: number, color = bodyColor, gap = 4) {
    for (const line of wrap(text, f, size)) {
      if (y - (size + gap) < margin) newPage();
      page.drawText(safe(line), { x: margin, y: y - size, size, font: f, color });
      y -= size + gap;
    }
  }

  // Header
  page.drawText("countribus", { x: margin, y: y - 16, size: 17, font: bold, color: wine });
  y -= 30;
  para(input.title, bold, 19, ink, 6);
  para(input.versionLabel, font, 10, gray, 10);
  y -= 6;

  // Clauses
  input.clauses.forEach((c, i) => {
    if (y < margin + 48) newPage();
    para(`${i + 1}. ${c.title}`, bold, 12, ink, 6);
    for (const p of c.body.split(/\n{2,}/)) {
      if (p.trim()) {
        para(p.trim(), font, 10.5, bodyColor, 4);
        y -= 3;
      }
    }
    y -= 8;
  });

  // Signatures — keep the block together.
  if (y < margin + 170) newPage();
  y -= 8;
  para("Signatures", bold, 12, ink, 10);
  const blockTop = y;
  const colW = (maxW - 24) / 2;

  for (let idx = 0; idx < input.parties.length; idx++) {
    const party = input.parties[idx];
    const x = margin + idx * (colW + 24);
    let by = blockTop;
    if (party.signature) {
      try {
        const img = await doc.embedPng(pngBytes(party.signature));
        const scale = Math.min(colW / img.width, 46 / img.height);
        page.drawImage(img, {
          x,
          y: by - img.height * scale,
          width: img.width * scale,
          height: img.height * scale,
        });
      } catch {
        /* skip bad image */
      }
    }
    by -= 52;
    page.drawLine({
      start: { x, y: by },
      end: { x: x + colW, y: by },
      thickness: 0.8,
      color: gray,
    });
    by -= 14;
    page.drawText(safe(party.role), { x, y: by, size: 9, font: bold, color: gray });
    by -= 14;
    page.drawText(safe(party.name || "—"), { x, y: by, size: 11, font, color: ink });
    by -= 14;
    page.drawText(party.signedAt ? `Signed ${safe(party.signedAt)}` : "Not yet signed", {
      x,
      y: by,
      size: 9,
      font,
      color: gray,
    });
  }

  return doc.save();
}
