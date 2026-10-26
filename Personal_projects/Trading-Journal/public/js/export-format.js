// Pure (no browser, no network) builders for the "Export for Claude" bundles, so they can be
// unit tested in Node. The IO side (fetching rows and screenshot bytes, downloading the zip)
// lives in export-bundle.js.
//
// Bundle format, schema "tj-export/1":
//   per trade:  trade.json, README.md, screenshots/<n>.<ext>
//   per day:    day.json, README.md, trades/<trade_no>_<ticker>/{trade.json, screenshots/...},
//               plans/<kind>_<id>_<ticker>/{trade.json, screenshots/...}
// The skill consumes trade.json / day.json; the README explains the layout to a human or to Claude.

import { makeZip } from './zip.js';

export const SCHEMA = 'tj-export/1';

const SKIP = new Set(['legacy_json', 'created_at', 'updated_at']);

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

export function extForMime(mime, filename = '') {
  if (EXT[mime]) return EXT[mime];
  const m = /\.([a-z0-9]+)$/i.exec(filename);
  return m ? m[1].toLowerCase() : 'bin';
}

// HH:MM or HH:MM:SS -> seconds since midnight, or null.
export function toSeconds(t) {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(t || '').trim());
  if (!m) return null;
  return (+m[1]) * 3600 + (+m[2]) * 60 + (m[3] ? +m[3] : 0);
}

// Seconds between the prior same-ticker exit and this entry (null when either is unknown).
export function resetGapSeconds(priorExit, entry) {
  const a = toSeconds(priorExit), b = toSeconds(entry);
  return a == null || b == null ? null : b - a;
}

function clean(row) {
  const out = {};
  for (const [k, v] of Object.entries(row || {})) {
    if (SKIP.has(k) || v === null || v === undefined || v === '') continue;
    out[k] = v;
  }
  return out;
}

function slug(s) {
  return String(s || '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'x';
}

// kind: 'scalp' | 'options' | 'swing'. shots: [{ name, mime }] in display order.
export function tradeJson({ kind, trade, setupC, priorSameTickerExit, shots, exportedAt }) {
  const t = clean(trade);
  const out = {
    schema: SCHEMA,
    exported_at: exportedAt,
    kind,
    trade: t,
    screenshots: shots.map((s, i) => ({ file: s.name, order: i + 1 })),
  };
  if (setupC) out.setup_c = clean(setupC);
  if (kind === 'scalp') {
    out.derived = {
      prior_same_ticker_exit_time: priorSameTickerExit || null,
      reset_gap_seconds: resetGapSeconds(priorSameTickerExit, trade && trade.entry_time),
    };
  }
  if (trade && trade.legacy_json) out.legacy_notes = trade.legacy_json;
  return out;
}

export function tradeReadme(kind, label) {
  return `# Trade export: ${label}

Exported from Veekay's Trading Journal (schema ${SCHEMA}, kind: ${kind}).

- trade.json - every field Veekay recorded for this trade (empty fields omitted), plus Setup C
  evidence if any, and derived values (e.g. the same-ticker reset gap in seconds).
- screenshots/ - the original-resolution screenshots, in the order listed in trade.json.

Notes for the assessor: fields are Veekay's own record, not a verdict. Empty or missing means
"not recorded" - ask rather than assume. P&L fields must not decide whether the entry was valid.
`;
}

export function dayReadme(date) {
  return `# Day export: ${date}

Exported from Veekay's Trading Journal (schema ${SCHEMA}).

- day.json - index of the day's trades and totals.
- trades/<trade_no>_<ticker>/ - one folder per scalp trade, each with trade.json and screenshots/.
- plans/<kind>_<id>_<ticker>/ - options and swing plans dated this day, same layout.

Notes for the assessor: fields are Veekay's own record, not a verdict. Empty or missing means
"not recorded" - ask rather than assume. P&L fields must not decide whether an entry was valid.
`;
}

const enc = new TextEncoder();
const text = (s) => enc.encode(s);
const json = (o) => text(JSON.stringify(o, null, 2) + '\n');

// item: { kind, trade, setupC, priorSameTickerExit, shots: [{ mime, filename, bytes }] }
function itemEntries(prefix, item, exportedAt) {
  const shots = item.shots.map((s, i) => ({ name: `screenshots/${i + 1}.${extForMime(s.mime, s.filename)}`, mime: s.mime, bytes: s.bytes }));
  const entries = [{ name: prefix + 'trade.json', data: json(tradeJson({
    kind: item.kind, trade: item.trade, setupC: item.setupC,
    priorSameTickerExit: item.priorSameTickerExit, shots, exportedAt,
  })) }];
  for (const s of shots) entries.push({ name: prefix + s.name, data: s.bytes });
  return entries;
}

export function tradeLabel(item) {
  const t = item.trade;
  return item.kind === 'scalp' ? `${t.trade_no || t.id}_${slug(t.ticker)}` : `${item.kind}_${t.id}_${slug(t.ticker)}`;
}

export function buildTradeZip(item, exportedAt = new Date().toISOString()) {
  const label = tradeLabel(item);
  const entries = [
    ...itemEntries('', item, exportedAt),
    { name: 'README.md', data: text(tradeReadme(item.kind, label)) },
  ];
  return { filename: `trade_${label}_${(item.trade.date || item.trade.plan_date || '').replace(/-/g, '')}.zip`, bytes: makeZip(entries) };
}

export function buildDayZip(date, items, exportedAt = new Date().toISOString()) {
  const entries = [];
  const index = [];
  for (const item of items) {
    const label = tradeLabel(item);
    const dir = (item.kind === 'scalp' ? 'trades/' : 'plans/') + label + '/';
    entries.push(...itemEntries(dir, item, exportedAt));
    const t = item.trade;
    index.push({
      kind: item.kind, folder: dir, trade_no: t.trade_no || null, ticker: t.ticker || null,
      entry_time: t.entry_time || null, net_pnl: t.net_pnl ?? null, screenshots: item.shots.length,
    });
  }
  const scalp = items.filter(i => i.kind === 'scalp');
  const day = {
    schema: SCHEMA, exported_at: exportedAt, date,
    totals: {
      scalp_trades: scalp.length,
      scalp_net_pnl: Math.round(scalp.reduce((s, i) => s + (Number(i.trade.net_pnl) || 0), 0) * 100) / 100,
      plans: items.length - scalp.length,
    },
    items: index,
  };
  entries.unshift({ name: 'day.json', data: json(day) }, { name: 'README.md', data: text(dayReadme(date)) });
  return { filename: `day_${date}.zip`, bytes: makeZip(entries) };
}
