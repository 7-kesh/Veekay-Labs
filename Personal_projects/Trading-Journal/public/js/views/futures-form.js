// Futures trade form: plan before entry (contract, prices, size, limits), a live forecast, then the
// actual trade and judgement (session, setup, emotions, violations, notes). Same plans table and
// plan-then-actual shape as Options/Swing. Contract point value and tick size are typed per trade.
import { getPlan, saveFuturesTrade, deletePlan, getSettings, getCapitalData } from '../db.js';
import { capitalSummary, stripHtml } from '../capital.js';
import { futuresPlan, contractFor } from '../futures-calc.js';
import { EMOTIONS, FUTURES_SESSIONS, FUTURES_VIOLATIONS, FUTURES_CONTRACTS } from '../constants.js';
import { money, px, num as fmtNum, esc } from '../format.js';
import { navigate, dispatch } from '../router.js';
import { fld, acctPick, chips } from '../fields.js';
import { trackNewButton } from '../dirty.js';
import { mountShotsPanel } from '../shots-panel.js';
import { mountCommitments } from './commitments.js';

const sel = (name, label, cur, opts, cls = 'f-md') => `<div class="fld ${cls}"><label for="i_${name}">${label}</label>
  <select id="i_${name}" name="${name}"><option value="">–</option>${opts.map(o => `<option ${cur === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;

export async function render(params, el) {
  const isNew = params.id === 'new';
  const plan = isNew ? null : await getPlan(params.id);
  const settings = await getSettings();
  const cap = await getCapitalData(settings);
  const capFor = acct => capitalSummary(settings, 'futures', cap.entries, cap.open, { account: acct, excludeId: plan ? plan.id : null });
  const availStr = s => (s.set && s.available > 0 ? String(s.available) : '');
  const p = plan || { plan_date: new Date().toISOString().slice(0, 10), account: 'paper', direction: 'long',
    account_balance: availStr(capFor('paper')), risk_pct: settings.futures_risk_pct, qty: 1, status: 'planned' };
  const emo = p.emotions || [], vio = p.violations || [];
  const preset = plan ? contractFor(FUTURES_CONTRACTS, plan.ticker, plan.point_value) : null;

  el.innerHTML = `
    <div class="head"><h1>${plan ? `${esc(plan.ticker)} · Futures` : 'New futures trade'}
      ${plan ? `<span class="pill ${esc(plan.status)}">${esc(plan.status)}</span>` : ''}</h1>
      <div class="actions"><a class="btn" href="#/futures">All futures trades</a>
        <button class="btn" type="button" id="newBtn" disabled>+ New futures trade</button></div></div>
    <div id="commitMount"></div>
    <div id="capStrip">${stripHtml(capFor(p.account || 'paper'), 'Futures')}</div>

    <form id="futForm" autocomplete="off">
    <div class="sheet">
      <div class="rowline"><div class="rl"><i>1</i>Trade<br>and contract</div>
        <div class="cells">
          ${acctPick(p.account)}
          <div class="fld f-lg"><label for="i_contract">Contract</label><select id="i_contract">
            <option value="">Other / custom</option>${FUTURES_CONTRACTS.map(([r, n, pv, t]) =>
              `<option value="${r}" ${preset && preset[0] === r ? 'selected' : ''}>${r} · ${esc(n)} ($${pv}/pt, ${t})</option>`).join('')}</select></div>
          ${fld('ticker', 'Symbol', p.ticker || '', 'f-sm', { extra: `class="upper" required ${plan ? '' : 'autofocus'}`, hint: 'e.g. MES Dec' })}
          <div class="fld"><span class="lab">Direction</span><div class="seg">${['long', 'short'].map(d =>
            `<label><input type="radio" name="direction" value="${d}" ${p.direction === d ? 'checked' : ''}><span>${d[0].toUpperCase() + d.slice(1)}</span></label>`).join('')}</div></div>
          ${fld('plan_date', 'Plan date', p.plan_date, 'f-md', { hint: 'YYYY-MM-DD' })}
          ${sel('session', 'Session', p.session, FUTURES_SESSIONS)}
          ${fld('point_value', 'Point value $', fmtNum(p.point_value), 'f-sm', { mode: 'decimal', hint: '$ per full point' })}
          ${fld('tick_size', 'Tick size', fmtNum(p.tick_size), 'f-xs', { mode: 'decimal', hint: 'e.g. 0.25' })}
        </div></div>

      <div class="rowline plan"><div class="rl"><i>2</i>Plan<br>prices and size</div>
        <div class="cells">
          ${fld('entry_price', 'Entry', fmtNum(p.entry_price), 'f-sm', { mode: 'decimal' })}
          ${fld('stop_price', 'Stop', fmtNum(p.stop_price), 'f-sm', { mode: 'decimal' })}
          ${fld('target_price', 'Target', fmtNum(p.target_price), 'f-sm', { mode: 'decimal' })}
          ${fld('qty', 'Contracts', fmtNum(p.qty), 'f-xs', { mode: 'numeric' })}
          ${fld('account_balance', 'Available $', fmtNum(p.account_balance), 'f-sm', { mode: 'decimal', hint: 'portfolio − margin in open trades' })}
          ${fld('risk_pct', 'Risk %', fmtNum(p.risk_pct), 'f-xs', { mode: 'decimal' })}
        </div></div>

      <div class="rowline"><div class="rl"><i>3</i>Margin<br>and limits</div>
        <div class="cells">
          ${fld('margin_used', 'Margin used $', fmtNum(p.margin_used), 'f-sm', { mode: 'decimal', hint: 'total, this position' })}
          ${fld('daily_loss_limit', 'Daily loss limit $', fmtNum(p.daily_loss_limit), 'f-sm', { mode: 'decimal' })}
          ${fld('max_contracts', 'Max contracts', fmtNum(p.max_contracts), 'f-xs', { mode: 'numeric' })}
        </div></div>

      <div class="rowline band"><div class="rl top0"><i>Σ</i>Forecast</div>
        <div class="cells" style="flex-direction:column;align-items:stretch;gap:8px">
          <div class="forecast">
            <div class="fc"><span>Risk / contract</span><b id="fRPC">–</b></div>
            <div class="fc"><span>Risk (ticks)</span><b id="fRT">–</b></div>
            <div class="fc loss"><span>Planned loss</span><b id="fLoss">–</b></div>
            <div class="fc loss"><span>Loss % of account</span><b id="fLossPct">–</b></div>
            <div class="fc gain"><span>Potential profit</span><b id="fProfit">–</b></div>
            <div class="fc rr"><span>Reward : risk</span><b id="fRR">–</b></div>
            <div class="fc"><span>Risk budget</span><b id="fBudget">–</b></div>
            <div class="fc"><span>Max by risk</span><b id="fMax">–</b></div>
          </div>
          <div class="verdicts" id="fVerdicts"></div>
        </div></div>

      <div class="rowline"><div class="rl"><i>4</i>Actual<br>trade</div>
        <div class="cells">
          ${fld('entry_date', 'Entry date', p.entry_date || '', 'f-md', { hint: 'YYYY-MM-DD' })}
          ${fld('entry_time', 'Entry time', p.entry_time || '', 'f-sm', { hint: 'HH:MM' })}
          ${fld('actual_entry', 'Actual entry', fmtNum(p.actual_entry), 'f-sm', { mode: 'decimal' })}
          ${fld('exit_date', 'Exit date', p.exit_date || '', 'f-md', { hint: 'YYYY-MM-DD' })}
          ${fld('exit_time', 'Exit time', p.exit_time || '', 'f-sm', { hint: 'HH:MM' })}
          ${fld('actual_exit', 'Actual exit', fmtNum(p.actual_exit), 'f-sm', { mode: 'decimal' })}
          ${fld('fees', 'Fees $', fmtNum(p.fees), 'f-xs', { mode: 'decimal', hint: 'total' })}
        </div></div>

      ${plan && plan.realized_pl !== null && plan.realized_pl !== undefined ? `<div class="rowline band"><div class="rl top0"><i>=</i>Result</div>
        <div class="cells"><div class="forecast">
          <div class="fc ${plan.realized_pl < 0 ? 'loss' : 'gain'}"><span>P/L</span><b>${money(plan.realized_pl)}</b></div>
          <div class="fc"><span>Ticks</span><b>${fmtNum(plan.realized_ticks) || '–'}</b></div>
          <div class="fc rr"><span>R multiple</span><b>${fmtNum(plan.realized_r) || '–'}</b></div>
        </div></div></div>` : ''}

      <div class="rowline"><div class="rl"><i>5</i>Judgement</div>
        <div class="cells" style="flex-direction:column;align-items:stretch;gap:10px">
          ${fld('setup', 'Setup', p.setup || '', 'f-lg', { hint: 'what you were trading' })}
          <div class="fld"><span class="lab">Emotions</span>${chips('emotions', EMOTIONS, emo)}</div>
          <div class="fld"><span class="lab">Rule violations</span>${chips('violations', FUTURES_VIOLATIONS, vio, 'bad')}</div>
          <div class="fld f-fill"><label for="i_thesis">Thesis / plan</label><textarea id="i_thesis" name="thesis" rows="2">${esc(p.thesis || '')}</textarea></div>
          <div class="fld f-fill"><label for="i_exit_reason">Exit reason</label><textarea id="i_exit_reason" name="exit_reason" rows="1">${esc(p.exit_reason || '')}</textarea></div>
          <div class="fld f-fill"><label for="i_notes">Notes</label><textarea id="i_notes" name="notes" rows="2">${esc(p.notes || '')}</textarea></div>
        </div></div>
    </div>

    <div class="actions">
      <button class="btn primary" type="submit">Save</button>
      ${plan && plan.status !== 'cancelled' && plan.status !== 'closed' ? '<button class="btn" type="submit" name="cancel" value="1">Cancel plan</button>' : ''}
      ${plan && plan.status === 'cancelled' ? '<button class="btn" type="submit" name="reopen" value="1">Reopen</button>' : ''}
      <span class="hint">Cmd/Ctrl+Enter saves</span>
      ${plan ? '<button class="btn danger" type="button" id="deleteBtn">Delete</button>' : ''}
    </div>
    </form>
    ${plan ? '<div id="reviewMount" style="margin-top:16px"></div>'
           : '<section class="card muted" style="margin-top:16px">Save the trade to attach screenshots and export it.</section>'}
  `;

  mountCommitments(el.querySelector('#commitMount'), 'futures');
  const form = el.querySelector('#futForm');
  const g = n => { const x = form.elements[n]; if (!x) return null; const v = parseFloat(String(x.value).replace(/[$,]/g, '')); return Number.isNaN(v) ? null : v; };
  const set = (id, t) => { el.querySelector('#' + id).textContent = t; };
  const usd = v => (v === null ? '–' : money(v));

  function update() {
    const r = futuresPlan({ entry: g('entry_price'), stop: g('stop_price'), target: g('target_price'), contracts: g('qty'), pointValue: g('point_value'),
      tickSize: g('tick_size'), balance: g('account_balance'), riskPct: g('risk_pct'), direction: form.elements.direction.value || 'long',
      margin: g('margin_used'), dailyLimit: g('daily_loss_limit'), maxContracts: g('max_contracts') });
    set('fRPC', usd(r.risk_per_contract)); set('fRT', r.risk_ticks === null ? '–' : String(r.risk_ticks));
    set('fLoss', usd(r.planned_loss)); set('fLossPct', r.loss_pct_account === null ? '–' : r.loss_pct_account + '%');
    set('fProfit', usd(r.potential_profit)); set('fRR', r.rr === null ? '–' : r.rr + ' : 1');
    set('fBudget', usd(r.risk_budget)); set('fMax', r.max_by_risk === null ? '–' : String(r.max_by_risk));
    const v = [];
    if (r.within_budget !== null) v.push([r.within_budget, r.within_budget ? 'Within risk budget' : 'Over risk budget']);
    if (r.within_daily_limit !== null) v.push([r.within_daily_limit, r.within_daily_limit ? 'Within daily loss limit' : 'Over daily loss limit']);
    if (r.within_max_contracts !== null) v.push([r.within_max_contracts, r.within_max_contracts ? 'Within max contracts' : 'Over max contracts']);
    if (r.margin_ok !== null) v.push([r.margin_ok, r.margin_ok ? 'Margin fits available $' : 'Margin exceeds available $']);
    el.querySelector('#fVerdicts').innerHTML = v.map(([ok, t]) => `<span class="v ${ok ? 'ok' : 'bad'}">${t}</span>`).join('')
      + r.warnings.map(w => `<span class="v bad">${esc(w)}</span>`).join('');
  }
  form.addEventListener('input', update); form.addEventListener('change', update); update();

  const tracker = trackNewButton(form, el.querySelector('#newBtn'), { isSaved: () => !!plan, newRoute: 'futures/new' });
  let balTouched = !!plan, programmatic = false;
  form.elements.account_balance.addEventListener('input', () => { if (!programmatic) balTouched = true; });
  form.addEventListener('change', (ev) => {
    if (ev.target.name !== 'account') return;
    const s = capFor(ev.target.value);
    el.querySelector('#capStrip').innerHTML = stripHtml(s, 'Futures');
    if (!balTouched) { programmatic = true; form.elements.account_balance.value = availStr(s); programmatic = false; update(); }
  });
  // Picking a contract pre-fills the point value and tick size (still editable) and the symbol if it is empty.
  el.querySelector('#i_contract').addEventListener('change', (ev) => {
    const c = FUTURES_CONTRACTS.find(x => x[0] === ev.target.value);
    if (!c) return;
    form.elements.point_value.value = String(c[2]); form.elements.tick_size.value = String(c[3]);
    if (!form.elements.ticker.value.trim()) form.elements.ticker.value = c[0];
    form.elements.point_value.dispatchEvent(new Event('input', { bubbles: true }));
  });
  form.elements.ticker.addEventListener('input', () => { form.elements.ticker.value = form.elements.ticker.value.toUpperCase(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.dataset.saving) return;
    form.dataset.saving = '1';
    const fd = new FormData(form);
    const obj = { emotions: fd.getAll('emotions'), violations: fd.getAll('violations') };
    for (const [k, v] of fd.entries()) if (k !== 'emotions' && k !== 'violations') obj[k] = v;
    if (e.submitter && e.submitter.name === 'cancel') obj.cancel = '1';
    if (e.submitter && e.submitter.name === 'reopen') obj.reopen = '1';
    const btns = form.querySelectorAll('button[type=submit]');
    btns.forEach(b => { b.disabled = true; });
    try {
      const id = await saveFuturesTrade(plan ? plan.id : null, obj, settings);
      const before = window.location.hash;
      navigate(`futures/${id}`);
      if (window.location.hash === before) await dispatch();
    } catch (err) { alert('Could not save: ' + (err.message || err)); console.error(err); }
    btns.forEach(b => { b.disabled = false; });
    delete form.dataset.saving;
  });
  document.addEventListener('keydown', function saveShortcut(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && document.body.contains(form)) { e.preventDefault(); form.querySelector('button[type=submit]').click(); }
  });
  const del = el.querySelector('#deleteBtn');
  if (del) del.addEventListener('click', async () => {
    if (!confirm('Delete this futures trade and its screenshots?')) return;
    await deletePlan('futures', plan.id); navigate('futures');
  });
  const reviewMount = el.querySelector('#reviewMount');
  if (reviewMount && plan) mountShotsPanel(reviewMount, { kind: 'futures', refId: plan.id, tradeData: plan });
  void tracker; void px;
}
