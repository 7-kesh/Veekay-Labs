// P&L calendar for the Portfolio page: daily totals in a month grid (with a total per week and per
// month) and a year view of monthly totals. Pure data shaping + markup, so it is Node-tested.
// entries: [{date: 'YYYY-MM-DD', pnl: number, account: 'paper' | 'live'}]
import { esc } from './format.js';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const r2 = v => Math.round(v * 100) / 100;
const pad = n => String(n).padStart(2, '0');

export function dayTotals(entries) {
  const m = new Map();
  for (const e of entries) {
    if (!e.date || typeof e.pnl !== 'number') continue;
    const d = m.get(e.date) || { net: 0, n: 0 };
    d.net = r2(d.net + e.pnl); d.n += 1;
    m.set(e.date, d);
  }
  return m;
}

// Weeks (Sun-Sat) covering the month, each day carrying its totals; plus week and month totals.
export function monthGrid(year, month, totals) {
  const first = new Date(Date.UTC(year, month, 1));
  const start = new Date(Date.UTC(year, month, 1 - first.getUTCDay()));
  const weeks = [];
  const month_ = { net: 0, n: 0, green: 0, red: 0 };
  const nWeeks = Math.ceil((first.getUTCDay() + new Date(Date.UTC(year, month + 1, 0)).getUTCDate()) / 7);
  for (let w = 0; w < nWeeks; w++) {
    const days = [];
    const wk = { net: 0, n: 0 };
    for (let i = 0; i < 7; i++) {
      const dt = new Date(start.getTime() + (w * 7 + i) * 86400000);
      const iso = `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
      const inMonth = dt.getUTCMonth() === month;
      const t = totals.get(iso);
      days.push({ date: iso, day: dt.getUTCDate(), inMonth, net: t ? t.net : null, n: t ? t.n : 0 });
      if (inMonth && t) {
        wk.net = r2(wk.net + t.net); wk.n += t.n;
        month_.net = r2(month_.net + t.net); month_.n += t.n;
        if (t.net > 0) month_.green++; else if (t.net < 0) month_.red++;
      }
    }
    weeks.push({ days, net: wk.net, n: wk.n });
  }
  return { weeks, month: month_ };
}

export function yearMonths(year, totals) {
  const out = MONTHS.map((_, m) => ({ month: m, net: 0, n: 0 }));
  for (const [date, t] of totals) {
    if (!date.startsWith(year + '-')) continue;
    const o = out[Number(date.slice(5, 7)) - 1];
    o.net = r2(o.net + t.net); o.n += t.n;
  }
  return out;
}

// Entries dated after today can't have happened yet (usually a placeholder exit date), so they are
// kept off the calendar and reported separately.
export function splitFuture(entries, todayIso) {
  const shown = [], future = [];
  for (const e of entries) (e.date && e.date > todayIso ? future : shown).push(e);
  return { shown, future };
}

const usd = v => (v < 0 ? '-$' : v > 0 ? '+$' : '$') + Math.abs(v).toFixed(2);
const pctOf = (v, bal) => (bal > 0 ? (v < 0 ? '' : v > 0 ? '+' : '') + (100 * v / bal).toFixed(2) + '%' : '');
const cls = v => (v > 0 ? 'up' : v < 0 ? 'down' : 'flat');

// state: {account: 'live'|'paper', area: 'all'|'scalp'|'options'|'swing', view: 'month'|'year', y, m}
export function calendarHtml(state, totals, balance) {
  const { account, area = 'all', view, y, m } = state;
  const toggle = (name, val, items) => `<div class="calseg" data-seg="${name}">${items.map(([v, l]) => `<button type="button" data-${name}="${v}" class="${v === val ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const acct = toggle('account', account, [['live', 'Live'], ['paper', 'Paper']]);
  const mode = toggle('view', view, [['month', 'Month'], ['year', 'Year']]);
  const areas = toggle('area', area, [['all', 'All'], ['scalp', 'Scalp'], ['options', 'Options'], ['swing', 'Swing']]);

  if (view === 'year') {
    const months = yearMonths(String(y), totals);
    const total = months.reduce((s, o) => ({ net: r2(s.net + o.net), n: s.n + o.n }), { net: 0, n: 0 });
    return `<div class="calhead"><div class="calnav"><button type="button" data-nav="-1" aria-label="Previous year">◀</button><b>${y}</b><button type="button" data-nav="1" aria-label="Next year">▶</button></div>
      <div class="caltotal ${cls(total.net)}"><span>${y} total</span><b>${usd(total.net)}</b><small>${pctOf(total.net, balance)} · ${total.n} trade${total.n === 1 ? '' : 's'}</small></div>
      <div class="calctl">${areas}${acct}${mode}</div></div>
      <div class="yeargrid">${months.map(o => `<button type="button" class="ymon ${o.n ? cls(o.net) : 'empty'}" data-gomonth="${o.month}">
        <span>${MONTHS[o.month].slice(0, 3)}</span><b>${o.n ? usd(o.net) : '--'}</b><small>${o.n ? pctOf(o.net, balance) + ' · ' + o.n + ' trade' + (o.n === 1 ? '' : 's') : 'no trades'}</small></button>`).join('')}</div>`;
  }

  const g = monthGrid(y, m, totals);
  const mt = g.month;
  return `<div class="calhead"><div class="calnav"><button type="button" data-nav="-1" aria-label="Previous month">◀</button><b>${y}/${pad(m + 1)}</b><button type="button" data-nav="1" aria-label="Next month">▶</button></div>
    <div class="caltotal ${cls(mt.net)}"><span>${esc(MONTHS[m])} total</span><b>${usd(mt.net)}</b><small>${pctOf(mt.net, balance)} · ${mt.n} trade${mt.n === 1 ? '' : 's'} · ${mt.green} green / ${mt.red} red day${mt.green + mt.red === 1 ? '' : 's'}</small></div>
    <div class="calctl">${areas}${acct}${mode}</div></div>
    <div class="scroll calwrap"><table class="calgrid"><thead><tr>${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Week'].map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>
    ${g.weeks.map(w => `<tr>${w.days.map(d => `<td class="cd ${d.inMonth ? (d.n ? cls(d.net) : 'quiet') : 'out'}"><i>${d.day}</i>${d.inMonth && d.n ? `<b>${usd(d.net)}</b><small>${pctOf(d.net, balance)}</small>` : '<b>--</b>'}</td>`).join('')}
      <td class="cd wk ${w.n ? cls(w.net) : 'quiet'}"><i>Week</i>${w.n ? `<b>${usd(w.net)}</b><small>${w.n} trade${w.n === 1 ? '' : 's'}</small>` : '<b>--</b>'}</td></tr>`).join('')}
    </tbody></table></div>`;
}
