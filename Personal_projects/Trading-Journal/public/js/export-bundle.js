// IO side of "Export for Claude": fetches rows and screenshot bytes, builds the zip with
// export-format.js, and triggers the browser download.
import { getScalpTrade, getPlan, listScalpTrades, listPlans, listAttachments, downloadAttachment, priorExitTime } from './db.js';
import * as setupC from './setup-c.js';
import { buildTradeZip, buildDayZip } from './export-format.js';

async function shotsFor(kind, id) {
  const rows = await listAttachments(kind, id);
  const out = [];
  for (const r of rows) {
    const { mime, bytes } = await downloadAttachment(r.filename);
    out.push({ mime, filename: r.filename, bytes });
  }
  return out;
}

async function itemFor(kind, row) {
  if (kind === 'scalp') {
    return {
      kind,
      trade: row,
      setupC: await setupC.get(row.id),
      priorSameTickerExit: await priorExitTime(row.ticker, row.date, row.id, row.entry_time),
      shots: await shotsFor('scalp', row.id),
    };
  }
  return { kind, trade: row, shots: await shotsFor(kind, row.id) };
}

function download({ filename, bytes }) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return filename;
}

export async function exportTrade(kind, id) {
  const row = kind === 'scalp' ? await getScalpTrade(id) : await getPlan(id);
  return download(buildTradeZip(await itemFor(kind, row)));
}

export async function exportDay(date) {
  const scalp = await listScalpTrades({ date });
  const plans = [...await listPlans('options'), ...await listPlans('swing')].filter(p => p.plan_date === date);
  if (!scalp.length && !plans.length) throw new Error(`Nothing logged on ${date}.`);
  const items = [];
  for (const t of scalp) items.push(await itemFor('scalp', t));
  for (const p of plans) items.push(await itemFor(p.kind, p));
  return download(buildDayZip(date, items));
}
