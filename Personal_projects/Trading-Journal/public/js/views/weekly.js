// Weekly review: a summary across the four areas, then one tab per area (Scalp / Options / Swing /
// Futures) with that area's numbers, what went well / what to fix, and the commitments for the next
// week. Commitments recorded here show on Today and above that area's trade form until closed.
import { weekBounds, weeklyReview, planWeeks, setTally2Candle, getWeeklyNotes, saveWeeklyNotes } from '../weekly.js';
import * as setupC from '../setup-c.js';
import { getSettings, getWeekAreaNote, saveWeekAreaNote, listWeeklyActions, addWeeklyAction, setWeeklyActionStatus, deleteWeeklyAction } from '../db.js';
import { AREAS, AREA_LABEL, areaOf, areaTabs } from '../areas.js';
import { money, signclass, esc } from '../format.js';

const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const pct = v => (v === null || v === undefined ? '–' : v + '%');
const RATE = (v) => (v === null || v === undefined ? '–' : v + '%');

function kpis(items) {
  return `<div class="live">${items.map(([l, v, c]) => `<div class="n"><span>${l}</span><b class="${c || ''}">${v}</b></div>`).join('')}</div>`;
}

function actionRow(a, carried) {
  return `<li data-id="${a.id}"><span class="${a.status !== 'open' ? 'muted' : ''}">${a.status === 'done' ? '✓ ' : a.status === 'dropped' ? '✗ ' : ''}${esc(a.text)}</span>
    ${carried ? `<span class="muted">(from week of ${esc(a.week_start)})</span>` : ''}
    ${a.status === 'open' ? `<button class="btn sm" data-st="done" data-id="${a.id}" type="button">Done</button>
      <button class="btn sm" data-st="dropped" data-id="${a.id}" type="button">Drop</button>`
      : `<button class="btn sm" data-st="open" data-id="${a.id}" type="button">Reopen</button>`}
    <button class="btn sm" data-del="${a.id}" type="button" title="Delete permanently">Delete</button></li>`;
}

