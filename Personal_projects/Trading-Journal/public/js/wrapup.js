// Validation for the "wrap up for today" import block (schema tj-wrapup/1). Pure, so it can be
// unit tested in Node. The app rejects anything that does not match: a drifting format must fail
// loudly with a readable list of problems, never be saved half-understood.
import { VIOLATIONS } from './constants.js';

export const WRAPUP_SCHEMA = 'tj-wrapup/1';
export const METRICS = ['avg_r', 'win_rate', 'avg_loser', 'avg_winner'];
const CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'X', ''];
const isStr = v => typeof v === 'string';
const isDate = v => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const tradeNo = v => isStr(v) && /^T\d+$/.test(v);

// Claude often wraps the block in a ```json fence; accept that, nothing else.
export function parseWrapupText(text) {
  let s = String(text || '').trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(s);
  if (fence) s = fence[1];
  return JSON.parse(s);
}

export function validateWrapup(raw, violations = VIOLATIONS) {
  const errors = [], warnings = [];
  const err = (path, msg) => errors.push(`${path}: ${msg}`);
  let o = raw;
  if (isStr(raw)) {
    try { o = parseWrapupText(raw); } catch (e) { return { ok: false, errors: [`Not valid JSON (${e.message}).`], warnings, data: null }; }
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ok: false, errors: ['Top level must be an object.'], warnings, data: null };
  if (o.schema !== WRAPUP_SCHEMA) err('schema', `must be "${WRAPUP_SCHEMA}" (got ${JSON.stringify(o.schema)})`);
  if (!isDate(o.date)) err('date', 'must be YYYY-MM-DD');

  const je = o.journal_entry;
  const entry = { summary: '', trades: [] };
  if (!je || typeof je !== 'object') err('journal_entry', 'missing');
  else {
    if (!isStr(je.summary) || !je.summary.trim()) err('journal_entry.summary', 'required text');
    else entry.summary = je.summary.trim();
    if (!Array.isArray(je.trades)) err('journal_entry.trades', 'must be an array');
    else je.trades.forEach((t, i) => {
      const p = `journal_entry.trades[${i}]`;
      if (!t || typeof t !== 'object') return err(p, 'must be an object');
      if (!tradeNo(t.trade_no)) err(`${p}.trade_no`, 'must look like T104');
      if (!isStr(t.verdict) || !t.verdict.trim()) err(`${p}.verdict`, 'required text');
      const cat = t.category ?? '';
      if (!CATEGORIES.includes(cat)) err(`${p}.category`, `must be one of A,B,C,D,E,X (got ${JSON.stringify(t.category)})`);
      const v = t.violations ?? [];
      if (!Array.isArray(v) || v.some(x => !isStr(x))) err(`${p}.violations`, 'must be an array of text');
      else for (const x of v) if (!violations.includes(x)) warnings.push(`${p}.violations: "${x}" is not in the app's tag list (kept as text, not used for ranking).`);
      entry.trades.push({ trade_no: t.trade_no, verdict: (t.verdict || '').trim(), category: cat, violations: Array.isArray(v) ? v : [], lesson: isStr(t.lesson) ? t.lesson.trim() : '' });
    });
  }

  const learnings = [];
  if (!Array.isArray(o.learnings)) err('learnings', 'must be an array (may be empty)');
  else o.learnings.forEach((l, i) => {
    const p = `learnings[${i}]`;
    if (!l || !isStr(l.text) || !l.text.trim()) return err(`${p}.text`, 'required text');
    const nos = l.trade_nos ?? [];
    if (!Array.isArray(nos) || nos.some(n => !tradeNo(n))) return err(`${p}.trade_nos`, 'must be an array like ["T104"]');
    learnings.push({ text: l.text.trim(), trade_nos: nos });
  });

  const improvements = [];
  if (!Array.isArray(o.improvements)) err('improvements', 'must be an array (may be empty)');
  else o.improvements.forEach((im, i) => {
    const p = `improvements[${i}]`;
    if (!im || !isStr(im.text) || !im.text.trim()) return err(`${p}.text`, 'required text');
    const nos = im.trade_nos ?? [];
    if (!Array.isArray(nos) || nos.some(n => !tradeNo(n))) return err(`${p}.trade_nos`, 'must be an array like ["T104"]');
    const tg = im.target;
    if (!tg || typeof tg !== 'object') return err(`${p}.target`, 'required: {type, value}');
    let target = { type: 'none', value: null, setup: null };
    if (tg.type === 'violation') {
      if (!violations.includes(tg.value)) return err(`${p}.target.value`, `"${tg.value}" is not a tag in the app's violation list`);
      target = { type: 'violation', value: tg.value, setup: null };
    } else if (tg.type === 'metric') {
      if (!METRICS.includes(tg.value)) return err(`${p}.target.value`, `must be one of ${METRICS.join(', ')}`);
      if (tg.setup != null && !['A', 'B', 'C'].includes(tg.setup)) return err(`${p}.target.setup`, 'must be A, B or C when given');
      target = { type: 'metric', value: tg.value, setup: tg.setup ?? null };
    } else if (tg.type !== 'none') return err(`${p}.target.type`, 'must be violation, metric or none');
    // Optional lifecycle fields: present in files downloaded from the app so a backup restores them.
    const status = im.status ?? 'proposed';
    if (!['proposed', 'adopted', 'resolved', 'dropped'].includes(status)) return err(`${p}.status`, 'must be proposed, adopted, resolved or dropped');
    for (const k of ['adopted_on', 'resolved_on']) if (im[k] != null && !isDate(im[k])) return err(`${p}.${k}`, 'must be YYYY-MM-DD');
    improvements.push({ text: im.text.trim(), target, trade_nos: nos, status, adopted_on: im.adopted_on ?? null, resolved_on: im.resolved_on ?? null });
  });

  const flags = o.strategy_flags ?? [];
  if (!Array.isArray(flags) || flags.some(f => !isStr(f))) err('strategy_flags', 'must be an array of text when present');

  if (errors.length) return { ok: false, errors, warnings, data: null };
  return { ok: true, errors, warnings, data: { date: o.date, entry, learnings, improvements, strategy_flags: flags } };
}

export const BATCH_SCHEMA = 'tj-wrapup-batch/1';

// One block or a downloaded batch ({schema: 'tj-wrapup-batch/1', wrapups: [...]}).
// Returns { ok, errors, warnings, days: [data, ...] }; every problem in every day is reported.
export function validateAny(raw, violations = VIOLATIONS) {
  let o = raw;
  if (isStr(raw)) {
    try { o = parseWrapupText(raw); } catch (e) { return { ok: false, errors: [`Not valid JSON (${e.message}).`], warnings: [], days: [] }; }
  }
  if (!o || o.schema !== BATCH_SCHEMA) {
    const r = validateWrapup(o, violations);
    return { ok: r.ok, errors: r.errors, warnings: r.warnings, days: r.ok ? [r.data] : [] };
  }
  if (!Array.isArray(o.wrapups) || !o.wrapups.length) return { ok: false, errors: ['wrapups: must be a non-empty array'], warnings: [], days: [] };
  const errors = [], warnings = [], days = [];
  o.wrapups.forEach((w, i) => {
    const r = validateWrapup(w, violations);
    errors.push(...r.errors.map(e => `wrapups[${i}].${e}`));
    warnings.push(...r.warnings.map(e => `wrapups[${i}].${e}`));
    if (r.ok) days.push(r.data);
  });
  return { ok: !errors.length, errors, warnings, days: errors.length ? [] : days };
}
