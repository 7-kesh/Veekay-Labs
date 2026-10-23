// Port of app/templates/weekly.html.
import { weekBounds, weeklyReview, getWeeklyNotes, saveWeeklyNotes } from '../weekly.js';
import { getSettings } from '../db.js';
import { money, signclass, esc } from '../format.js';
import { navigate, dispatch } from '../router.js';

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
}

export async function render(params, el) {
  const [monday] = weekBounds(params.week || null);
  const settings = await getSettings();
  const data = await weeklyReview(settings, monday);
  const saved = await getWeeklyNotes(monday);
  const prevWeek = addDays(monday, -7), nextWeek = addDays(monday, 7);

  el.innerHTML = `
    <div class="head"><h1>Weekly review</h1>
      <div class="actions">
        <a class="btn" href="#/weekly?week=${prevWeek}">← Prior week</a>
        <a class="btn" href="#/weekly?week=${nextWeek}">Next week →</a>
      </div></div>
    <p class="muted">${esc(data.monday)} – ${esc(data.friday)}</p>

    <section class="card">
      <div class="live">
        <div class="n"><span>Trades</span><b>${data.n}</b></div>
        <div class="n"><span>Net</span><b class="${signclass(data.net)}">${money(data.net)}</b></div>
        <div class="n"><span>Win rate</span><b>${data.win_pct === null ? '–' : data.win_pct + '%'}</b></div>
        <div class="n"><span>Entry OK</span><b>${data.entry_ok === null ? '–' : data.entry_ok + '%'}</b></div>
        <div class="n"><span>Exit OK</span><b>${data.exit_ok === null ? '–' : data.exit_ok + '%'}</b></div>
      </div>
    </section>

    <section class="card" style="margin-top:16px"><h2>By day</h2>
      <table class="dense"><thead><tr><th>Date</th><th>Trades</th><th>Net</th><th>Categories</th></tr></thead>
      <tbody>${data.days.map(d => `<tr><td>${esc(d.date)}</td><td>${d.trades}</td>
        <td class="${signclass(d.net)}">${money(d.net)}</td>
        <td>${Object.entries(d.cats).map(([c, n]) => `${esc(c)}:${n}`).join(' ')}</td></tr>`).join('')}</tbody></table>
    </section>

    <section class="card" style="margin-top:16px"><h2>2-candle tally (Setup A/B)</h2>
      <p>Success: ${data.tally_2candle.success} &middot; Fail: ${data.tally_2candle.fail} &middot; Contaminated: ${data.tally_2candle.contaminated}
      &middot; Rate: ${data.tally_2candle.rate === null ? '–' : data.tally_2candle.rate + '%'}</p>
      <h3 style="margin-top:10px">Setup C tally</h3>
      <p>${Object.entries(data.setup_c_tally).map(([k, n]) => `${esc(k)}: ${n}`).join(' · ')}</p>
    </section>

    ${data.changes.length ? `<section class="card" style="margin-top:16px"><h2>Strategy changes stated this week</h2>
      <table class="dense"><tbody>${data.changes.map(c => `<tr><td>${esc(c.date)}</td><td>${esc(c.rule_key)}</td><td>${esc(c.effect || '')}</td></tr>`).join('')}</tbody></table>
    </section>` : ''}

    <section class="card" style="margin-top:16px"><h2>Suggested action items</h2>
      ${data.action_items.length ? `<ol>${data.action_items.map(f => `<li><b>${esc(f.directive)}</b> — ${f.n} trades, ${money(f.cost)} (${esc(f.impact)} impact)</li>`).join('')}</ol>`
        : '<p class="muted">Nothing specific this week.</p>'}
    </section>

    <section class="card" style="margin-top:16px"><h2>Your notes</h2>
      <form id="weeklyForm">
        <label>Action items you're committing to<textarea name="action_items" rows="3">${esc(saved ? saved.action_items : '')}</textarea></label>
        <label>Weekend prep<textarea name="weekend_prep" rows="3">${esc(saved ? saved.weekend_prep : '')}</textarea></label>
        <label>Notes<textarea name="notes" rows="3">${esc(saved ? saved.notes : '')}</textarea></label>
        <div class="actions" style="margin-top:8px"><button type="submit" class="btn primary">Save</button></div>
      </form>
    </section>
  `;

  el.querySelector('#weeklyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    await saveWeeklyNotes(monday, f.action_items.value, f.weekend_prep.value, f.notes.value);
    navigate(`weekly?week=${monday}`);
    await dispatch();
  });
}
