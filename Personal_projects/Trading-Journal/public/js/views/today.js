import { listScalpTrades } from '../db.js';
import { money, signclass, px, esc } from '../format.js';
import { pickAndExportDay } from '../export-picker.js';
import { mountWatchouts } from './watchouts.js';
import { mountCommitments } from './commitments.js';

export async function render(_params, el) {
  const d = new Date().toISOString().slice(0, 10);
  const trades = await listScalpTrades({ date: d });
  const net = trades.reduce((s, t) => s + (t.net_pnl || 0), 0);
  const wins = trades.filter(t => (t.net_pnl || 0) > 0).length;

  el.innerHTML = `
    <div class="head"><h1>Today</h1></div>
    <section class="card">
      <div class="live"><div class="n"><span>Net</span><b class="${signclass(net)}">${money(net)}</b></div>
      <div class="n"><span>Trades</span><b>${trades.length}</b></div>
      <div class="n"><span>Wins</span><b>${wins}</b></div></div>
    </section>
    <div id="commitMount" style="margin-top:16px"></div>
    <div id="watchMount" style="margin-top:16px"></div>
    <section class="card" style="margin-top:16px">
      <h2>Intraday trades today <small class="muted">(paper + live)</small></h2>
      <table class="dense"><thead><tr><th>Trade</th><th>Acct</th><th>Ticker</th><th>Entry</th><th>Net</th><th>Cat</th><th></th></tr></thead>
      <tbody>${trades.map(t => `<tr>
        <td>${esc(t.trade_no)}</td><td><span class="acct acct-${t.account || 'paper'}">${t.account === 'live' ? 'Live' : 'Paper'}</span></td><td><b>${esc(t.ticker)}</b></td><td>${px(t.entry_price)}</td>
        <td class="${signclass(t.net_pnl)}">${money(t.net_pnl)}</td><td>${esc(t.category || '')}</td>
        <td><a href="#/intraday/trades/${t.id}">edit</a></td></tr>`).join('') || '<tr><td colspan="7" class="muted">No trades yet today.</td></tr>'}
      </tbody></table>
    </section>
    <div class="actions" style="margin-top:16px"><a class="btn primary" href="#/intraday/trades/new">+ New intraday trade</a>
      <button class="btn" id="exportDay" type="button">Export for AI-Assist-Review</button>
      <span class="muted" id="exportStatus"></span></div>
  `;
  mountCommitments(el.querySelector('#commitMount'), null);
  mountWatchouts(el.querySelector('#watchMount'));
  el.querySelector('#exportDay').addEventListener('click', async function () {
    const st = el.querySelector('#exportStatus');
    this.disabled = true; st.textContent = '';
    try { const f = await pickAndExportDay(d); st.textContent = f ? 'Downloaded ' + f : ''; }
    catch (err) { st.textContent = err.message || String(err); }
    this.disabled = false;
  });
}
