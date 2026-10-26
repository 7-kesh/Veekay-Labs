// Port of app/templates/scalp_form.html + app/static/scalp.js, restructured 2026-10-23 per
// Veekay's flow redesign: 1 Trade/Setup -> 2 Entry-exit mechanics + known S/R/confluence ->
// 3 Assessments (structure/trigger/extended/EMA/MOM/TTM/Room) -> 4 Screenshots+review (always
// available, even before the first Save - a draft auto-saves on first use) -> 5 Judgement.
// Date/time are free text now (sensitive to get exactly right, native pickers fought him).
import { getScalpTrade, saveScalpTrade, deleteScalpTrade, getSettings, listScalpTrades, getTradeHistory, priorExitTime } from '../db.js';
import { scalpResult, parseExits, num as calcNum } from '../calc.js';
import { run as ruleEngineRun } from '../rule-engine.js';
import { SETUPS, CATEGORIES, VIOLATIONS, EMOTIONS, ORDER_TYPES, MOM_SIGNS, TTM_COLORS, DIRECTIONS } from '../constants.js';
import { money, px, num as fmtNum, signclass, esc, localDatetime } from '../format.js';
import { navigate, dispatch } from '../router.js';
import * as setupC from '../setup-c.js';
import { rulesTextFor } from '../strategy.js';
import { mountReviewPanel } from '../review-panel.js';
import { fld, yn, chips, acctPick } from '../fields.js';

