// Port of app/strategy.py's build_playbook_pdf() - reportlab is Python-only, so this uses
// pdf-lib (loaded from jsdelivr, same pattern as supabase-js) with manual text wrapping and
// pagination instead of reportlab's automatic paragraph flow. Same structure: title, generated
// note, one heading+body per rule (red [CHANGED date] tag if changed since the seed), then a
// change-log table.
import { PDFDocument, StandardFonts, rgb } from 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm';

const PAGE_W = 612, PAGE_H = 792; // US Letter, points
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

function wrapText(text, font, size, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? line + ' ' + w : w;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

class Writer {
  constructor(doc, fonts) {
    this.doc = doc;
    this.fonts = fonts;
    this.page = doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }
  ensure(height) {
    if (this.y - height < MARGIN) {
      this.page = this.doc.addPage([PAGE_W, PAGE_H]);
      this.y = PAGE_H - MARGIN;
    }
  }
  text(str, { x = MARGIN, size = 10, font = this.fonts.regular, color = rgb(0, 0, 0), gap = 4 } = {}) {
    this.ensure(size + gap);
    this.page.drawText(str, { x, y: this.y - size, size, font, color });
    this.y -= size + gap;
  }
  paragraph(str, { size = 10, font = this.fonts.regular, color = rgb(0, 0, 0), maxWidth = CONTENT_W, lineGap = 3, x = MARGIN } = {}) {
    const lines = wrapText(str, font, size, maxWidth);
    for (const line of lines) {
      this.ensure(size + lineGap);
      this.page.drawText(line, { x, y: this.y - size, size, font, color });
      this.y -= size + lineGap;
    }
  }
  space(h) { this.y -= h; }
  // Two text runs on the same line (label, then an optional red tag after it).
  labelWithTag(label, tag) {
    const size = 13, font = this.fonts.bold;
    this.ensure(size + 6);
    this.page.drawText(label, { x: MARGIN, y: this.y - size, size, font, color: rgb(0, 0, 0) });
    if (tag) {
      const labelW = font.widthOfTextAtSize(label, size);
      this.page.drawText('  ' + tag, { x: MARGIN + labelW, y: this.y - size, size, font, color: rgb(0.8, 0, 0) });
    }
    this.y -= size + 6;
  }
}

export async function buildPlaybookPdf(orderedRules, logRows, effectiveByKey, seedDate) {
  const doc = await PDFDocument.create();
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const w = new Writer(doc, fonts);

  w.text('Scalp Strategy Playbook', { size: 20, font: fonts.bold, gap: 6 });
  w.text(`Generated ${new Date().toISOString().slice(0, 10)} - live from the app, not a dated snapshot.`, { size: 10, color: rgb(0.35, 0.4, 0.47) });
  w.space(16);

  for (const [ruleKey, label, text] of orderedRules) {
    const changed = effectiveByKey[ruleKey];
    const tag = (changed && changed !== seedDate) ? `[CHANGED ${changed}]` : null;
    w.labelWithTag(label, tag);
    w.paragraph(text, { size: 10 });
    w.space(4);
  }

  if (logRows && logRows.length) {
    w.space(16);
    w.text('Strategy Change Log', { size: 15, font: fonts.bold, gap: 8 });

    const cols = [
      { w: 60, h: 'Date' }, { w: 90, h: 'Rule' }, { w: 70, h: 'Effect' }, { w: CONTENT_W - 220, h: 'New wording' },
    ];
    const size = 8, lineGap = 2, rowPad = 4;
    const drawHeaderRow = () => {
      w.ensure(size + rowPad * 2);
      let x = MARGIN;
      const rowTop = w.y;
      w.page.drawRectangle({ x: MARGIN, y: rowTop - size - rowPad * 2, width: CONTENT_W, height: size + rowPad * 2, color: rgb(0.88, 0.88, 0.88) });
      for (const c of cols) {
        w.page.drawText(c.h, { x: x + 3, y: rowTop - size - rowPad, size, font: fonts.bold, color: rgb(0, 0, 0) });
        x += c.w;
      }
      w.y = rowTop - size - rowPad * 2;
    };
    drawHeaderRow();
    for (const r of logRows) {
      const wrapped = [
        [String(r.date || '')], [String(r.rule_key || '')], [String(r.effect || '')],
        wrapText((r.new_text || '').slice(0, 300), fonts.regular, size, cols[3].w - 6),
      ];
      const rowLines = Math.max(...wrapped.map(c => c.length));
      const rowH = rowLines * (size + lineGap) + rowPad * 2;
      w.ensure(rowH);
      const rowTop = w.y;
      let x = MARGIN;
      for (let i = 0; i < cols.length; i++) {
        wrapped[i].forEach((line, li) => {
          w.page.drawText(line, { x: x + 3, y: rowTop - rowPad - size - li * (size + lineGap), size, font: fonts.regular, color: rgb(0, 0, 0) });
        });
        x += cols[i].w;
      }
      w.page.drawRectangle({ x: MARGIN, y: rowTop - rowH, width: CONTENT_W, height: rowH, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.5 });
      w.y = rowTop - rowH;
    }
  }

  return doc.save();
}

export function downloadPdf(filename, bytes) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
