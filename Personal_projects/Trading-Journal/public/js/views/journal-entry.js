// One day of the journal: summary, per-trade assessment (with the app's own P&L), learnings,
// improvements, and downloads for that day.
import { getJournalDay, getJournalNote, saveJournalNote } from '../db.js';
import { AREA_LABEL, areaOf, areaTabs } from '../areas.js';
import { dayToJson, dayToMarkdown } from '../journal-export.js';
import { downloadText } from '../download.js';
import { esc, money, signclass } from '../format.js';

const targetText = i => i.target_type === 'violation' ? `violation: ${i.target_value}`
  : i.target_type === 'metric' ? `metric: ${i.target_value}${i.target_setup ? ` (Setup ${i.target_setup})` : ''}` : 'no measurable target';
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export async function render(params, el) {
  const date = params.date, area = areaOf(params);
  const [day, note] = await Promise.all([getJournalDay(date), getJournalNote(date, area)]);
  const n = note || { summary: '', went_well: '', to_fix: '', tomorrow: '' };
  const byNo = new Map(day.trades.map(t => [t.trade_no, t]));
  const rows = day.entry ? day.entry.trades || [] : [];

  el.innerHTML = `
    <div class="head"><h1>Journal <small>${esc(date)}</small></h1>
      <div class="actions">
        <a class="btn" href="#/journal/${addDays(date, -1)}?area=${area}">← Prev day</a><a class="btn" href="#/journal/${addDays(date, 1)}?area=${area}">Next day →</a>
        <button class="btn" id="dlMd" type="button">Download Markdown</button>
        <button class="btn" id="dlJson" type="button">Download JSON</button>
        <a class="btn" href="#/journal?area=${area}">All days</a>
      </div></div>
    ${areaTabs('journal/' + date, area)}
    <section class="card"><h2>${esc(AREA_LABEL[area])} journal <small class="muted">written by hand, saved for this day</small></h2>
      <form id="noteForm">
        <label>How the day went<textarea name="summary" rows="4">${esc(n.summary)}</textarea></label>
        <label>What went well<textarea name="went_well" rows="3">${esc(n.went_well)}</textarea></label>
        <label>What to fix<textarea name="to_fix" rows="3">${esc(n.to_fix)}</textarea></label>
        <label>Plan / focus for the next session<textarea name="tomorrow" rows="3">${esc(n.tomorrow)}</textarea></label>
        <div class="actions" style="margin-top:8px"><button class="btn primary" type="submit">Save entry</button><span class="muted" id="noteMsg"></span></div>
      </form></section>
    ${area !== 'scalp' ? '' : `${day.entry ? `<section class="card" style="margin-top:16px"><h2>Claude wrap-up summary</h2><p>${esc(day.entry.summary)}</p></section>` : ''}
    ${rows.length ? `<section class="card" style="margin-top:16px"><h2>Trades assessed</h2>
      <table class="dense"><thead><tr><th>Trade</th><th>Ticker</th><th>Net</th><th>Cat</th><th>Verdict</th><th>Violations</th><th>Lesson</th></tr></thead><tbody>
      ${rows.map(t => { const a = byNo.get(t.trade_no); return `<tr>
        <td>${a ? `<a href="#/intraday/trades/${a.id}">${esc(t.trade_no)}</a>` : esc(t.trade_no)}</td><td>${a ? esc(a.ticker) : ''}</td>
        <td class="${signclass(a && a.net_pnl)}">${a ? money(a.net_pnl) : ''}</td><td>${esc(t.category || '')}</td>
        <td>${esc(t.verdict)}</td><td>${esc((t.violations || []).join('; '))}</td><td>${esc(t.lesson || '')}</td></tr>`; }).join('')}
      </tbody></table></section>` : ''}
    <section class="card" style="margin-top:16px"><h2>Learnings</h2>
      ${day.learnings.length ? `<ul>${day.learnings.map(l => `<li>${esc(l.text)} <span class="muted">${esc((l.trade_nos || []).join(', '))}</span></li>`).join('')}</ul>` : '<p class="muted">None.</p>'}
    </section>
    <section class="card" style="margin-top:16px"><h2>Improvements</h2>
      ${day.improvements.length ? `<ul>${day.improvements.map(i => `<li>${esc(i.text)} <span class="muted">- ${esc(targetText(i))} · ${esc(i.status)}</span></li>`).join('')}</ul>
      <p class="muted"><a href="#/improvements">Manage on the Improvements page</a></p>` : '<p class="muted">None.</p>'}
    </section>`}
  `;
  el.querySelector('#noteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    await saveJournalNote(date, area, { summary: f.summary.value, went_well: f.went_well.value, to_fix: f.to_fix.value, tomorrow: f.tomorrow.value });
    el.querySelector('#noteMsg').textContent = 'Saved.';
  });
  el.querySelector('#dlMd').addEventListener('click', () => downloadText(`journal_${date}.md`, dayToMarkdown(day), 'text/markdown'));
  el.querySelector('#dlJson').addEventListener('click', () => downloadText(`journal_${date}.json`, dayToJson(day), 'application/json'));
}