export async function render(params, el) {
  const isNew = params.id === 'new';
  let trade = isNew ? null : await getScalpTrade(params.id);
  const settings = await getSettings();
  const t = trade || {
    date: new Date().toISOString().slice(0, 10), account: 'paper', ticker: params.ticker || '',
    shares: settings.default_shares, commission: settings.default_commission,
  };
  const recent = isNew ? await listScalpTrades({ date: t.date, limit: 3 }) : [];
  const history = trade ? await getTradeHistory(trade.id) : [];
  const setupCRow = trade ? await setupC.get(trade.id) : null;

  el.innerHTML = `
    <div class="head"><h1>${trade ? `Edit ${esc(trade.trade_no)} &middot; ${esc(trade.ticker)}` : 'New scalp trade'}</h1>
      <a class="btn" href="#/scalp">All scalp trades</a></div>

    <form id="scalpForm" data-risk="${esc(settings.scalp_risk_dollars)}" autocomplete="off">
    <div class="sheet">

      <!-- 1: Trade + Setup -->
      <div class="rowline" id="r-trade"><div class="rl"><i>1</i>Trade</div>
        <div class="cells">
          ${acctPick(t.account)}
          ${fld('ticker', 'Ticker', t.ticker, 'f-sm', { extra: `class="upper" required ${trade ? '' : 'autofocus'}` })}
          ${fld('date', 'Date', t.date, 'f-md', { hint: 'YYYY-MM-DD' })}
          <div class="fld"><span class="lab">Setup</span>
            <div class="seg">${SETUPS.map(s => `<label><input type="radio" name="setup" value="${s}" ${t.setup === s ? 'checked' : ''}><span>${s}</span></label>`).join('')}
              <label><input type="radio" name="setup" value="" ${!t.setup ? 'checked' : ''}><span>–</span></label></div></div>
        </div>
        <div></div>
        <div class="cells band" id="r-setupc" hidden style="grid-column:2;margin-top:8px">
          <div class="fld f-md"><label for="i_room_vs_risk">Room vs risk</label>
            <select id="i_room_vs_risk" name="room_vs_risk"><option value=""></option>
            ${['ample', 'tight', 'insufficient'].map(o => `<option ${setupCRow && setupCRow.room_vs_risk === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          ${yn('declared_before_entry', setupCRow ? setupCRow.declared_before_entry : '', 'Declared before entry')}
          ${yn('ema_hold_2candle', setupCRow ? setupCRow.ema_hold_2candle : '', '2 candles held 8 EMA')}
          ${yn('crossed_prev_candle_high', setupCRow ? setupCRow.crossed_prev_candle_high : '', 'Crossed prev candle high')}
          ${fld('danger_structure', 'Danger structure', setupCRow ? setupCRow.danger_structure : '', 'f-md', { hint: 'overhead resistance - double top, repeated rejection; "none" if clear' })}
          ${fld('invalidation_price', 'Invalidation $', setupCRow ? px(setupCRow.invalidation_price) : '', 'f-sm', { mode: 'decimal', hint: 'price where the thesis is proven wrong, not your stop' })}
          <div class="fld f-md"><label for="i_result">Result</label>
            <select id="i_result" name="result"><option value="">not recorded</option>
            ${Object.entries(setupC.RESULTS).map(([k, lbl]) => `<option value="${k}" ${setupCRow && setupCRow.result === k ? 'selected' : ''}>${lbl}</option>`).join('')}</select></div>
          ${fld('setup_c_notes', 'Setup C notes', setupCRow ? setupCRow.notes : '', 'f-fill')}
        </div></div>

      <!-- 2: Entry/exit mechanics, known S/R/confluence, live P&L -->
      <div class="rowline band" id="r-exits"><div class="rl"><i>2</i>Entry &amp; exit</div>
        <div class="cells">
          ${fld('entry_time', 'Entry time', t.entry_time, 'f-sm', { hint: 'HH:MM' })}
          ${fld('entry_price', 'Entry $', px(t.entry_price), 'f-sm', { mode: 'decimal' })}
          ${fld('stop', 'Stop $', px(t.stop), 'f-sm', { mode: 'decimal', hint: 'before entry' })}
          ${fld('shares', 'Shares', fmtNum(t.shares), 'f-xs', { mode: 'numeric' })}
          ${fld('commission', 'Comm $', fmtNum(t.commission), 'f-xs', { mode: 'decimal' })}
          ${fld('exit_time', 'Exit time', t.exit_time, 'f-sm', { hint: 'HH:MM' })}
          <div class="fld f-md"><label for="i_entry_order">Entry order</label><select id="i_entry_order" name="entry_order"><option value=""></option>
            ${ORDER_TYPES.map(o => `<option ${t.entry_order === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="fld f-md"><label for="i_exit_order">Exit order</label><select id="i_exit_order" name="exit_order"><option value=""></option>
            ${ORDER_TYPES.map(o => `<option ${t.exit_order === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
        </div>
        <div></div>
        <div class="cells" style="grid-column:2;margin-top:4px">
          ${fld('support_below', 'Known support', px(t.support_below), 'f-sm', { mode: 'decimal' })}
          ${fld('resistance_above', 'Known resistance', px(t.resistance_above), 'f-sm', { mode: 'decimal' })}
          <div class="fld f-md"><label for="i_confluence_strength">Confluence</label>
            <select id="i_confluence_strength" name="confluence_strength"><option value=""></option>
            ${['weak', 'moderate', 'strong'].map(o => `<option ${t.confluence_strength === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
        </div>
        <div></div>
        <div class="cells" style="grid-column:2;margin-top:4px">
          <div class="fld f-fill">
            <label for="i_exits_text">Exits</label>
            <div class="exitRows" id="exitRows"></div>
            <button type="button" class="btn sm" id="addExit">+ Add exit</button>
            <details><summary>Show raw text (fix directly, or paste a messy historical entry)</summary>
              <textarea id="i_exits_text" name="exits_text" rows="2" placeholder="50@7.11; 75@7.42">${esc(t.exits_text || '')}</textarea>
            </details>
          </div>
          <div class="live" id="calc">
            <div class="n"><span>Risk</span><b id="cRisk">–</b></div><div class="n"><span>Gross</span><b id="cGross">–</b></div>
            <div class="n"><span>Net</span><b id="cNet">–</b></div><div class="n"><span>R</span><b id="cR">–</b></div>
            <span id="cWarn" class="warn neg"></span>
          </div>
          <div id="manualNet" hidden>${fld('net_manual', 'Net P&L $', trade ? px(trade.net_pnl) : '', 'f-sm', { mode: 'decimal', hint: 'only if exits can’t be parsed' })}</div>
        </div>
        <div></div>
        <details style="grid-column:2" ${t.orders_text ? 'open' : ''}><summary>Order details (paste from the broker, used by the review)</summary>
          <textarea name="orders_text" rows="4" placeholder="Paste the order history here">${esc(t.orders_text || '')}</textarea></details>
      </div>

      <!-- 3: Assessments -->
      <div class="rowline" id="r-assess"><div class="rl"><i>3</i>Assessments</div>
        <div class="cells">
          ${yn('structure_valid', t.structure_valid, 'Structure')}
          ${yn('trigger_valid', t.trigger_valid, 'Trigger')}
          ${yn('extended', t.extended, 'Extended?')}
          ${yn('ema_alignment', t.ema_alignment, 'EMA alignment')}
          <div class="fld f-md"><label for="i_mom_sign">MOM sign</label>
            <select id="i_mom_sign" name="mom_sign"><option value=""></option>
            ${MOM_SIGNS.map(o => `<option ${t.mom_sign === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="fld f-md"><label for="i_mom_direction">MOM direction</label>
            <select id="i_mom_direction" name="mom_direction"><option value=""></option>
            ${DIRECTIONS.map(o => `<option ${t.mom_direction === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="fld f-md"><label for="i_ttm_color">TTM color</label>
            <select id="i_ttm_color" name="ttm_color"><option value=""></option>
            ${TTM_COLORS.map(o => `<option ${t.ttm_color === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="fld f-md"><label for="i_ttm_direction">TTM direction</label>
            <select id="i_ttm_direction" name="ttm_direction"><option value=""></option>
            ${DIRECTIONS.map(o => `<option ${t.ttm_direction === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
        </div>
        <div></div>
        <div class="cells" style="grid-column:2;margin-top:4px">
          <div class="live" id="roomCalc"><div class="n"><span>Room to resistance</span><b id="cRoom">–</b></div><span id="roomWarn" class="warn neg"></span></div>
        </div></div>
    </div>

    <!-- 4: Screenshots + review - always enabled, even before the first Save -->
    <div id="reviewMount" style="margin:16px 0"></div>

    <div class="sheet">
      <div class="rowline" id="r-judge"><div class="rl"><i>5</i>Judgement</div>
        <div class="cells">
          ${yn('entry_valid', t.entry_valid, 'Entry valid')}
          ${yn('exit_valid', t.exit_valid, 'Exit valid')}
          <div class="fld f-lg"><label for="i_category">Category <small id="catHint"></small></label>
            <select id="i_category" name="category"><option value="">auto</option>
            ${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}" ${t.category === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          ${trade ? `
          <div class="fld"><span class="lab">2-candle tally <small>Setup A/B only</small></span>
            <div class="seg" role="radiogroup" aria-label="2-candle tally">
              ${[['success', 'Success'], ['fail', 'Fail'], ['contaminated', 'Contaminated'], ['', '–']].map(([v, lbl]) =>
                `<label><input type="radio" name="tally_2candle" value="${v}" ${(t.tally_2candle || '') === v ? 'checked' : ''}><span>${lbl}</span></label>`).join('')}
            </div></div>
          <div class="fld f-fill">
            <button type="button" class="btn" id="checkRules">Check against rules</button>
            <div id="rulesOut" class="rules-out"></div>
          </div>` : ''}
        </div>
        <div></div>
        <div class="cells" style="grid-column:2;flex-direction:column;align-items:stretch;gap:8px;margin-top:4px">
          <div class="fld"><span class="lab">Violations</span>${chips('violations', VIOLATIONS, (t.violations || '').split('; '), 'bad')}</div>
          <div class="fld"><span class="lab">Emotions</span>${chips('emotions', EMOTIONS, (t.emotions || '').split('; '), 'feel')}</div>
          <div class="fld f-fill"><label for="i_notes">Notes / what I learned</label><textarea id="i_notes" name="notes" rows="2">${esc(t.notes || '')}</textarea></div>
        </div></div>
    </div>

    <div class="actions">
      ${!trade ? `<button class="btn" type="submit" name="then" value="new">Save and add another</button>` : ''}
      <button class="btn primary" type="submit" name="then" value="save">Save</button>
      <button class="btn primary" type="submit" name="then" value="complete">Complete review</button>
      <span class="hint">Cmd/Ctrl+Enter saves · "Save" leaves it for later review, "Complete review" closes it out</span>
      ${trade ? `<button class="btn danger" type="button" id="deleteBtn">Delete</button>` : ''}
    </div>
    </form>

    ${recent.length ? `<section class="card" style="margin-top:16px"><h2>Earlier today</h2><table class="dense"><tbody>
      ${recent.map(r => `<tr><td>${esc(r.trade_no)}</td><td><b>${esc(r.ticker)}</b></td><td>${px(r.entry_price)}</td>
        <td class="${signclass(r.net_pnl)}">${money(r.net_pnl)}</td><td>${esc(r.category || '')}</td>
        <td><a href="#/scalp/${r.id}">edit</a></td></tr>`).join('')}</tbody></table></section>` : ''}

    ${trade && history.length ? `<section class="card" style="margin-top:16px"><h2>History</h2>
      <table class="dense"><thead><tr><th>When</th><th>Field</th><th>Old</th><th>New</th><th>Source</th></tr></thead><tbody>
      ${history.map(h => `<tr><td>${esc(localDatetime(h.created_at))}</td><td>${esc(h.field)}</td>
        <td>${esc(h.old_value || '(empty)')}</td><td>${esc(h.new_value || '(empty)')}</td>
        <td>${h.source === 'claude-suggested' ? 'Claude suggested' : 'Manual'}</td></tr>`).join('')}
      </tbody></table></section>` : ''}
  `;

  wireForm();

  const reviewMount = el.querySelector('#reviewMount');
  const rulesText = await rulesTextFor('scalp', t.date);
  mountReviewPanel(reviewMount, {
    kind: 'scalp', refId: trade ? trade.id : null, tradeData: trade,
    rulesText, model: settings.review_model,
    onApplyProposed: (proposed) => applyProposed(proposed),
    // Called on first upload/review action if no trade exists yet - saves a draft from
    // whatever is currently in the form (Veekay's "always enable Claude to upload
    // screenshots" - screenshots and review work before the first explicit Save).
    ensureRefId: async () => {
      const id = await persist(collectFormValues());
      trade = await getScalpTrade(id);
      history.length = 0; // stale now; next natural re-render (e.g. after Save) will refresh it
      if (!window.location.hash.endsWith('/scalp/' + id)) window.history.replaceState(null, '', '#/scalp/' + id);
      return { id, tradeData: trade };
    },
  });

  // ---- everything below shares `trade`/`t`/`el` via closure, same as before but as nested
  // functions so a lazily-created draft (see ensureRefId above) stays the single source of truth.

  // Every save goes through here: one at a time, and once a new trade has an id later saves update
  // that row instead of inserting another (frozen page + repeated Save used to create duplicates).
  let savedId = trade ? trade.id : null, saveChain = Promise.resolve();
  function persist(formObj) {
    const run = saveChain.then(async () => {
      savedId = await saveScalpTrade(savedId, formObj, settings);
      return savedId;
    });
    saveChain = run.catch(() => {});
    return run;
  }

  function collectFormValues() {
    const form = el.querySelector('#scalpForm');
    const fd = new FormData(form);
    const formObj = {};
    for (const [k, v] of fd.entries()) {
      if (k === 'violations' || k === 'emotions') { (formObj[k] ||= []).push(v); continue; }
      formObj[k] = v;
    }
    formObj.violations ||= []; formObj.emotions ||= [];
    return formObj;
  }

  function applyProposed(p) {
    const form = el.querySelector('#scalpForm');
    if (!form) return;
    ['setup', 'setup_valid', 'entry_valid', 'exit_valid',
      'structure_valid', 'trigger_valid', 'extended', 'ema_alignment'].forEach((name) => {
      if (!p[name]) return;
      const r = form.querySelector(`input[name="${name}"][value="${p[name]}"]`);
      if (r) r.checked = true;
    });
    ['category', 'mom_sign', 'mom_direction', 'ttm_color', 'ttm_direction'].forEach((name) => {
      if (!p[name]) return;
      const sel = form.querySelector(`select[name="${name}"]`);
      if (sel) sel.value = p[name];
    });
    ['violations', 'emotions'].forEach((name) => {
      const vals = p[name] || [];
      form.querySelectorAll(`input[name="${name}"]`).forEach((cb) => { cb.checked = vals.includes(cb.value); });
    });
    form.dispatchEvent(new Event('change'));
  }

  function wireForm() {
    const form = el.querySelector('#scalpForm');
    const $ = n => form.elements[n];

    function val(name) { const r = form.querySelector(`[name=${name}]:checked`); return r ? r.value : ''; }
    function suggest(setup, ev, xv, hasViol) {
      if (setup === 'C') return 'X';
      if (ev === 'N') return 'C';
      if (ev === 'Y') return (xv === 'Y' && !hasViol) ? 'A' : 'B';
      return '';
    }

    function update() {
      const e = calcNum($('entry_price').value), sh = calcNum($('shares').value), st = calcNum($('stop').value), cm = calcNum($('commission').value) || 0;
      const res = scalpResult(e, sh, st, $('exits_text').value, cm);
      const budget = parseFloat(form.dataset.risk);
      const warn = [];
      const fills = (e && sh) ? parseExits($('exits_text').value, sh) : null;
      if (fills) {
        const sold = fills.reduce((s, [q]) => s + q, 0);
        if (sold > sh) warn.push('Exits sell more shares than you bought.');
      }
      if (st && e && st >= e) warn.push('Stop should be below the entry.');
      if (res.planned_risk && res.planned_risk > budget) warn.push(`Planned risk is over your ${money(budget)} 1R.`);
      el.querySelector('#cRisk').textContent = money(res.planned_risk);
      el.querySelector('#cGross').textContent = money(res.gross_pnl);
      const n = el.querySelector('#cNet'); n.textContent = money(res.net_pnl); n.className = res.net_pnl === null ? '' : (res.net_pnl >= 0 ? 'pos' : 'neg');
      el.querySelector('#cR').textContent = res.r_multiple === null ? '–' : res.r_multiple.toFixed(2) + 'R';
      el.querySelector('#cWarn').textContent = warn.join(' ');
      el.querySelector('#manualNet').hidden = !($('exits_text').value.trim() && !fills);

      // Room to resistance: (resistance - entry) >= (entry - stop), same 1R rule as the gate.
      const resAbove = calcNum($('resistance_above').value);
      const roomOut = el.querySelector('#cRoom'), roomWarn = el.querySelector('#roomWarn');
      if (e !== null && resAbove !== null) {
        const room = resAbove - e;
        roomOut.textContent = money(room);
        roomOut.className = st !== null && room < (e - st) ? 'neg' : 'pos';
        roomWarn.textContent = (st !== null && room < (e - st)) ? `Less than 1R of room (need ≥ ${money(e - st)}).` : '';
      } else {
        roomOut.textContent = '–'; roomOut.className = ''; roomWarn.textContent = '';
      }

      const cat = suggest(val('setup'), val('entry_valid'), val('exit_valid'),
        form.querySelectorAll('[name=violations]:checked').length > 0);
      el.querySelector('#catHint').textContent = (!$('category').value && cat) ? `(auto: ${cat})` : '';
      const setupCSection = el.querySelector('#r-setupc');
      if (setupCSection) setupCSection.hidden = val('setup') !== 'C';
    }
    form.addEventListener('input', update);
    form.addEventListener('change', update);

    $('ticker').addEventListener('input', () => { $('ticker').value = $('ticker').value.toUpperCase(); });

    // Exit-leg row builder - one-way sync, rows -> the real exits_text textarea.
    (function () {
      const exitsField = $('exits_text'), rowsEl = el.querySelector('#exitRows'), addBtn = el.querySelector('#addExit');
      if (!exitsField || !rowsEl) return;
      function parseToken(tok) {
        tok = tok.trim();
        if (!tok) return null;
        const m = /^(?:(\d+(?:\.\d+)?)\s*@\s*)?\$?(\d+(?:\.\d+)?)\s*(.*)$/.exec(tok);
        if (!m) return { shares: '', price: '', note: tok };
        let note = m[3].trim();
        if (note.charAt(0) === '(') note = note.slice(1);
        if (note.charAt(note.length - 1) === ')') note = note.slice(0, -1);
        return { shares: m[1] || '', price: m[2], note };
      }
      function tokenFromRow(r) {
        const sh = r.shares.trim(), pr = r.price.trim(), note = r.note.trim();
        if (!pr) return '';
        return (sh ? sh + '@' : '') + pr + (note ? ` (${note})` : '');
      }
      function addRow(shares, price, note) {
        const row = document.createElement('div');
        row.className = 'exitRow';
        row.innerHTML =
          `<input type="text" class="exShares" placeholder="shares" inputmode="numeric" value="${esc(shares)}">` +
          `<span class="exAt">@</span>` +
          `<input type="text" class="exPrice" placeholder="price" inputmode="decimal" value="${esc(price)}">` +
          `<input type="text" class="exNote" placeholder="time / note (optional)" value="${esc(note)}">` +
          `<button type="button" class="exRemove" title="Remove this exit">×</button>`;
        row.querySelector('.exRemove').addEventListener('click', () => { row.remove(); syncExits(); });
        rowsEl.appendChild(row);
      }
      function syncExits() {
        const rows = Array.from(rowsEl.querySelectorAll('.exitRow')).map(row => ({
          shares: row.querySelector('.exShares').value, price: row.querySelector('.exPrice').value, note: row.querySelector('.exNote').value,
        }));
        exitsField.value = rows.map(tokenFromRow).filter(Boolean).join('; ');
        update();
      }
      rowsEl.addEventListener('input', syncExits);
      addBtn.addEventListener('click', () => addRow('', '', ''));
      const seeded = exitsField.value.split(/[;\n]/).map(parseToken).filter(Boolean);
      if (seeded.length) seeded.forEach(r => addRow(r.shares, r.price, r.note));
      else addRow('', '', '');
    })();

    update();

    // Rule engine check - runs against the CURRENT form values, nothing is saved by this.
    const checkBtn = el.querySelector('#checkRules');
    if (checkBtn) {
      checkBtn.addEventListener('click', async () => {
        const out = el.querySelector('#rulesOut');
        out.textContent = 'Checking…'; checkBtn.disabled = true;
        try {
          const formTrade = {
            entry_price: $('entry_price').value, stop: $('stop').value, shares: $('shares').value,
            entry_time: $('entry_time').value, category: $('category').value,
            violations: Array.from(form.querySelectorAll('[name=violations]:checked')).map(c => c.value),
          };
          const prior = trade ? await priorExitTime(t.ticker.toUpperCase(), $('date').value, trade.id, formTrade.entry_time) : null;
          const riskDollars = parseFloat(settings.scalp_risk_dollars || 20) || 20;
          const flags = ruleEngineRun(formTrade, prior, riskDollars);
          out.innerHTML = flags.map(fl => {
            const cls = fl.status === 'pass' ? 'ok' : (fl.status === 'insufficient_evidence' ? 'warn' : 'neg');
            return `<div class="flagrow ${cls}"><b>${fl.check.replace(/_/g, ' ')}</b> ${esc(fl.message)}</div>`;
          }).join('');
        } catch (e) {
          out.textContent = 'Could not run the checks.';
          console.error(e);
        }
        checkBtn.disabled = false;
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.dataset.saving) return; // a save is already running; ignore repeated clicks
      form.dataset.saving = '1';
      const then = (e.submitter && e.submitter.value) || 'save'; // "new" | "save" | "complete"
      const formObj = collectFormValues();
      formObj.review_status = then === 'complete' ? 'complete' : 'draft';
      const submitBtns = form.querySelectorAll('button[type=submit]');
      submitBtns.forEach(b => { b.disabled = true; });
      try {
        const id = await persist(formObj);
        const before = window.location.hash;
        if (then === 'new') {
          navigate(`scalp/new?ticker=${encodeURIComponent(formObj.ticker || '')}`);
        } else if (then === 'complete') {
          navigate('scalp');
        } else {
          navigate(`scalp/${id}`);
        }
        if (window.location.hash === before) await dispatch();
      } catch (err) {
        alert('Could not save: ' + (err.message || err));
        console.error(err);
      }
      submitBtns.forEach(b => { b.disabled = false; });
      delete form.dataset.saving;
    });

    document.addEventListener('keydown', function saveShortcut(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && document.body.contains(form)) {
        e.preventDefault(); form.querySelector('button[name=then][value=save]').click();
      }
    });

    const deleteBtn = el.querySelector('#deleteBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Delete this trade and its screenshots?')) return;
        await deleteScalpTrade(trade.id);
        navigate('scalp');
        await dispatch();
      });
    }
  }
}
