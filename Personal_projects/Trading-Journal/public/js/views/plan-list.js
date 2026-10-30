// Port of app/templates/plans_list.html.
import { listPlans, deletePlan, allYears, getSettings, getCapitalData } from '../db.js';
import { capitalSummary, stripHtml } from '../capital.js';
import { periodBounds, periodSelectsHtml, readPeriod } from '../period.js';
import { money, signclass, px, num as fmtNum, esc, pct } from '../format.js';
import { pctOf } from '../calc.js';
import { downloadCsv } from '../csv.js';
import { dispatch } from '../router.js';

const KIND_LABEL = { options: 'Options', swing: 'Swing', futures: 'Futures' };

function ynv(v) {
  return v === 'Y' ? '<span class="yn-Y">Y</span>' : v === 'N' ? '<span class="yn-N">N</span>' : '';
}
function acct(a) {
  return `<span class="acct acct-${a || 'paper'}">${a === 'live' ? 'Live' : 'Paper'}</span>`;
}

export async function render(kind, params, el) {
  const status = params.status || 'all', account = params.account || 'live';
  const period = params.period || 'all';
  const [lo, hi] = periodBounds(period);
  const years = await allYears();
  const rows = (await listPlans(kind, { status, account })).filter(p => !lo || (p.plan_date >= lo && p.plan_date <= hi));
  const net = rows.filter(r => r.status === 'closed').reduce((s, r) => s + (r.realized_pl || 0), 0);
  const settings = await getSettings();
  const cap = await getCapitalData(settings);
  const sum = capitalSummary(settings, kind, cap.entries, cap.open, { account });

  const opt = (val, cur, label) => `<option value="${val}" ${val === cur ? 'selected' : ''}>${label}</option>`;
  el.innerHTML = `
    <div class="head"><h1>${KIND_LABEL[kind]} trades</h1>
      <div class="actions"><button class="btn" id="exportCsv" type="button">Export CSV</button><a class="btn primary" href="#/${kind}/new">+ New plan</a></div></div>
    ${stripHtml(sum, KIND_LABEL[kind])}
    <form class="filters" id="filters" style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
      <select name="status">${opt('all', status, 'All (active first)')}${opt('active', status, 'Active only (planned + open)')}${opt('planned', status, 'Planned')}${opt('open', status, 'Open')}${opt('closed', status, 'Closed')}${opt('cancelled', status, 'Cancelled')}</select>
      <select name="account">${opt('all', account, 'Paper + live')}${opt('paper', account, 'Paper only')}${opt('live', account, 'Live only')}</select>
      ${periodSelectsHtml(period, years)}
      <span class="muted">${rows.length} · realized <b class="${signclass(net)}">${money(net)}</b></span>
    </form>
    <div class="scroll"><table class="dense"><thead><tr>
      <th></th><th>Date</th><th>Acct</th><th>Ticker</th><th>Status</th><th>Plan entry</th><th>Stop</th><th>Target</th><th>Qty</th><th>Planned loss</th><th>Loss % acct</th><th>R:R</th>
      <th>Actual in</th><th>Actual out</th><th>P/L</th><th>P/L % acct</th><th>ROI</th><th>R</th><th title="Entry / exit strategy followed">Followed</th></tr></thead><tbody>
      ${rows.map(p => `<tr class="${(p.realized_pl || 0) > 0 ? 'win' : (p.realized_pl || 0) < 0 ? 'loss' : ''}">
        <td class="rowact"><a href="#/${kind}/${p.id}">edit</a> · <a href="#" class="deleteRow neg" data-id="${p.id}" data-label="${esc(p.ticker)}">delete</a></td>
        <td class="nw">${esc(p.plan_date)}</td><td>${acct(p.account)}</td>
        <td><a href="#/${kind}/${p.id}"><b>${esc(p.ticker)}</b></a> <small>${esc(p.direction || '')}${p.strike ? ' ' + px(p.strike) : ''}</small></td>
        <td><span class="pill ${esc(p.status)}">${esc(p.status)}</span></td>
        <td>${px(p.entry_price)}</td><td>${px(p.stop_price)}</td><td>${px(p.target_price)}</td><td>${fmtNum(p.qty)}</td>
        <td>${money(p.planned_loss)}</td><td>${p.planned_loss ? pct(-pctOf(p.planned_loss, p.account_balance)) : ''}</td><td>${fmtNum(p.rr)}</td>
        <td>${px(p.actual_entry)}</td><td>${px(p.actual_exit)}</td>
        <td class="${signclass(p.realized_pl)}">${money(p.realized_pl)}</td><td class="${signclass(p.realized_pl)}">${pct(pctOf(p.realized_pl, p.account_balance))}</td><td>${p.roi !== null && p.roi !== undefined ? fmtNum(p.roi) + '%' : ''}</td><td>${fmtNum(p.realized_r)}</td>
        <td class="nw">${ynv(p.entry_followed) || '–'} / ${ynv(p.exit_followed) || '–'}</td>
        </tr>`).join('') || '<tr><td colspan="19" class="muted">Nothing here yet.</td></tr>'}
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
