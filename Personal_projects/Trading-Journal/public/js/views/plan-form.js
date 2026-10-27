// Port of app/templates/plan_form.html + app/static/plan.js.
import { getPlan, savePlan, deletePlan, getSettings } from '../db.js';
import { optionsPlan, swingPlan, num as calcNum, liquidityVerdict, pctOf, premiumAt, stockAtPremium, premiumAtModel, stockAtPremiumModel, optionsSanity, LIQUIDITY } from '../calc.js';
import { OPTIONS_CHECKLIST, SWING_CHECKLIST, EXIT_SCENARIOS, TIMEFRAMES, RULES_TEXT } from '../constants.js';
import { money, px, num as fmtNum, signclass, esc, pct } from '../format.js';
import { navigate, dispatch } from '../router.js';
import { fld, yn, acctPick } from '../fields.js';
import { cleanDate, formatUsd } from '../numeric.js';
import { mountReviewPanel } from '../review-panel.js';

const KIND_LABEL = { options: 'Options', swing: 'Swing' };

function planVsActual(p) {
  if (p.actual_entry === null || p.actual_entry === undefined) return [];
  const rows = [['Entry price', p.entry_price, p.actual_entry, null]];
  if (p.actual_exit !== null && p.actual_exit !== undefined) {
    let where = '';
    if (p.target_price !== null && p.actual_exit >= p.target_price) where = 'at or beyond target';
    else if (p.stop_price !== null && p.actual_exit <= p.stop_price) where = 'at or beyond stop';
    else if (p.target_price !== null && p.stop_price !== null) where = 'between stop and target';
    rows.push([`Exit price (plan: stop ${p.stop_price ?? ''} / target ${p.target_price ?? ''})`, null, p.actual_exit, where]);
    rows.push([`P/L ($) (plan: -${p.planned_loss ?? ''} / +${p.potential_profit ?? ''})`, null, p.realized_pl, null]);
    rows.push([`R multiple (plan reward-to-risk ${p.rr ?? 'n/a'})`, p.rr, p.realized_r, null]);
    if (p.est_premium_stop !== null && p.est_premium_stop !== undefined) {
      // A loser is judged against the stop estimate, a winner against the target estimate.
      const loser = p.actual_exit < p.actual_entry;
      const est = loser ? p.est_premium_stop : p.est_premium_target;
      if (est !== null && est !== undefined) {
        const off = p.actual_exit - est;
        rows.push([`Premium estimate at stock ${loser ? 'stop' : 'target'} (${p.est_method})`, est, p.actual_exit,
          `${off >= 0 ? '+' : '-'}$${Math.abs(off).toFixed(2)} per share vs estimate (${est ? (off / est * 100).toFixed(0) : '0'}%); estimate assumes the planned hold`]);
      }
    }
    if (p.planned_loss && p.realized_pl !== null && p.realized_pl < 0 && Math.abs(p.realized_pl) > p.planned_loss) {
      rows.push(['Loss vs planned loss', p.planned_loss, Math.abs(p.realized_pl), 'loss exceeded the plan']);
    }
  }
  return rows;
}

