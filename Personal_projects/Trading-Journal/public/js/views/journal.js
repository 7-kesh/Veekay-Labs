// Daily journal (the app's journal is the final record). List by day with year/month filters,
// open a day, download everything shown (Markdown or JSON), or load a file back through Import.
import { listJournalAll, journalYears } from '../db.js';
import { groupDays, batchToJson, batchToMarkdown } from '../journal-export.js';
import { periodBounds, periodSelectsHtml, readPeriod } from '../period.js';
import { downloadText } from '../download.js';
import { esc } from '../format.js';

export async function render(params, el) {
  const period = params.period || 'all';
  const [lo, hi] = periodBounds(period);
  const [{ entries, learnings, improvements }, years] = await Promise.all([listJournalAll({ lo, hi }), journalYears()]);
  const days = groupDays(entries, learnings, improvements);

  el.innerHTML = `
    <div class="head"><h1>Daily journal</h1>
      <div class="actions">
        <button class="btn" id="dlMd" type="button" ${days.length ? '' : 'disabled'}>Download Markdown</button>
        <button class="btn" id="dlJson" type="button" ${days.length ? '' : 'disabled'}>Download JSON</button>
        <a class="btn primary" href="#/import">Load / import</a>
      </div></div>
    <form class="filters" id="filters" style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
      ${periodSelectsHtml(period, years)}
      <span class="muted">${days.length} day(s) · downloads cover what is listed</span>
    </form>
    ${days.map(d => `<section class="card" style="margin-bottom:12px">
      <h3><a href="#/journal/${esc(d.date)}">${esc(d.date)}</a></h3>
      <p>${esc(d.entry ? (d.entry.summary || '').slice(0, 220) : 'No journal entry for this day.')}</p>
      <p class="muted">${d.entry ? (d.entry.trades || []).length : 0} trade(s) assessed · ${d.learnings.length} learning(s) · ${d.improvements.length} improvement(s)</p>
    </section>`).join('') || '<section class="card"><p class="muted">No journal entries in this range. Import a wrap-up from Claude chat to add one.</p></section>'}
  `;
  const form = el.querySelector('#filters');
  form.addEventListener('change', () => { window.location.hash = '#/journal?' + new URLSearchParams({ period: readPeriod(form) }).toString(); });
  const stamp = new Date().toISOString().slice(0, 10);
  el.querySelector('#dlMd').addEventListener('click', () => downloadText(`journal_${stamp}.md`, batchToMarkdown(days), 'text/markdown'));
  el.querySelector('#dlJson').addEventListener('click', () => downloadText(`journal_${stamp}.json`, batchToJson(days), 'application/json'));
}
