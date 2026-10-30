// IO side of "Export for AI-Assist-Review": fetches rows and screenshot bytes, builds the zip with
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

// Everything logged on a date, as picker rows: { key, kind, id, label }.
export async function listDayItems(date) {
  const scalp = await listScalpTrades({ date });
  const plans = [...await listPlans('options'), ...await listPlans('swing'), ...await listPlans('futures')].filter(p => p.plan_date === date);
  return [
    ...scalp.map(t => ({ key: `scalp:${t.id}`, kind: 'scalp', id: t.id, row: t, label: `${t.trade_no || '#' + t.id} ${t.ticker || ''} ${t.entry_time || ''}`.trim(), pnl: t.net_pnl })),
    ...plans.map(p => ({ key: `${p.kind}:${p.id}`, kind: p.kind, id: p.id, row: p, label: `${p.kind} ${p.ticker || ''}`.trim(), pnl: null })),
  ];
}

// only: optional Set of picker keys; omitted means the whole day.
export async function exportDay(date, only) {
  const all = await listDayItems(date);
  const picked = only ? all.filter(x => only.has(x.key)) : all;
  if (!picked.length) throw new Error(only ? 'No trades selected.' : `Nothing logged on ${date}.`);
  const items = [];
  for (const x of picked) items.push(await itemFor(x.kind, x.row));
  return download(buildDayZip(date, items));
}