function scalpDetail(data) {
  const trs = data.tally_trades;
  const ab = trs.filter(t => t.setup !== 'C'), c = trs.filter(t => t.setup === 'C');
  const sel = (cls, id, cur, opts) => `<select class="${cls}" data-id="${id}">${opts.map(([v, l]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const t2 = data.tally_2candle, unscored = ab.filter(t => !t.tally_2candle).length;
  return `
    ${kpis([['Trades', data.n], ['Net', money(data.net), signclass(data.net)], ['Win rate', pct(data.win_pct)], ['Entry OK', pct(data.entry_ok)], ['Exit OK', pct(data.exit_ok)]])}
    <h3 style="margin-top:16px">By day</h3>
    <table class="dense"><thead><tr><th>Date</th><th>Trades</th><th>Net</th><th>Categories</th></tr></thead>
    <tbody>${data.days.map(d => `<tr><td>${esc(d.date)}</td><td>${d.trades}</td><td class="${signclass(d.net)}">${money(d.net)}</td>
      <td>${Object.entries(d.cats).map(([k, n]) => `${esc(k)}:${n}`).join(' ')}</td></tr>`).join('')}</tbody></table>

    <h3 style="margin-top:16px">2-candle tally <small class="muted">Setup A/B · success = price reached the first known resistance after the trigger</small></h3>
    <p>Success: ${t2.success} · Fail: ${t2.fail} · Contaminated: ${t2.contaminated} · Rate: ${RATE(t2.rate)}
      ${ab.length ? `· <b>${unscored}</b> of ${ab.length} not yet recorded` : ''}</p>
    ${ab.length ? `<table class="dense"><thead><tr><th>Trade</th><th>Ticker</th><th>Setup</th><th>Net</th><th>Outcome</th></tr></thead><tbody>
      ${ab.map(t => `<tr><td><a href="#/intraday/trades/${t.id}">${esc(t.trade_no)}</a></td><td>${esc(t.ticker)}</td><td>${esc(t.setup)}</td>
        <td class="${signclass(t.net_pnl)}">${money(t.net_pnl)}</td>
        <td>${sel('tally2', t.id, t.tally_2candle, [['', 'not recorded'], ['success', 'Success'], ['fail', 'Fail'], ['contaminated', 'Contaminated']])}</td></tr>`).join('')}
      </tbody></table>` : '<p class="muted">No Setup A/B trades this week.</p>'}

    <h3 style="margin-top:16px">Setup C tally <small class="muted">experimental, never mixed into A/B</small></h3>
    <p>X (valid sample): ${data.setup_c_tally.X} · C (failed a gate): ${data.setup_c_tally.C} · E (under review): ${data.setup_c_tally.E}
      · Not recorded: ${data.setup_c_tally['not recorded']}</p>
    ${c.length ? `<table class="dense"><thead><tr><th>Trade</th><th>Ticker</th><th>Net</th><th>Result</th></tr></thead><tbody>
      ${c.map(t => `<tr><td><a href="#/scalp/${t.id}">${esc(t.trade_no)}</a></td><td>${esc(t.ticker)}</td>
        <td class="${signclass(t.net_pnl)}">${money(t.net_pnl)}</td>
        <td>${sel('scres', t.id, t.sc_result, [['', 'not recorded'], ...Object.entries(setupC.RESULTS)])}</td></tr>`).join('')}
      </tbody></table>` : '<p class="muted">No Setup C trades this week.</p>'}

    ${data.changes.length ? `<h3 style="margin-top:16px">Strategy changes stated this week</h3>
      <table class="dense"><tbody>${data.changes.map(x => `<tr><td>${esc(x.date)}</td><td>${esc(x.rule_key)}</td><td>${esc(x.effect || '')}</td></tr>`).join('')}</tbody></table>` : ''}

    <h3 style="margin-top:16px">Suggested action items <small class="muted">from your leaks</small></h3>
    ${data.action_items.length ? `<ol class="sugg">${data.action_items.map(f => `<li><b>${esc(f.directive)}</b> — ${f.n} trades, ${money(f.cost)} (${esc(f.impact)} impact)
      <button class="btn sm addSugg" type="button" data-text="${esc(f.directive)}">Add as commitment</button></li>`).join('')}</ol>`
      : '<p class="muted">Nothing specific this week.</p>'}`;
}

function planDetail(p, area) {
  return `${kpis([['Closed trades', p.n], ['Net', money(p.net), signclass(p.net)], ['Win rate', pct(p.win_pct)], ['Still open', p.open]])}
    <h3 style="margin-top:16px">Closed this week</h3>
    ${p.trades.length ? `<table class="dense"><thead><tr><th>Exit</th><th>Ticker</th><th>P&amp;L</th></tr></thead><tbody>
      ${p.trades.map(t => `<tr><td>${esc(t.exit_date || t.plan_date)}</td><td><a href="${area === 'scalp' ? '#/intraday/trades/' : area === 'options' ? '#/intraday/plans/' : '#/' + area + '/'}${t.id}">${esc(t.ticker)}</a></td>
        <td class="${signclass(t.realized_pl)}">${money(t.realized_pl)}</td></tr>`).join('')}</tbody></table>`
      : `<p class="muted">No ${AREA_LABEL[area].toLowerCase()} trades closed this week.</p>`}`;
}

export async function render(params, el) {
  const area = areaOf(params);
  const [monday, friday] = weekBounds(params.week || null);
  // One batch: everything starts at once (settings is passed on as a promise), and weekly_actions and
  // weekly_notes are each read once.
  const [scalp, plans, allActions, note, saved] = await Promise.all([
    weeklyReview(getSettings(), monday), planWeeks(monday), listWeeklyActions({}),
    getWeekAreaNote(monday, area), getWeeklyNotes(monday),
  ]);
  const { options, swing, futures } = plans;
  const weekActions = allActions.filter(a => a.week_start === monday);
  const openActions = allActions.filter(a => a.status === 'open');
  const stats = { scalp: { n: scalp.n, net: scalp.net, win: scalp.win_pct }, options: { n: options.n, net: options.net, win: options.win_pct },
    swing: { n: swing.n, net: swing.net, win: swing.win_pct }, futures: { n: futures.n, net: futures.net, win: futures.win_pct } };
  const totalNet = Math.round((scalp.net + options.net + swing.net + futures.net) * 100) / 100;
  const mine = weekActions.filter(a => a.area === area);
  const carried = openActions.filter(a => a.area === area && a.week_start < monday);

  el.innerHTML = `
    <div class="head"><h1>Weekly review</h1>
      <div class="actions">
        <a class="btn" href="#/weekly?week=${addDays(monday, -7)}&area=${area}">← Prior week</a>
        <a class="btn" href="#/weekly?week=${addDays(monday, 7)}&area=${area}">Next week →</a>
      </div></div>
    <p class="muted">${esc(monday)} – ${esc(friday)}</p>

    <section class="card"><h2>Summary <small class="muted">all areas</small></h2>
      <table class="dense"><thead><tr><th>Area</th><th>Trades</th><th>Net</th><th>Win rate</th><th>Commitments</th></tr></thead><tbody>
      ${AREAS.map(([a, l]) => { const s = stats[a]; const acts = weekActions.filter(x => x.area === a);
        return `<tr><td><a href="#/weekly?week=${monday}&area=${a}">${l}</a></td><td>${s.n}</td>
        <td class="${signclass(s.net)}">${money(s.net)}</td><td>${pct(s.win)}</td>
        <td>${acts.length ? `${acts.filter(x => x.status === 'done').length} done · ${acts.filter(x => x.status === 'open').length} open of ${acts.length}` : '–'}</td></tr>`; }).join('')}
      <tr><td><b>Total</b></td><td><b>${scalp.n + options.n + swing.n + futures.n}</b></td><td class="${signclass(totalNet)}"><b>${money(totalNet)}</b></td><td></td><td></td></tr>
      </tbody></table>
      <form id="weekForm" style="margin-top:12px">
        <label>Weekend prep <textarea name="weekend_prep" rows="2">${esc(saved ? saved.weekend_prep : '')}</textarea></label>
        <label>Notes for the week <textarea name="notes" rows="2">${esc(saved ? saved.notes : '')}</textarea></label>
        <div class="actions" style="margin-top:8px"><button type="submit" class="btn">Save week notes</button><span class="muted" id="weekMsg"></span></div>
      </form>
    </section>

    ${areaTabs('weekly', area, { week: monday })}

    <section class="card"><h2>${AREA_LABEL[area]}</h2>
      ${area === 'scalp' ? scalpDetail(scalp)
        : planDetail(area === 'options' ? options : area === 'swing' ? swing : futures, area)}
    </section>

    <section class="card" style="margin-top:16px"><h2>${AREA_LABEL[area]}: what went well and what to fix</h2>
      <form id="noteForm">
        <label>What went well<textarea name="went_well" rows="3">${esc(note ? note.went_well : '')}</textarea></label>
        <label>What to fix<textarea name="to_fix" rows="3">${esc(note ? note.to_fix : '')}</textarea></label>
        <div class="actions" style="margin-top:8px"><button type="submit" class="btn primary">Save</button><span class="muted" id="noteMsg"></span></div>
      </form>
    </section>

    <section class="card" style="margin-top:16px"><h2>${AREA_LABEL[area]}: commitments for next week</h2>
      <p class="muted note">Recorded here, they appear on Today and above the ${AREA_LABEL[area].toLowerCase()} trade form until you mark them done or drop them.</p>
      ${carried.length ? `<h3>Still open from earlier weeks</h3><ul class="acts">${carried.map(a => actionRow(a, true)).join('')}</ul>` : ''}
      <h3 style="margin-top:8px">Recorded this week</h3>
      ${mine.length ? `<ul class="acts">${mine.map(a => actionRow(a, false)).join('')}</ul>` : '<p class="muted">None yet.</p>'}
      <form id="actForm" style="display:flex;gap:8px;margin-top:8px"><input name="text" placeholder="e.g. Wait for the 5-minute reset before re-entering" required style="flex:1">
        <button class="btn primary" type="submit">Add</button></form>
    </section>`;

  const again = () => render(params, el);
  el.querySelector('#weekForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    await saveWeeklyNotes(monday, saved ? saved.action_items : '', f.weekend_prep.value, f.notes.value);
    el.querySelector('#weekMsg').textContent = 'Saved.';
  });
  el.querySelector('#noteForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    await saveWeekAreaNote(monday, area, f.went_well.value, f.to_fix.value);
    el.querySelector('#noteMsg').textContent = 'Saved.';
  });
  el.querySelector('#actForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = e.target.text.value.trim();
    if (text) { await addWeeklyAction(monday, area, text); await again(); }
  });
  el.querySelectorAll('.addSugg').forEach(b => b.addEventListener('click', async () => {
    b.disabled = true; await addWeeklyAction(monday, area, b.dataset.text); await again();
  }));
  el.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', async () => {
    await setWeeklyActionStatus(Number(b.dataset.id), b.dataset.st); await again();
  }));
  // Delete asks twice (first click arms it) since a deleted commitment cannot be brought back.
  el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    if (b.dataset.armed !== '1') {
      b.dataset.armed = '1'; b.textContent = 'Sure?';
      setTimeout(() => { if (document.body.contains(b)) { b.dataset.armed = ''; b.textContent = 'Delete'; } }, 3000);
      return;
    }
    await deleteWeeklyAction(Number(b.dataset.del)); await again();
  }));
  el.querySelectorAll('select.tally2').forEach(s => s.addEventListener('change', async () => {
    await setTally2Candle(Number(s.dataset.id), s.value); await again();
  }));
  el.querySelectorAll('select.scres').forEach(s => s.addEventListener('change', async () => {
    const t = scalp.tally_trades.find(x => x.id === Number(s.dataset.id));
    await setupC.setResult(t.id, t.date, s.value); await again();
  }));
}
