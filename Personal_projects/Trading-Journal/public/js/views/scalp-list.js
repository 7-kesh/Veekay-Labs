import { listScalpTrades, deleteScalpTrade, scalpYears, getSettings } from '../db.js';
import { pctOf, num as calcNum } from '../calc.js';
import { money, signclass, px, esc, pct } from '../format.js';
import { downloadCsv } from '../csv.js';
import { dispatch } from '../router.js';
import { pickAndExportDay } from '../export-picker.js';

function periodBounds(period) {
  const t = new Date(); const iso = d => d.toISOString().slice(0, 10);
  if (period === 'week') { const d = new Date(t); d.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return [iso(d), iso(t)]; }
  if (period === 'month') { const d = new Date(t.getFullYear(), t.getMonth(), 1); return [iso(d), iso(t)]; }
  if (period === '30d') { const d = new Date(t); d.setDate(t.getDate() - 30); return [iso(d), iso(t)]; }
  return [null, null];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// A chosen year (and optionally month) overrides the quick period.
function yearMonthBounds(year, month) {
  const y = Number(year), m = Number(month);
  if (!y) return null;
  if (!m) return [`${y}-01-01`, `${y}-12-31`];
  const last = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  return [`${y}-${mm}-01`, `${y}-${mm}-${String(last).padStart(2, '0')}`];
}

export async function render(params, el) {
  const account = params.account || 'live', q = (params.q || '').toUpperCase();
  const year = /^\d{4}$/.test(params.year || '') ? params.year : '';
  const month = year && /^(1[0-2]|[1-9])$/.test(params.month || '') ? params.month : '';
  const period = year ? 'custom' : (params.period || '30d');
  const [lo, hi] = year ? yearMonthBounds(year, month) : periodBounds(period);
  const years = await scalpYears();
  if (year && !years.includes(year)) years.unshift(year);
  const rows = await listScalpTrades({ lo, hi, account, q });
  const net = rows.reduce((s, r) => s + (r.net_pnl || 0), 0);
  const bal = calcNum((await getSettings()).account_balance);

  const opt = (val, cur, label) => `<option value="${val}" ${val === cur ? 'selected' : ''}>${label}</option>`;
  el.innerHTML = `
    <div class="head"><h1>Scalp trades</h1>
      <div class="actions"><input type="date" id="dayPick" value="${new Date().toISOString().slice(0, 10)}"><button class="btn" id="exportDay" type="button">Export for AI-Assist-Review</button><button class="btn" id="exportCsv" type="button">Export CSV</button><a class="btn primary" href="#/scalp/new">+ New</a></div></div>
    <form class="filters" id="filters" style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
      <select name="period" ${year ? 'disabled' : ''}>${opt('week', period, 'This week')}${opt('month', period, 'This month')}${opt('30d', period, 'Last 30 days')}${opt('all', period, 'All time')}</select>
      <select name="year"><option value="">All years</option>${years.map(y => opt(y, year, y)).join('')}</select>
      <select name="month" ${year ? '' : 'disabled'}><option value="">All months</option>${MONTHS.map((n, i) => opt(String(i + 1), month, n)).join('')}</select>
      <select name="account">${opt('all', account, 'All accounts')}${opt('paper', account, 'Paper')}${opt('live', account, 'Live')}</select>
      <input type="text" name="q" placeholder="Ticker" value="${esc(q)}" style="width:100px">
      <span class="muted">${rows.length} trades · Net <b class="${signclass(net)}">${money(net)}</b></span>
    </form>
    <table class="dense"><thead><tr><th></th><th>Trade</th><th>Date</th><th>Ticker</th><th>Entry</th><th>Net</th><th>% acct</th><th>R</th><th>Cat</th><th>Status</th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td class="rowact"><a href="#/scalp/${r.id}">edit</a> · <a href="#" class="deleteRow neg" data-id="${r.id}" data-label="${esc(r.trade_no)}">delete</a></td>
      <td>${esc(r.trade_no)}</td><td>${esc(r.date)}</td><td><b>${esc(r.ticker)}</b></td><td>${px(r.entry_price)}</td>
      <td class="${signclass(r.net_pnl)}">${money(r.net_pnl)}</td><td class="${signclass(r.net_pnl)}">${pct(pctOf(r.net_pnl, bal))}</td><td>${r.r_multiple ?? ''}</td><td>${esc(r.category || '')}</td>
      <td><span class="pill ${r.review_status === 'complete' ? 'closed' : 'open'}">${r.review_status === 'complete' ? 'complete' : 'draft'}</span></td>
      </tr>`).join('') || '<tr><td colspan="10" class="muted">No trades in this range.</td></tr>'}
    </tbody></table>
  `;
  const form = el.querySelector('#filters');
  form.addEventListener('change', () => {
    if (!form.year.value) form.month.value = '';
    const p = new URLSearchParams(new FormData(form)); // disabled fields are omitted
    if (!form.year.value) { p.delete('year'); p.delete('month'); }
    window.location.hash = '#/scalp?' + p.toString();
  });
  form.q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); form.dispatchEvent(new Event('change')); } });
  el.querySelector('#exportDay').addEventListener('click', async function () {
    this.disabled = true; const old = this.textContent;
    try { await pickAndExportDay(el.querySelector('#dayPick').value); }
    catch (err) { alert(err.message || String(err)); }
    this.textContent = old; this.disabled = false;
  });
  el.querySelector('#exportCsv').addEventListener('click', () => {
    downloadCsv(`scalp_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  });
  el.querySelectorAll('.deleteRow').forEach(a => {
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!confirm(`Delete trade ${a.dataset.label} and its screenshots? This can't be undone.`)) return;
      await deleteScalpTrade(a.dataset.id);
      await dispatch();
    });
  });
}
