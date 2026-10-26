// Pure builders for downloading the app's journal: one day or everything, as JSON (re-loadable
// through the Wrap-up import page) or Markdown (readable). No browser or network access.
import { WRAPUP_SCHEMA, BATCH_SCHEMA } from './wrapup.js';

// day: { date, entry: {summary, trades[]} | null, learnings: [{text, trade_nos}], improvements: [...rows] }
export function dayToWrapup(day) {
  return {
    schema: WRAPUP_SCHEMA,
    date: day.date,
    journal_entry: { summary: day.entry ? day.entry.summary : '', trades: day.entry ? day.entry.trades || [] : [] },
    learnings: day.learnings.map(l => ({ text: l.text, trade_nos: l.trade_nos || [] })),
    improvements: day.improvements.map(i => ({
      text: i.text,
      target: i.target_type === 'none' ? { type: 'none' }
        : { type: i.target_type, value: i.target_value, ...(i.target_setup ? { setup: i.target_setup } : {}) },
      trade_nos: i.trade_nos || [],
      status: i.status, adopted_on: i.adopted_on || null, resolved_on: i.resolved_on || null,
    })),
  };
}

export function batchToJson(days, exportedAt = new Date().toISOString()) {
  return JSON.stringify({ schema: BATCH_SCHEMA, exported_at: exportedAt, wrapups: days.map(dayToWrapup) }, null, 2) + '\n';
}

export function dayToJson(day) {
  return JSON.stringify(dayToWrapup(day), null, 2) + '\n';
}

const targetText = i => i.target_type === 'violation' ? `violation "${i.target_value}"`
  : i.target_type === 'metric' ? `metric ${i.target_value}${i.target_setup ? ` (Setup ${i.target_setup})` : ''}` : 'no measurable target';
const cell = v => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function dayToMarkdown(day) {
  const out = [`# Journal - ${day.date}`, ''];
  out.push(day.entry && day.entry.summary ? day.entry.summary : '_No journal entry._', '');
  const trades = day.entry ? day.entry.trades || [] : [];
  if (trades.length) {
    out.push('## Trades', '', '| Trade | Cat | Verdict | Violations | Lesson |', '|---|---|---|---|---|');
    for (const t of trades) out.push(`| ${cell(t.trade_no)} | ${cell(t.category)} | ${cell(t.verdict)} | ${cell((t.violations || []).join('; '))} | ${cell(t.lesson)} |`);
    out.push('');
  }
  if (day.learnings.length) { out.push('## Learnings', ''); for (const l of day.learnings) out.push(`- ${l.text}${(l.trade_nos || []).length ? ` (${l.trade_nos.join(', ')})` : ''}`); out.push(''); }
  if (day.improvements.length) {
    out.push('## Improvements', '');
    for (const i of day.improvements) out.push(`- ${i.text} - target: ${targetText(i)}; status: ${i.status}${i.adopted_on ? `, adopted ${i.adopted_on}` : ''}${i.resolved_on ? `, resolved ${i.resolved_on}` : ''}`);
    out.push('');
  }
  return out.join('\n');
}

export function batchToMarkdown(days) {
  return days.map(dayToMarkdown).join('\n---\n\n');
}

// Groups rows from the three tables into per-date days, newest first.
export function groupDays(entries, learnings, improvements) {
  const byDate = new Map();
  const get = (d) => { if (!byDate.has(d)) byDate.set(d, { date: d, entry: null, learnings: [], improvements: [] }); return byDate.get(d); };
  for (const e of entries) get(e.date).entry = e;
  for (const l of learnings) get(l.date).learnings.push(l);
  for (const i of improvements) get(i.date).improvements.push(i);
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}
