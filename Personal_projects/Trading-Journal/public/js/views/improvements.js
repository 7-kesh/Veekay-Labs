// Improvements page: active items ranked by what their target costs in real trades, with
// before/after once adopted. Statuses: proposed -> adopted -> resolved (or dropped).
import { listImprovements, setImprovementStatus, listScalpTrades } from '../db.js';
import { rankImprovements, beforeAfter, MIN_AFTER_TRADES } from '../improvement-rank.js';
import { money, esc } from '../format.js';

const targetText = i => i.target_type === 'violation' ? `violation: ${i.target_value}`
  : i.target_type === 'metric' ? `metric: ${i.target_value}${i.target_setup ? ` (Setup ${i.target_setup})` : ''}` : 'no measurable target';
const METRIC_FMT = { avg_r: v => v + ' R', win_rate: v => v + '%', avg_loser: v => money(v), avg_winner: v => money(v) };

function baHtml(i, ba) {
  if (!ba) return '';
  if (!ba.enough) return `<p class="muted">Adopted ${esc(i.adopted_on)}. Before/after appears after ${MIN_AFTER_TRADES} trades since then (${ba.after.trades} so far).</p>`;
  const row = (label, s) => i.target_type === 'violation'
    ? `<tr><td>${label}</td><td>${s.trades}</td><td>${s.tagged} (${s.rate ?? '-'}%)</td><td>${money(s.net)}</td></tr>`
    : `<tr><td>${label}</td><td>${s.trades}</td><td colspan="2">${s.value == null ? '-' : METRIC_FMT[i.target_value](s.value)}</td></tr>`;
  const head = i.target_type === 'violation' ? '<th>Trades</th><th>Tagged</th><th>Net on tagged</th>' : '<th>Trades</th><th colspan="2">Value</th>';
  if (i.target_type === 'none') return '';
  return `<table class="dense"><thead><tr><th>Since ${esc(i.adopted_on)}</th>${head}</tr></thead><tbody>${row('Before', ba.before)}${row('After', ba.after)}</tbody></table>`;
}

export async function render(_params, el) {
  let items = [], trades = [], err = '';
  try { [items, trades] = await Promise.all([listImprovements(), listScalpTrades({})]); }
  catch (e) { err = e.message || String(e); }
  const ranked = rankImprovements(items, trades);
  const done = items.filter(i => i.status === 'resolved' || i.status === 'dropped');

  const card = (i, n) => `<section class="card" style="margin-bottom:12px">
    <h3>${n ? n + '. ' : ''}${esc(i.text)} <span class="pill ${i.status === 'adopted' ? 'closed' : 'open'}">${esc(i.status)}</span></h3>
    <p class="muted">Target: ${esc(targetText(i))} · imported ${esc(i.date)}${(i.trade_nos || []).length ? ' · ' + esc(i.trade_nos.join(', ')) : ''}
      ${i.target_type === 'violation' ? ` · cost in your trades: <b>${money(i.cost ?? 0)}</b> over ${i.n ?? 0} tagged trade(s)` : ''}</p>
    ${baHtml(i, i.status !== 'proposed' ? beforeAfter(i, trades) : null)}
    <div class="actions">
      ${i.status === 'proposed' ? `<button class="btn sm primary" data-act="adopted" data-id="${i.id}">Adopt (from today)</button>` : ''}
      ${i.status === 'adopted' ? `<button class="btn sm" data-act="resolved" data-id="${i.id}">Mark resolved</button>` : ''}
      <button class="btn sm" data-act="dropped" data-id="${i.id}">Drop</button>
    </div></section>`;

  el.innerHTML = `
    <div class="head"><h1>Improvements <small>ranked by what they cost you</small></h1><div class="actions"><a class="btn" href="#/import">Import wrap-up</a></div></div>
    ${err ? `<p class="neg">${esc(err)} - if this is the first time, run <code>supabase/migrate-wrapup.sql</code> in the Supabase SQL editor.</p>` : ''}
    ${ranked.length ? ranked.map((i, k) => card(i, k + 1)).join('') : (err ? '' : '<section class="card"><p class="muted">No active improvements. Import a wrap-up to add some.</p></section>')}
    <p class="muted note">Violation targets are ranked by the net P&amp;L lost on trades carrying that tag. Metric and no-target items sit below them, newest first. Costs for different items overlap, so don't add them up.</p>
    ${done.length ? `<details><summary>${done.length} resolved or dropped</summary>${done.map(i => `<p><b>${esc(i.status)}</b> - ${esc(i.text)} <span class="muted">(${esc(targetText(i))})</span> <a href="#" data-act="proposed" data-id="${i.id}">reopen</a></p>`).join('')}</details>` : ''}
  `;
  el.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', async (e) => {
    e.preventDefault();
    await setImprovementStatus(Number(b.dataset.id), b.dataset.act);
    await render({}, el);
  }));
}