export async function render(kind, params, el) {
  const isNew = params.id === 'new';
  const plan = isNew ? null : await getPlan(params.id);
  const settings = await getSettings();
  const opt = kind === 'options';
  const p = plan || {
    plan_date: new Date().toISOString().slice(0, 10), account: 'paper',
    direction: opt ? 'call' : 'long', account_balance: settings.account_balance,
    qty: opt ? 1 : '', risk_pct: opt ? settings.options_risk_pct : settings.swing_risk_pct, status: 'planned',
  };
  const ticks = plan ? (plan.checklist || {}) : {};
  const items = opt ? OPTIONS_CHECKLIST : SWING_CHECKLIST;
  const result = plan ? planVsActual(plan) : [];

  el.innerHTML = `
    <div class="head"><h1>${plan ? `${esc(plan.ticker)} · ${KIND_LABEL[kind]}` : `New ${kind} plan`}
      ${plan ? `<span class="pill ${esc(plan.status)}">${esc(plan.status)}</span>` : ''}</h1>
      <a class="btn" href="#/${kind}">All ${kind} trades</a></div>

    <form id="planForm" data-kind="${kind}" data-min-rr="${esc(settings.swing_min_rr)}" autocomplete="off">
    <div class="sheet">
      <div class="rowline" id="r-plan"><div class="rl"><i>1</i>Plan<br>before entry</div>
        <div class="cells">
          ${acctPick(p.account)}
          ${fld('ticker', 'Ticker', p.ticker || '', 'f-sm', { extra: `class="upper" required ${plan ? '' : 'autofocus'}` })}
          <div class="fld"><span class="lab">Direction</span>
            <div class="seg">${(opt ? ['call', 'put'] : ['long', 'short']).map(d =>
              `<label><input type="radio" name="direction" value="${d}" ${p.direction === d ? 'checked' : ''}><span>${d[0].toUpperCase() + d.slice(1)}</span></label>`).join('')}</div></div>
          ${fld('plan_date', 'Plan date', p.plan_date, 'f-md', { hint: 'YYYY-MM-DD' })}
          ${opt ? fld('strike', 'Strike', px(p.strike), 'f-sm', { mode: 'decimal' }) : ''}
          ${opt ? fld('expiry', 'Expiry', p.expiry || '', 'f-md', { hint: 'YYYY-MM-DD' }) : ''}
          ${opt ? fld('delta', 'Delta', fmtNum(p.delta), 'f-xs', { mode: 'decimal' }) : ''}
          ${opt ? fld('gamma', 'Gamma', fmtNum(p.gamma), 'f-xs', { mode: 'decimal', hint: 'optional' }) : ''}
          ${opt ? fld('theta', 'Theta', fmtNum(p.theta), 'f-xs', { mode: 'decimal', hint: '$/day' }) : ''}
          ${opt ? fld('iv', 'IV %', fmtNum(p.iv), 'f-xs', { mode: 'decimal', hint: 'implied vol' }) : ''}
          ${opt ? fld('iv_shift', 'IV change', fmtNum(p.iv_shift), 'f-xs', { mode: 'decimal', hint: 'pts at exit' }) : ''}
          ${opt ? fld('hold_days', 'Hold days', fmtNum(p.hold_days), 'f-xs', { mode: 'decimal', hint: 'planned' }) : ''}
          ${fld('thesis', 'Thesis', p.thesis || '', 'f-fill', { hint: 'trend · level · trigger',
            placeholder: opt ? 'e.g. Daily uptrend; 4H pullback to 8 EMA near 768 support; enter on 15M reclaim, hold intraday' : 'e.g. Weekly uptrend; daily base breakout above 52; enter on 1H close above, hold days to weeks' })}
        </div></div>

      ${opt ? `<div class="rowline"><div class="rl"><i>·</i>Stock</div>
        <div class="cells">
          ${fld('underlying_entry', 'Stock @ entry', px(p.underlying_entry), 'f-sm', { mode: 'decimal' })}
          ${fld('underlying_stop', 'Stock stop', px(p.underlying_stop), 'f-sm', { mode: 'decimal' })}
          ${fld('underlying_target', 'Stock target', px(p.underlying_target), 'f-sm', { mode: 'decimal' })}
          <p class="muted tf" style="align-self:center">${esc(TIMEFRAMES[kind])}</p>
        </div>
        <div></div>
        <div class="cells" style="grid-column:2;flex-direction:column;align-items:stretch;gap:6px">
          <div class="verdicts" id="fMove"></div>
          <p class="muted" id="fMoveNote" style="margin:0;font-size:12px">Enter what you have. With IV, strike and expiry it reprices with Black-Scholes (covers gamma, theta, faster decay near expiry and IV change). Without IV it uses delta, plus gamma and theta if entered. Either way it's an approximation; the model is measured against your entry premium.</p>
        </div></div>` : ''}

      <div class="rowline plan"><div class="rl"><i>·</i>${opt ? 'Premiums' : 'Prices'}<br>and size</div>
        <div class="cells">
          ${fld('entry_price', opt ? 'Entry premium' : 'Entry $', px(p.entry_price), 'f-sm', { mode: 'decimal' })}
          ${fld('stop_price', opt ? 'Stop premium' : 'Stop $', px(p.stop_price), 'f-sm', { mode: 'decimal' })}
          ${fld('target_price', opt ? 'Target premium' : 'Target $', px(p.target_price), 'f-sm', { mode: 'decimal' })}
          ${fld('qty', opt ? 'Contracts' : 'Shares', fmtNum(p.qty), 'f-xs', { mode: 'numeric' })}
          ${fld('account_balance', 'Account $', fmtNum(p.account_balance), 'f-sm', { mode: 'decimal' })}
          ${fld('risk_pct', 'Risk %', fmtNum(p.risk_pct), 'f-xs', { mode: 'decimal' })}
        </div></div>

      <div class="rowline band" id="r-forecast"><div class="rl top0"><i>Σ</i>Forecast</div>
        <div class="cells" style="flex-direction:column;align-items:stretch;gap:8px">
          <div class="forecast">
            <div class="fc"><span>Investment</span><b id="fInvest">–</b></div>
            <div class="fc"><span>Risk budget</span><b id="fBudget">–</b></div>
            <div class="fc loss"><span>Planned loss</span><b id="fLoss">–</b></div>
            <div class="fc loss"><span>Loss % of account</span><b id="fLossPct">–</b></div>
            <div class="fc loss"><span>Loss % of cost</span><b id="fLossCost">–</b></div>
            <div class="fc gain"><span>Potential profit</span><b id="fProfit">–</b></div>
            <div class="fc gain"><span>Profit % of account</span><b id="fProfitPct">–</b></div>
            <div class="fc rr"><span>Reward : risk</span><b id="fRR">–</b></div>
            <div class="fc"><span>${opt ? 'Max contracts' : 'Max shares'}</span><b id="fMax">–</b></div>
          </div>
          <div class="verdicts" id="fVerdicts"></div>
        </div></div>

      ${opt ? `<div class="rowline"><div class="rl"><i>·</i>Liquidity</div>
        <div class="cells">
          <div class="fld f-xs"><label for="i_bid">Bid</label><span class="usd"><input id="i_bid" name="bid" value="${esc(px(p.bid) ?? '')}" inputmode="decimal" data-usd="1" autocomplete="off"></span></div>
          <div class="fld f-xs"><label for="i_ask">Ask</label><span class="usd"><input id="i_ask" name="ask" value="${esc(px(p.ask) ?? '')}" inputmode="decimal" data-usd="1" autocomplete="off"></span></div>
          ${fld('bid_ask_spread', 'Spread $', px(p.bid_ask_spread), 'f-sm', { mode: 'decimal', hint: 'ask − bid' })}
          ${fld('volume', 'Volume', fmtNum(p.volume), 'f-sm', { mode: 'numeric', hint: 'higher' })}
          ${fld('open_interest', 'Open interest', fmtNum(p.open_interest), 'f-md', { mode: 'numeric', hint: 'higher' })}
        </div>
        <div></div>
        <div class="cells" style="grid-column:2;flex-direction:column;align-items:stretch;gap:6px">
          <div class="verdicts" id="fLiq"></div>
          <p class="muted" style="margin:0;font-size:12px">Spread is measured against the entry premium. Liquid = spread up to ${LIQUIDITY.spreadGoodPct}% (acceptable to ${LIQUIDITY.spreadOkPct}%), volume ${LIQUIDITY.minVolume}+, open interest ${LIQUIDITY.minOpenInterest}+. Type bid and ask and the spread fills in.</p>
        </div></div>` : ''}

      <div class="rowline" id="r-check"><div class="rl top0"><i>2</i>Entry<br>checklist</div>
        <div class="cells" style="flex-direction:column;align-items:stretch;gap:2px">
          ${items.map(([key, text]) => `<label class="check"><input type="checkbox" name="chk_${key}" ${ticks[key] ? 'checked' : ''}> ${esc(text)}</label>`).join('')}
        </div></div>

      <div class="rowline" id="r-entry"><div class="rl"><i>3</i>Entry<br>actuals<small class="muted" style="display:block;font-weight:400">after you enter</small></div>
        <div class="cells">
          ${fld('entry_date', 'Entry date', p.entry_date || '', 'f-md', { hint: 'YYYY-MM-DD' })}
          ${fld('actual_entry', 'Actual entry', px(p.actual_entry), 'f-sm', { mode: 'decimal' })}
          ${yn('entry_followed', p.entry_followed, 'Entry strategy followed')}
        </div></div>

      <div class="rowline" id="r-exit"><div class="rl"><i>4</i>Exit<br>actuals<small class="muted" style="display:block;font-weight:400">after you exit</small></div>
        <div class="cells">
          ${fld('exit_date', 'Exit date', p.exit_date || '', 'f-md', { hint: 'YYYY-MM-DD' })}
          ${fld('actual_exit', 'Actual exit', px(p.actual_exit), 'f-sm', { mode: 'decimal' })}
          ${fld('fees', 'Fees $', px(p.fees), 'f-xs', { mode: 'decimal' })}
          <div class="fld f-fill"><label for="exit_scenario">What happened at the exit</label>
            <select name="exit_scenario" id="exit_scenario"><option value="">–</option>
            ${EXIT_SCENARIOS.map(([k, t, y]) => `<option value="${k}" data-followed="${y}" ${p.exit_scenario === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
          ${yn('exit_followed', p.exit_followed, 'Exit strategy followed')}
        </div>
        <div></div>
        <div class="cells" style="grid-column:2">
          ${fld('exit_reason', 'Exit reason / lessons', p.exit_reason || '', 'f-fill')}
          <div class="fld f-fill"><label for="i_notes">Notes</label><textarea id="i_notes" name="notes" rows="1">${esc(p.notes || '')}</textarea></div>
        </div>
        <div></div>
        <details style="grid-column:2" ${p.orders_text ? 'open' : ''}><summary>Order details (paste from the broker, used by the review)</summary>
          <textarea name="orders_text" rows="4">${esc(p.orders_text || '')}</textarea></details>
      </div>
    </div>

    ${result.length ? `<section class="card" id="r-compare"><h2>Plan vs actual</h2>
      <table><thead><tr><th></th><th>Planned</th><th>Actual</th><th></th></tr></thead><tbody>
      ${result.map(([label, planned, actual, note]) => `<tr><td>${esc(label)}</td><td>${planned !== null && planned !== undefined ? px(planned) : ''}</td>
        <td><b>${actual !== null && actual !== undefined ? px(actual) : ''}</b></td><td class="muted">${esc(note || '')}</td></tr>`).join('')}
      ${plan && plan.realized_pl !== null && plan.realized_pl !== undefined ? `<tr class="total"><td>Realized</td><td></td>
        <td><b class="${signclass(plan.realized_pl)}">${money(plan.realized_pl)}</b></td>
        <td class="muted">${plan.roi !== null && plan.roi !== undefined ? 'ROI ' + fmtNum(plan.roi) + '%' : ''}${pctOf(plan.realized_pl, plan.account_balance) !== null ? ' · ' + pct(pctOf(plan.realized_pl, plan.account_balance)) + ' of account' : ''}</td></tr>` : ''}
      </tbody></table></section>` : ''}

    <div class="actions">
      <button class="btn primary" type="submit">Save</button>
      ${plan && plan.status !== 'cancelled' && plan.status !== 'closed' ? `<button class="btn" type="submit" name="cancel" value="1">Cancel plan</button>` : ''}
      ${plan && plan.status === 'cancelled' ? `<button class="btn" type="submit" name="reopen" value="1">Reopen</button>` : ''}
      <span class="hint">Cmd/Ctrl+Enter saves</span>
      ${plan ? `<button class="btn danger" type="button" id="deleteBtn">Delete</button>` : ''}
    </div>
    </form>

    ${plan ? `<div id="reviewMount" style="margin-top:16px"></div>`
           : `<section class="card muted" style="margin-top:16px">Save the plan to attach screenshots and run a Claude review.</section>`}
  `;

  wireForm(kind, el, settings, plan);

  const reviewMount = el.querySelector('#reviewMount');
  if (reviewMount && plan) {
    // No onApplyProposed - options/swing reviews aren't structured (no proposed fields) yet,
    // so the "Fill in" button never renders for these kinds.
    mountReviewPanel(reviewMount, { kind, refId: plan.id, tradeData: plan, rulesText: RULES_TEXT[kind], model: settings.review_model });
  }
}

function wireForm(kind, el, settings, plan) {
  const form = el.querySelector('#planForm');
  const opt = kind === 'options';
  const minRR = parseFloat(form.dataset.minRr) || 2;
  const num = n => { const el2 = form.elements[n]; if (!el2) return null; const v = parseFloat(String(el2.value).replace(/[$,]/g, '')); return Number.isNaN(v) ? null : v; };
  const moneyFmt = v => v === null ? '–' : (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2);

  function update() {
    const e = num('entry_price'), s = num('stop_price'), t = num('target_price'), q = num('qty') || 0;
    const bal = num('account_balance') || 0, pct = num('risk_pct') || 0, mult = opt ? 100 : 1;
    const dir = (form.querySelector('[name=direction]:checked') || {}).value;
    const sign = (!opt && dir === 'short') ? -1 : 1;
    const invest = e === null ? null : e * mult * q, budget = bal * pct / 100;
    let loss = null, profit = null, rr = null, max = null;
    const bad = [];
    if (e !== null && s !== null) {
      const per = (e - s) * sign;
      if (per <= 0) bad.push('Stop is on the wrong side of the entry.');
      else { loss = per * mult * q; max = Math.floor(budget / (per * mult)); }
    }
    if (e !== null && t !== null) {
      const gain = (t - e) * sign;
      if (gain <= 0) bad.push('Target is on the wrong side of the entry.');
      else profit = gain * mult * q;
    }
    if (loss && profit) rr = profit / loss;
    el.querySelector('#fInvest').textContent = moneyFmt(invest);
    el.querySelector('#fBudget').textContent = moneyFmt(budget);
    el.querySelector('#fLoss').textContent = moneyFmt(loss);
    el.querySelector('#fProfit').textContent = moneyFmt(profit);
    const pc = (id, v, sign = '') => { el.querySelector(id).textContent = v === null ? '–' : sign + v.toFixed(2) + '%'; };
    pc('#fLossPct', pctOf(loss, bal), '-'); pc('#fLossCost', pctOf(loss, invest), '-'); pc('#fProfitPct', pctOf(profit, bal), '+');
    el.querySelector('#fRR').textContent = rr === null ? '–' : rr.toFixed(2) + ' : 1';
    el.querySelector('#fMax').textContent = max === null ? '–' : String(max);
    const v = [];
    const add = (ok, good, badText) => v.push(`<span class="v ${ok ? 'ok' : 'bad'}">${ok ? '✓ ' + good : '✗ ' + badText}</span>`);
    if (invest !== null) add(invest <= bal, 'Affordable', 'Costs more than the account balance');
    if (loss !== null) add(loss <= budget, 'Within risk budget', `Planned loss ${moneyFmt(loss)} is over the ${moneyFmt(budget)} budget`);
    if (!opt && rr !== null) add(rr >= minRR, `Meets ${minRR}:1`, `Below ${minRR}:1 reward-to-risk`);
    if (!opt && v.length === 3) v.push(`<span class="v ${v.join('').indexOf('bad') < 0 ? 'ok">QUALIFIED' : 'bad">NOT QUALIFIED'}</span>`);
    bad.forEach(b => v.push(`<span class="v bad">${b}</span>`));
    el.querySelector('#fVerdicts').innerHTML = v.join('');
    if (opt) updateOptions({ e, s, t, q, mult, budget, loss });
  }

  function updateOptions({ e, s, t, q, mult, budget, loss }) {
    const dir = (form.querySelector('[name=direction]:checked') || {}).value;
    const se = num('underlying_entry'), ss = num('underlying_stop'), st = num('underlying_target'), d = num('delta');
    const chip = (ok, text) => `<span class="v ${ok ? 'ok' : 'bad'}">${ok ? '✓ ' : '✗ '}${text}</span>`;
    const info = text => `<span class="v">${text}</span>`;
    const out = [];
    optionsSanity(dir, se, ss, st, num('strike')).forEach(w => out.push(chip(false, w)));
    const gk = { gamma: num('gamma') ?? 0, theta: num('theta') ?? 0, days: num('hold_days') ?? 0 };
    const mp = { strike: num('strike'), iv: num('iv'), ivShift: num('iv_shift') ?? 0, expiry: cleanDate(form.elements.expiry.value),
      planDate: cleanDate(form.elements.plan_date.value) || undefined, days: gk.days };
    const useModel = premiumAtModel(se, se, e, dir, mp) !== null && e !== null;
    const premAt = S => useModel ? premiumAtModel(S, se, e, dir, mp) : premiumAt(S, se, d, e, dir, gk);
    const stockAt = P => useModel ? stockAtPremiumModel(P, se, e, dir, mp) : stockAtPremium(P, se, d, e, dir, gk);
    const pStop = premAt(ss), pTgt = premAt(st);
    if (pStop !== null) {
      const l = (e - pStop) * mult * q;
      out.push(info(`Stock stop ${px(ss)} → est. premium ${px(pStop)}`));
      out.push(chip(l <= budget, `est. loss ${moneyFmt(l)} ${l <= budget ? 'within' : 'over'} the ${moneyFmt(budget)} risk budget`));
      if (loss !== null && s !== null) out.push(chip(pStop >= s, pStop >= s ? `premium stop ${px(s)} is not hit before the stock stop` : `premium stop ${px(s)} is hit before the stock stop (est. at stock stop: ${px(pStop)})`));
    }
    if (pTgt !== null) out.push(info(`Stock target ${px(st)} → est. premium ${px(pTgt)} (${moneyFmt((pTgt - e) * mult * q)})`));
    const sAtStop = stockAt(s), sAtTgt = stockAt(t);
    if (sAtStop !== null) out.push(info(`Premium stop ≈ stock at ${px(sAtStop)}`));
    if (sAtTgt !== null) out.push(info(`Premium target ≈ stock at ${px(sAtTgt)}`));
    if (out.length) out.unshift(`<span class="v"><b>${useModel ? `Black-Scholes at IV ${mp.iv}%${mp.ivShift ? ` (${mp.ivShift > 0 ? '+' : ''}${mp.ivShift} pts at exit)` : ''}` : 'Delta / gamma / theta'}</b></span>`);
    el.querySelector('#fMove').innerHTML = out.join('') || '<span class="muted">Enter stock entry, stop, target, delta and the entry premium to see the estimated premium move.</span>';

    const lq = liquidityVerdict(num('bid_ask_spread'), e, num('volume'), num('open_interest'));
    const label = { liquid: 'Liquid', marginal: 'Marginal', illiquid: 'Illiquid' };
    el.querySelector('#fLiq').innerHTML = lq.verdict
      ? `<span class="v ${lq.verdict === 'liquid' ? 'ok' : lq.verdict === 'illiquid' ? 'bad' : ''}"><b>${label[lq.verdict]}</b></span>` + lq.checks.map(c => chip(c.ok, c.text)).join('')
      : '<span class="muted">Enter the spread (or bid and ask), volume and open interest for a verdict.</span>';
  }

  const bid = form.querySelector('#i_bid'), ask = form.querySelector('#i_ask');
  if (bid && ask) {
    const fill = () => {
      const b = parseFloat(bid.value), a = parseFloat(ask.value);
      if (!Number.isNaN(b) && !Number.isNaN(a) && a >= b) { form.elements.bid_ask_spread.value = formatUsd(Math.round((a - b) * 100) / 100); update(); }
    };
    bid.addEventListener('input', fill); ask.addEventListener('input', fill);
  }
  form.addEventListener('input', update); form.addEventListener('change', update); update();

  const sc = el.querySelector('#exit_scenario');
  if (sc) sc.addEventListener('change', () => {
    const f = sc.options[sc.selectedIndex].dataset.followed;
    if (!f) return;
    const r = form.querySelector(`[name=exit_followed][value=${f}]`); if (r) r.checked = true;
  });
  const t = form.elements.ticker;
  if (t) t.addEventListener('input', () => { t.value = t.value.toUpperCase(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.dataset.saving) return;
    form.dataset.saving = '1';
    const then = (e.submitter && e.submitter.name === 'cancel') ? 'cancel' : (e.submitter && e.submitter.name === 'reopen') ? 'reopen' : 'save';
    const fd = new FormData(form);
    const formObj = {};
    for (const [k, v] of fd.entries()) formObj[k] = v;
    if (then === 'cancel') formObj.cancel = '1';
    if (then === 'reopen') formObj.reopen = '1';
    const btns = form.querySelectorAll('button[type=submit]');
    btns.forEach(b => { b.disabled = true; });
    try {
      const id = await savePlan(kind, plan ? plan.id : null, formObj, settings);
      const before = window.location.hash;
      navigate(`${kind}/${id}`);
      if (window.location.hash === before) await dispatch();
    } catch (err) {
      alert('Could not save: ' + (err.message || err));
      console.error(err);
    }
    btns.forEach(b => { b.disabled = false; });
    delete form.dataset.saving;
  });

  document.addEventListener('keydown', function saveShortcut(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && document.body.contains(form)) {
      e.preventDefault(); form.querySelector('button[type=submit]').click();
    }
  });

  const deleteBtn = el.querySelector('#deleteBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Delete this plan and its screenshots?')) return;
      await deletePlan(kind, plan.id);
      navigate(kind);
      await dispatch();
    });
  }
}
