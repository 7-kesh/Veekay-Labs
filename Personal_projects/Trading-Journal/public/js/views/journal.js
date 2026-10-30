// Daily journal (the app's journal is the final record). List by day with year/month filters,
// open a day, download everything shown (Markdown or JSON), or load a file back through Import.
import { listJournalAll, journalYears, listJournalNotes } from '../db.js';
import { AREA_LABEL, areaOf, areaTabs } from '../areas.js';
import { groupDays, batchToJson, batchToMarkdown } from '../journal-export.js';
import { periodBounds, periodSelectsHtml, readPeriod } from '../period.js';
import { downloadText } from '../download.js';
import { esc } from '../format.js';

export async function render(params, el) {
  const area = areaOf(params);
  const period = params.period || 'all';
  const [lo, hi] = periodBounds(period);
  const [{ entries, learnings, improvements }, years, notes] = await Promise.all([
    area === 'scalp' ? listJournalAll({ lo, hi }) : { entries: [], learnings: [], improvements: [] }, journalYears(), listJournalNotes(area, { lo, hi })]);
  const wrapDays = groupDays(entries, learnings, improvements);
  const noteBy = new Map(notes.map(n => [n.date, n]));
  const wrapBy = new Map(wrapDays.map(d => [d.date, d]));
  const dates = [...new Set([...noteBy.keys(), ...wrapBy.keys()])].sort().reverse();
  const days = dates.map(date => ({ date, note: noteBy.get(date), wrap: wrapBy.get(date) }));
  const today = new Date().toISOString().slice(0, 10);

  el.innerHTML = `
    <div class="head"><h1>Daily journal</h1>
      <div class="actions">
        <a class="btn primary" href="#/journal/${today}?area=${area}">${noteBy.has(today) ? 'Edit' : 'Write'} today's entry</a>
        <button class="btn" id="dlMd" type="button" ${days.length ? '' : 'disabled'}>Download Markdown</button>
        <button class="btn" id="dlJson" type="button" ${days.length ? '' : 'disabled'}>Download JSON</button>
        ${area === 'scalp' ? '<a class="btn" href="#/import">Load / import</a>' : ''}
      </div></div>
    ${areaTabs('journal', area, { period })}
    <form class="filters" id="filters" style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
      ${periodSelectsHtml(period, years)}
      <span class="muted">${days.length} day(s) · downloads cover what is listed</span>
    </form>
    ${days.map(d => `<section class="card" style="margin-bottom:12px">
      <h3><a href="#/journal/${esc(d.date)}?area=${area}">${esc(d.date)}</a></h3>
      <p>${esc(d.note && d.note.summary ? d.note.summary.slice(0, 220) : d.wrap && d.wrap.entry ? (d.wrap.entry.summary || '').slice(0, 220) : 'No summary for this day.')}</p>
      <p class="muted">${d.note ? 'Written by hand' : ''}${d.note && d.wrap ? ' · ' : ''}${d.wrap ? `${d.wrap.entry ? (d.wrap.entry.trades || []).length : 0} trade(s) assessed · ${d.wrap.learnings.length} learning(s) · ${d.wrap.improvements.length} improvement(s)` : ''}</p>
    </section>`).join('') || `<section class="card"><p class="muted">No ${esc(AREA_LABEL[area].toLowerCase())} journal entries in this range. Use "Write today's entry" to add one.</p></section>`}
  `;
  const form = el.querySelector('#filters');
  form.addEventListener('change', () => { window.location.hash = '#/journal?' + new URLSearchParams({ period: readPeriod(form), area }).toString(); });
  const noteMd = n => `## ${n.date}\n\n${n.summary}\n\n**Went well:** ${n.went_well}\n\n**To fix:** ${n.to_fix}\n\n**Tomorrow:** ${n.tomorrow}\n`;
  const batchMd = () => [wrapDays.length ? batchToMarkdown(wrapDays) : '', ...notes.map(noteMd)].filter(Boolean).join('\n\n');
  const batchJson = () => JSON.stringify({ area, wrapups: wrapDays.length ? JSON.parse(batchToJson(wrapDays)) : [], notes }, null, 2);
  const stamp = new Date().toISOString().slice(0, 10);
  el.querySelector('#dlMd').addEventListener('click', () => downloadText(`journal_${area}_${stamp}.md`, batchMd(), 'text/markdown'));
  el.querySelector('#dlJson').addEventListener('click', () => downloadText(`journal_${area}_${stamp}.json`, batchJson(), 'application/json'));
}
