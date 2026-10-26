// Port of app/templates/plans_list.html.
import { listPlans, deletePlan, allYears } from '../db.js';
import { periodBounds, periodSelectsHtml, readPeriod } from '../period.js';
import { money, signclass, px, num as fmtNum, esc } from '../format.js';
import { downloadCsv } from '../csv.js';
import { dispatch } from '../router.js';

const KIND_LABEL = { options: 'Options', swing: 'Swing' };

function ynv(v) {
  return v === 'Y' ? '<span class="yn-Y">Y</span>' : v === 'N' ? '<span class="yn-N">N</span>' : '';
}
function acct(a) {
  return `<span class="acct acct-${a || 'paper'}">${a === 'live' ? 'Live' : 'Paper'}</span>`;
}

export async function render(kind, params, el) {
  const status = params.status || 'all', account = params.account || 'all';
  const period = params.period || 'all';
  const [lo, hi] = periodBounds(period);
  const years = await allYears();
  const rows = (await listPlans(kind, { status, account })).filter(p => !lo || (p.plan_date >= lo && p.plan_date <= hi));
  const net = rows.filter(r => r.status === 'closed').reduce((s, r) => s + (r.realized_pl || 0), 0);

  const opt = (val, cur, label) => `<option value="${val}" ${val === cur ? 'selected' : ''}>${label}</option>`;
  el.innerHTML = `
    <div class="head"><h1>${KIND_LABEL[kind]} trades</h1>
      <div class="actions"><button class="btn" id="exportCsv" type="button">Export CSV</button><a class="btn primary" href="#/${kind}/new">+ New plan</a></div></div>
    <form class="filters" id="filters" style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
      <select name="status">${opt('all', status, 'All')}${opt('planned', status, 'Planned')}${opt('open', status, 'Open')}${opt('closed', status, 'Closed')}${opt('cancelled', status, 'Cancelled')}</select>
      <select name="account">${opt('all', account, 'Paper + live')}${opt('paper', account, 'Paper only')}${opt('live', account, 'Live only')}</select>
      ${periodSelectsHtml(period, years)}
      <span class="muted">${rows.length} · realized <b class="${signclass(net)}">${money(net)}</b></span>
    </form>
    <div class="scroll"><table class="dense"><thead><tr>
      <th>Date</th><th>Acct</th><th>Ticker</th><th>Status</th><th>Plan entry</th><th>Stop</th><th>Target</th><th>Qty</th><th>Planned loss</th><th>R:R</th>
      <th>Actual in</th><th>Actual out</th><th>P/L</th><th>ROI</th><th>R</th><th>Entry</th><th>Exit</th><th></th><th></th></tr></thead><tbody>
      ${rows.map(p => `<tr class="${(p.realized_pl || 0) > 0 ? 'win' : (p.realized_pl || 0) < 0 ? 'loss' : ''}">
        <td>${esc(p.plan_date)}</td><td>${acct(p.account)}</td>
        <td><b>${esc(p.ticker)}</b> <small>${esc(p.direction || '')}${p.strike ? ' ' + px(p.strike) : ''}</small></td>
        <td><span class="pill ${esc(p.status)}">${esc(p.status)}</span></td>
        <td>${px(p.entry_price)}</td><td>${px(p.stop_price)}</td><td>${px(p.target_price)}</td><td>${fmtNum(p.qty)}</td>
        <td>${money(p.planned_loss)}</td><td>${fmtNum(p.rr)}</td>
        <td>${px(p.actual_entry)}</td><td>${px(p.actual_exit)}</td>
        <td class="${signclass(p.realized_pl)}">${money(p.realized_pl)}</td><td>${p.roi !== null && p.roi !== undefined ? fmtNum(p.roi) + '%' : ''}</td><td>${fmtNum(p.realized_r)}</td>
        <td>${ynv(p.entry_followed)}</td><td>${ynv(p.exit_followed)}</td>
        <td><a href="#/${kind}/${p.id}">open</a></td><td><a href="#" class="deleteRow neg" data-id="${p.id}" data-label="${esc(p.ticker)}">delete</a></td></tr>`).join('') || '<tr><td colspan="19" class="muted">Nothing here yet.</td></tr>'}
    </tbody></table></div>
  `;
  const form = el.querySelector('#filters');
  form.addEventListener('change', () => {
    const p = new URLSearchParams({ status: form.elements.status.value, account: form.elements.account.value, period: readPeriod(form) });
    window.location.hash = `#/${kind}?` + p.toString();
  });
  el.querySelector('#exportCsv').addEventListener('click', () => {
    downloadCsv(`${kind}_${new Date().toISOString().slice(0, 10)}.csv`, rows.map(({ checklist, ...rest }) => rest));
  });
  el.querySelectorAll('.deleteRow').forEach(a => {
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!confirm(`Delete this ${a.dataset.label} plan and its screenshots? This can't be undone.`)) return;
      await deletePlan(kind, a.dataset.id);
      await dispatch();
    });
  });
}
