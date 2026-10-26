import { listScalpTrades, deleteScalpTrade } from '../db.js';
import { money, signclass, px, esc } from '../format.js';
import { downloadCsv } from '../csv.js';
import { dispatch } from '../router.js';
import { exportDay } from '../export-bundle.js';

function periodBounds(period) {
  const t = new Date(); const iso = d => d.toISOString().slice(0, 10);
  if (period === 'week') { const d = new Date(t); d.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return [iso(d), iso(t)]; }
  if (period === 'month') { const d = new Date(t.getFullYear(), t.getMonth(), 1); return [iso(d), iso(t)]; }
  if (period === '30d') { const d = new Date(t); d.setDate(t.getDate() - 30); return [iso(d), iso(t)]; }
  return [null, null];
}

export async function render(params, el) {
  const period = params.period || '30d', account = params.account || 'all', q = (params.q || '').toUpperCase();
  const [lo, hi] = periodBounds(period);
  const rows = await listScalpTrades({ lo, hi, account, q });
  const net = rows.reduce((s, r) => s + (r.net_pnl || 0), 0);

  const opt = (val, cur, label) => `<option value="${val}" ${val === cur ? 'selected' : ''}>${label}</option>`;
  el.innerHTML = `
    <div class="head"><h1>Scalp trades</h1>
      <div class="actions"><input type="date" id="dayPick" value="${new Date().toISOString().slice(0, 10)}"><button class="btn" id="exportDay" type="button">Export day for Claude</button><button class="btn" id="exportCsv" type="button">Export CSV</button><a class="btn primary" href="#/scalp/new">+ New</a></div></div>
    <form class="filters" id="filters" style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
      <select name="period">${opt('week', period, 'This week')}${opt('month', period, 'This month')}${opt('30d', period, 'Last 30 days')}${opt('all', period, 'All time')}</select>
      <select name="account">${opt('all', account, 'All accounts')}${opt('paper', account, 'Paper')}${opt('live', account, 'Live')}</select>
      <input type="text" name="q" placeholder="Ticker" value="${esc(q)}" style="width:100px">
      <span class="muted">${rows.length} trades · Net <b class="${signclass(net)}">${money(net)}</b></span>
    </form>
    <table class="dense"><thead><tr><th>Trade</th><th>Date</th><th>Ticker</th><th>Entry</th><th>Net</th><th>R</th><th>Cat</th><th>Status</th><th></th><th></th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td>${esc(r.trade_no)}</td><td>${esc(r.date)}</td><td><b>${esc(r.ticker)}</b></td><td>${px(r.entry_price)}</td>
      <td class="${signclass(r.net_pnl)}">${money(r.net_pnl)}</td><td>${r.r_multiple ?? ''}</td><td>${esc(r.category || '')}</td>
      <td><span class="pill ${r.review_status === 'complete' ? 'closed' : 'open'}">${r.review_status === 'complete' ? 'complete' : 'draft'}</span></td>
      <td><a href="#/scalp/${r.id}">edit</a></td><td><a href="#" class="deleteRow neg" data-id="${r.id}" data-label="${esc(r.trade_no)}">delete</a></td></tr>`).join('') || '<tr><td colspan="10" class="muted">No trades in this range.</td></tr>'}
    </tbody></table>
  `;
  const form = el.querySelector('#filters');
  form.addEventListener('change', () => {
    const p = new URLSearchParams(new FormData(form));
    window.location.hash = '#/scalp?' + p.toString();
  });
  form.q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); form.dispatchEvent(new Event('change')); } });
  el.querySelector('#exportDay').addEventListener('click', async function () {
    this.disabled = true; const old = this.textContent; this.textContent = 'Building…';
    try { await exportDay(el.querySelector('#dayPick').value); }
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
