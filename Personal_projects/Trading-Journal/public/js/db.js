// Data layer over Supabase - port of app/db.py + the trade-save logic in app/routes.py's
// _save_scalp / _next_trade_no / _suggest_category, plus app/audit.py's log_changes.
import { supabase } from './supabase-client.js';
import { cleanNumber, cleanDate } from './numeric.js';
import { DEFAULT_SETTINGS } from './constants.js';
import { scalpResult, optionsPlan, swingPlan, realized, estimateOptionPremiums, num as calcNum } from './calc.js';
import * as setupC from './setup-c.js';
import { OPTIONS_CHECKLIST, SWING_CHECKLIST, EXIT_SCENARIOS } from './constants.js';

function rethrow(error) { if (error) throw error; }

// ---------- settings ----------

// Screenshots auto-expire after 7 days (Veekay, 2026-10-26) - the journal entry and the exported
// bundle are the durable record, not the raw image, so export before the week is up. Lazy, same
// as app/db.py's purge_old_screenshots(): runs once per app load, no cron needed.
export async function purgeOldScreenshots(days = 7) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase.from('attachments').select('id,filename').lt('created_at', cutoff);
  rethrow(error);
  if (!data || !data.length) return 0;
  rethrow((await supabase.storage.from('screenshots').remove(data.map(r => r.filename))).error);
  rethrow((await supabase.from('attachments').delete().in('id', data.map(r => r.id))).error);
  return data.length;
}

export async function ensureSettings() {
  const rows = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value }));
  const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key', ignoreDuplicates: true });
  rethrow(error);
}

export async function getSettings() {
  const { data, error } = await supabase.from('settings').select('key,value');
  rethrow(error);
  const s = { ...DEFAULT_SETTINGS };
  for (const r of data) s[r.key] = r.value;
  return s;
}

// ---------- scalp trades ----------

export async function listScalpTrades({ date, lo, hi, account, q, limit } = {}) {
  let query = supabase.from('scalp_trades').select('*');
  if (date) query = query.eq('date', date);
  if (lo) query = query.gte('date', lo).lte('date', hi);
  if (account && account !== 'all') query = query.eq('account', account);
  if (q) query = query.ilike('ticker', `%${q}%`);
  query = date
    ? query.order('entry_time', { ascending: true }).order('id', { ascending: true })
    : query.order('date', { ascending: false }).order('entry_time', { ascending: false }).order('id', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  rethrow(error);
  return data;
}

// Distinct years across scalp trades and options/swing plans (newest first), for the Stats and
// plan-list year filters.
export async function allYears() {
  const [t, p] = await Promise.all([
    supabase.from('scalp_trades').select('date'),
    supabase.from('plans').select('plan_date'),
  ]);
  rethrow(t.error); rethrow(p.error);
  const years = new Set();
  for (const r of t.data || []) years.add(String(r.date || '').slice(0, 4));
  for (const r of p.data || []) years.add(String(r.plan_date || '').slice(0, 4));
  return [...years].filter(y => /^\d{4}$/.test(y)).sort().reverse();
}

// Distinct years that have scalp trades (newest first), for the list's year filter.
export async function scalpYears() {
  const { data, error } = await supabase.from('scalp_trades').select('date');
  rethrow(error);
  return [...new Set((data || []).map(r => String(r.date || '').slice(0, 4)).filter(y => /^\d{4}$/.test(y)))].sort().reverse();
}

export async function getScalpTrade(id) {
  const { data, error } = await supabase.from('scalp_trades').select('*').eq('id', id).single();
  rethrow(error);
  return data;
}

async function nextTradeNo() {
  // Must be the actual highest trade_no NUMBER, not "whatever row has the highest id" - a
  // bulk import can backfill an old trade_no (e.g. T001) well after T002..T103 already exist,
  // giving it a fresh high id while holding a low number. Relying on id order broke exactly
  // that way after this app's own migration backfills. Matches routes.py's
  // "ORDER BY CAST(SUBSTR(trade_no,2) AS INTEGER) DESC LIMIT 1" by computing the max client-side.
  const { data, error } = await supabase.from('scalp_trades').select('trade_no');
  rethrow(error);
  let max = 0;
  for (const r of data || []) {
    const n = parseInt(String(r.trade_no || '').slice(1), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return 'T' + String(max + 1).padStart(3, '0');
}

function suggestCategory(setup, entryValid, exitValid, violations) {
  if (setup === 'C') return 'X';
  if (entryValid === 'N') return 'C';
  if (entryValid === 'Y') return (exitValid === 'Y' && !violations) ? 'A' : 'B';
  return '';
}

// Logs one trade_history row per changed field (app/audit.py's log_changes, "manual" source -
// the Claude-suggested source label is added once Claude review is wired into this app).
async function logChanges(tradeId, oldRow, newValues) {
  const rows = [];
  if (!oldRow) {
    rows.push({ kind: 'scalp', trade_id: tradeId, field: '(created)', old_value: null, new_value: null, source: 'manual' });
  } else {
    for (const [field, val] of Object.entries(newValues)) {
      const oldS = oldRow[field] == null ? '' : String(oldRow[field]);
      const newS = val == null ? '' : String(val);
      if (oldS === newS) continue;
      rows.push({ kind: 'scalp', trade_id: tradeId, field, old_value: oldS, new_value: newS, source: 'manual' });
    }
  }
  if (rows.length) rethrow((await supabase.from('trade_history').insert(rows)).error);
}

// Latest exit_time among this ticker's earlier-entered trades the same day (routes.py's
// scalp_check query) - the "prior trade" the 5-minute reset check compares against.
export async function priorExitTime(ticker, date, excludeId, entryTime) {
  const { data, error } = await supabase.from('scalp_trades').select('exit_time')
    .eq('ticker', ticker).eq('date', date).neq('id', excludeId).lt('entry_time', entryTime || '99:99')
    .not('exit_time', 'is', null).order('exit_time', { ascending: false }).limit(1);
  rethrow(error);
  return data && data[0] ? data[0].exit_time : null;
}

export async function getTradeHistory(tradeId) {
  const { data, error } = await supabase.from('trade_history').select('*')
    .eq('kind', 'scalp').eq('trade_id', tradeId).order('id', { ascending: false });
  rethrow(error);
  return data;
}

// form: the raw field values as entered (strings), violations/emotions as arrays.
// Mirrors app/routes.py's _save_scalp. Returns the saved row's id.
export async function saveScalpTrade(id, form, settings) {
  const old = id ? await getScalpTrade(id) : null;
  const v = {
    date: form.date || '', entry_time: form.entry_time || '', exit_time: form.exit_time || '',
    exits_text: form.exits_text || '', category: form.category || '', setup: form.setup || '',
    setup_valid: form.setup_valid || '', entry_valid: form.entry_valid || '', exit_valid: form.exit_valid || '',
    review_status: form.review_status || 'draft',
    entry_order: form.entry_order || '', exit_order: form.exit_order || '', orders_text: form.orders_text || '',
    notes: form.notes || '', tally_2candle: form.tally_2candle || '',
    ticker: (form.ticker || '').toUpperCase(),
    account: form.account === 'live' ? 'live' : 'paper',
    violations: (form.violations || []).join('; '),
    emotions: (form.emotions || []).join('; '),
    entry_price: numOrNull(form.entry_price), shares: numOrNull(form.shares), stop: numOrNull(form.stop),
    // Section 2/3 - known S/R/confluence and the objective-assessment fields, every setup.
    support_below: numOrNull(form.support_below), resistance_above: numOrNull(form.resistance_above),
    confluence_strength: form.confluence_strength || '',
    structure_valid: form.structure_valid || '', trigger_valid: form.trigger_valid || '',
    extended: form.extended || '', ema_alignment: form.ema_alignment || '',
    mom_sign: form.mom_sign || '', mom_direction: form.mom_direction || '',
    ttm_color: form.ttm_color || '', ttm_direction: form.ttm_direction || '',
  };
  v.commission = form.commission !== '' && form.commission != null
    ? numOrNull(form.commission) : numOrNull(settings.default_commission, 0);

  const res = scalpResult(v.entry_price, v.shares, v.stop, v.exits_text, v.commission);
  v.planned_risk = res.planned_risk !== null ? res.planned_risk : (old ? old.planned_risk : null);
  v.avg_exit = res.avg_exit;
  if (res.net_pnl !== null) {
    v.gross_pnl = res.gross_pnl; v.net_pnl = res.net_pnl;
  } else {
    const manual = numOrNull(form.net_manual);
    const net = manual !== null ? manual : (old ? old.net_pnl : null);
    v.net_pnl = net;
    v.gross_pnl = net !== null ? net + (v.commission || 0) : null;
  }
  v.r_multiple = (v.net_pnl !== null && v.planned_risk) ? round2(v.net_pnl / v.planned_risk) : null;
  if (!v.category) v.category = suggestCategory(v.setup, v.entry_valid, v.exit_valid, v.violations);
  if (!v.date) v.date = new Date().toISOString().slice(0, 10);

  let tradeId;
  if (old) {
    const { error } = await supabase.from('scalp_trades').update(v).eq('id', id);
    rethrow(error);
    await logChanges(id, old, v);
    tradeId = id;
  } else {
    const { count, error: ce } = await supabase.from('scalp_trades')
      .select('id', { count: 'exact', head: true }).eq('date', v.date);
    rethrow(ce);
    const insertRow = { ...v, trade_no: await nextTradeNo(), day_seq: (count || 0) + 1 };
    const { data, error } = await supabase.from('scalp_trades').insert(insertRow).select('id').single();
    rethrow(error);
    await logChanges(data.id, null, v);
    tradeId = data.id;
  }
  if (v.setup === 'C') await setupC.save(tradeId, v.date, form);
  return tradeId;
}

// Aggregated history for the review prompt - evidence about Veekay's PATTERNS over time, never
// evidence about the trade being reviewed right now. review.js walls this off from gate grading
// (see HISTORY_ADDENDUM there); this function only computes the numbers.
// Deliberately ticker-agnostic: the strategy's setups (A/B/C) are defined by chart structure and
// location, not by which stock it is, and most tickers only get traded once or twice anyway, so
// grouping by symbol would just be noise (or superstition) dressed up as a pattern.
export async function getPatternDigest({ setup, excludeId, limit = 80 } = {}) {
  const { data, error } = await supabase.from('scalp_trades')
    .select('id,setup,category,violations,date')
    .order('date', { ascending: false }).limit(limit);
  rethrow(error);
  const rows = (data || []).filter(r => r.id !== excludeId);
  if (!rows.length) return '';

  function tally(list) {
    const cat = {}, viol = {};
    for (const r of list) {
      if (r.category) cat[r.category] = (cat[r.category] || 0) + 1;
      for (const v of (r.violations || '').split('; ').filter(Boolean)) viol[v] = (viol[v] || 0) + 1;
    }
    return { count: list.length, cat, viol };
  }
  function fmtCat(cat, total) {
    return Object.entries(cat).sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k} ${n} (${Math.round(100 * n / total)}%)`).join(', ');
  }
  function fmtViol(viol, top = 3) {
    return Object.entries(viol).sort((a, b) => b[1] - a[1]).slice(0, top)
      .map(([k, n]) => `${k} (${n})`).join(', ');
  }

  const lines = [];
  const overall = tally(rows);
  lines.push(`Last ${overall.count} trades: ${fmtCat(overall.cat, overall.count) || 'no categories recorded yet'}.`);
  if (Object.keys(overall.viol).length) lines.push(`Most frequent violations: ${fmtViol(overall.viol)}.`);

  if (setup) {
    const sameSetup = rows.filter(r => r.setup === setup);
    if (sameSetup.length) {
      const s = tally(sameSetup);
      const cleanPct = s.count ? Math.round(100 * (s.cat.A || 0) / s.count) : 0;
      lines.push(`Setup ${setup} trades, ${s.count} prior: clean ${s.cat.A || 0} (${cleanPct}%)` +
        `${Object.keys(s.viol).length ? `, repeat issue(s): ${fmtViol(s.viol, 2)}` : ''}.`);
    }
  }
  return lines.join('\n');
}

// ---------- options / swing plans ----------

export async function listPlans(kind, { status = 'all', account = 'all' } = {}) {
  let query = supabase.from('plans').select('*').eq('kind', kind);
  if (account !== 'all') query = query.eq('account', account);
  if (status === 'active') query = query.in('status', ['planned', 'open']);
  else if (status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  rethrow(error);
  const order = { open: 0, planned: 1 };
  return (data || []).sort((a, b) =>
    (order[a.status] ?? 2) - (order[b.status] ?? 2) || (b.plan_date || '').localeCompare(a.plan_date || '') || b.id - a.id);
}

export async function getPlan(id) {
  const { data, error } = await supabase.from('plans').select('*').eq('id', id).single();
  rethrow(error);
  return data;
}

function planCalc(kind, v, settings) {
  if (kind === 'options') return optionsPlan(v.entry_price, v.stop_price, v.target_price, v.qty, v.account_balance, v.risk_pct, v.direction, v.strike);
  return swingPlan(v.entry_price, v.stop_price, v.target_price, v.qty, v.account_balance, v.risk_pct, calcNum(settings.swing_min_rr, 2), v.direction);
}

// form: raw field values as submitted (strings), plus chk_<key> booleans for the checklist.
// Mirrors app/routes.py's _save_plan. Returns the saved row's id.
export async function savePlan(kind, id, form, settings) {
  const old = id ? await getPlan(id) : null;
  const v = {};
  for (const k of ['plan_date', 'thesis', 'expiry', 'entry_date', 'exit_date', 'exit_reason', 'exit_scenario',
    'entry_followed', 'exit_followed', 'orders_text', 'notes']) v[k] = form[k] || '';
  for (const k of ['plan_date', 'expiry', 'entry_date', 'exit_date']) {
    if (!v[k]) continue;
    const fixed = cleanDate(v[k]);
    if (!fixed) throw new Error(`Could not read "${v[k]}" as a date (${k.replace('_', ' ')}). Use YYYY-MM-DD.`);
    v[k] = fixed;
  }
  v.ticker = (form.ticker || '').toUpperCase();
  v.direction = form.direction || '';
  v.account = form.account === 'live' ? 'live' : 'paper';
  for (const k of ['strike', 'delta', 'bid_ask_spread', 'volume', 'open_interest', 'underlying_entry', 'underlying_stop',
    'underlying_target', 'entry_price', 'stop_price', 'target_price', 'qty', 'account_balance', 'risk_pct',
    'actual_entry', 'actual_exit', 'fees', 'gamma', 'theta', 'hold_days', 'iv', 'iv_shift', 'bid', 'ask']) v[k] = numOrNull(form[k]);
  if (v.account_balance === null) v.account_balance = calcNum(settings.account_balance);
  if (v.risk_pct === null) v.risk_pct = calcNum(kind === 'options' ? settings.options_risk_pct : settings.swing_risk_pct);

  const items = kind === 'options' ? OPTIONS_CHECKLIST : SWING_CHECKLIST;
  const ticks = {};
  for (const [key] of items) ticks[key] = !!form['chk_' + key];
  v.checklist = ticks;

  if (kind === 'options') {
    const est = estimateOptionPremiums(v);
    v.est_premium_stop = est.stop; v.est_premium_target = est.target; v.est_method = est.method;
  }
  const plan = planCalc(kind, v, settings);
  v.investment = plan.investment; v.planned_loss = plan.planned_loss;
  v.potential_profit = plan.potential_profit; v.rr = plan.rr;

  if (v.actual_exit !== null && v.actual_entry === null) v.actual_entry = v.entry_price;
  const res = realized(kind, v.direction, v.qty, v.actual_entry, v.actual_exit, v.fees, plan.planned_loss);
  Object.assign(v, res);

  if (!v.entry_followed && v.entry_price !== null && v.actual_entry !== null) {
    v.entry_followed = Object.values(ticks).every(Boolean) ? 'Y' : 'N';
  }
  if (!v.exit_followed && v.exit_scenario) {
    const match = EXIT_SCENARIOS.find(([k]) => k === v.exit_scenario);
    v.exit_followed = match ? match[2] : '';
  }

  const cancelled = form.cancel === '1' || (old && old.status === 'cancelled' && form.reopen !== '1');
  if (cancelled) v.status = 'cancelled';
  else if (v.actual_exit !== null) v.status = 'closed';
  else if (v.actual_entry !== null) v.status = 'open';
  else v.status = 'planned';

  if (!v.plan_date) v.plan_date = new Date().toISOString().slice(0, 10);
  if (v.status === 'closed' && !v.exit_date) v.exit_date = new Date().toISOString().slice(0, 10);

  if (old) {
    const { error } = await supabase.from('plans').update(v).eq('id', id);
    rethrow(error);
    return id;
  }
  const { data, error } = await supabase.from('plans').insert({ kind, ...v }).select('id').single();
  rethrow(error);
  return data.id;
}

export async function deletePlan(kind, id) {
  const { data: shots } = await supabase.from('attachments').select('filename').eq('kind', kind).eq('ref_id', id);
  if (shots && shots.length) rethrow((await supabase.storage.from('screenshots').remove(shots.map(s => s.filename))).error);
  rethrow((await supabase.from('reviews').delete().eq('kind', kind).eq('ref_id', id)).error);
  rethrow((await supabase.from('attachments').delete().eq('kind', kind).eq('ref_id', id)).error);
  rethrow((await supabase.from('plans').delete().eq('id', id)).error);
}

// ---------- screenshots (Supabase Storage, "screenshots" bucket - see supabase/storage.sql) ----------

function extFor(mime) {
  return { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' }[mime] || null;
}

export async function uploadAttachment(kind, refId, file) {
  const ext = extFor(file.type);
  if (!ext) return null;
  const path = `${kind}/${refId}/${crypto.randomUUID()}${ext}`;
  rethrow((await supabase.storage.from('screenshots').upload(path, file, { contentType: file.type })).error);
  const { data, error } = await supabase.from('attachments').insert({ kind, ref_id: refId, filename: path }).select('id').single();
  rethrow(error);
  const url = await signedUrl(path);
  return { id: data.id, path, url };
}

async function signedUrl(path, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from('screenshots').createSignedUrl(path, expiresIn);
  rethrow(error);
  return data.signedUrl;
}

export async function listAttachments(kind, refId) {
  const { data, error } = await supabase.from('attachments').select('*').eq('kind', kind).eq('ref_id', refId).order('id');
  rethrow(error);
  const out = [];
  for (const r of data || []) out.push({ ...r, url: await signedUrl(r.filename) });
  return out;
}

export async function deleteAttachment(id) {
  const { data } = await supabase.from('attachments').select('filename').eq('id', id).single();
  if (data) rethrow((await supabase.storage.from('screenshots').remove([data.filename])).error);
  rethrow((await supabase.from('attachments').delete().eq('id', id)).error);
}

// Base64-encodes a stored screenshot for the review Pages Function (it never gets Storage
// access itself - the client, under its own authenticated session, reads the bytes and sends
// them along with the review request).
export async function attachmentToBase64(path) {
  const { data, error } = await supabase.storage.from('screenshots').download(path);
  rethrow(error);
  const buf = await data.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return { mime: data.type || 'image/jpeg', dataBase64: btoa(binary) };
}

// Raw bytes of a stored screenshot, for the "Export for Claude" bundles.
export async function downloadAttachment(path) {
  const { data, error } = await supabase.storage.from('screenshots').download(path);
  rethrow(error);
  return { mime: data.type || 'image/jpeg', bytes: new Uint8Array(await data.arrayBuffer()) };
}

// ---------- Claude-chat wrap-up: journal entries, learnings, improvements (supabase/migrate-wrapup.sql) ----------

// Saves a validated tj-wrapup/1 block (see wrapup.js). The journal entry for a date is replaced;
// learnings and improvements are added unless the same (date, text) already exists, so
// re-importing the same wrap-up never duplicates items or resets an improvement's status.
export async function saveWrapup(data) {
  const { date, entry, learnings, improvements } = data;
  rethrow((await supabase.from('journal_entries').upsert({ date, summary: entry.summary, trades: entry.trades }, { onConflict: 'date' })).error);
  if (learnings.length) {
    rethrow((await supabase.from('learnings').upsert(
      learnings.map(l => ({ date, text: l.text, trade_nos: l.trade_nos })),
      { onConflict: 'date,text', ignoreDuplicates: true })).error);
  }
  if (improvements.length) {
    rethrow((await supabase.from('improvements').upsert(
      improvements.map(i => ({ date, text: i.text, target_type: i.target.type, target_value: i.target.value, target_setup: i.target.setup, trade_nos: i.trade_nos, status: i.status || 'proposed', adopted_on: i.adopted_on || null, resolved_on: i.resolved_on || null })),
      { onConflict: 'date,text', ignoreDuplicates: true })).error);
  }
  // Loading the wrap-up is the sign-off that the review is done: trades it covers become complete.
  const nos = [...new Set((entry.trades || []).map(t => t.trade_no).filter(Boolean))];
  if (!nos.length) return 0;
  const done = await supabase.from('scalp_trades').update({ review_status: 'complete' })
    .in('trade_no', nos).eq('date', date).neq('review_status', 'complete').select('id');
  rethrow(done.error);
  return (done.data || []).length;
}

// What a wrap-up for this date would add vs already have, for the import preview.
export async function wrapupExisting(date) {
  const [e, l, i] = await Promise.all([
    supabase.from('journal_entries').select('id').eq('date', date),
    supabase.from('learnings').select('text').eq('date', date),
    supabase.from('improvements').select('text').eq('date', date),
  ]);
  rethrow(e.error); rethrow(l.error); rethrow(i.error);
  return { entry: (e.data || []).length > 0, learnings: new Set((l.data || []).map(r => r.text)), improvements: new Set((i.data || []).map(r => r.text)) };
}

export async function listJournalEntries({ lo, hi, limit } = {}) {
  let q = supabase.from('journal_entries').select('*').order('date', { ascending: false });
  if (lo) q = q.gte('date', lo).lte('date', hi);
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  rethrow(error);
  return data || [];
}

// Everything the app holds for one date (entry, learnings, improvements) plus that day's trades.
export async function getJournalDay(date) {
  const [e, l, i, trades] = await Promise.all([
    supabase.from('journal_entries').select('*').eq('date', date).maybeSingle(),
    supabase.from('learnings').select('*').eq('date', date).order('id'),
    supabase.from('improvements').select('*').eq('date', date).order('id'),
    listScalpTrades({ date }),
  ]);
  rethrow(e.error); rethrow(l.error); rethrow(i.error);
  return { date, entry: e.data, learnings: l.data || [], improvements: i.data || [], trades };
}

// All three tables, optionally limited to a date range - the source for "download all".
export async function listJournalAll({ lo, hi } = {}) {
  const ranged = (q) => (lo ? q.gte('date', lo).lte('date', hi) : q);
  const [e, l, i] = await Promise.all([
    ranged(supabase.from('journal_entries').select('*')),
    ranged(supabase.from('learnings').select('*').order('id')),
    ranged(supabase.from('improvements').select('*').order('id')),
  ]);
  rethrow(e.error); rethrow(l.error); rethrow(i.error);
  return { entries: e.data || [], learnings: l.data || [], improvements: i.data || [] };
}

// Distinct years that have journal data, newest first.
export async function journalYears() {
  const { data, error } = await supabase.from('journal_entries').select('date');
  rethrow(error);
  return [...new Set((data || []).map(r => String(r.date).slice(0, 4)))].sort().reverse();
}

export async function listLearnings(limit = 40) {
  const { data, error } = await supabase.from('learnings').select('*').order('date', { ascending: false }).order('id', { ascending: false }).limit(limit);
  rethrow(error);
  return data || [];
}

export async function listImprovements() {
  const { data, error } = await supabase.from('improvements').select('*').order('date', { ascending: false }).order('id', { ascending: false });
  rethrow(error);
  return data || [];
}

// status: proposed | adopted | resolved | dropped. Adopting stamps adopted_on (today unless given)
// so before/after has a date to split on; resolving stamps resolved_on.
export async function setImprovementStatus(id, status, onDate) {
  const today = onDate || new Date().toISOString().slice(0, 10);
  const patch = { status };
  if (status === 'adopted') { patch.adopted_on = today; patch.resolved_on = null; }
  if (status === 'resolved') patch.resolved_on = today;
  if (status === 'proposed') { patch.adopted_on = null; patch.resolved_on = null; }
  rethrow((await supabase.from('improvements').update(patch).eq('id', id)).error);
}

// ---------- Claude review ----------

export async function listReviews(kind, refId) {
  const { data, error } = await supabase.from('reviews').select('*').eq('kind', kind).eq('ref_id', refId).order('id', { ascending: false });
  rethrow(error);
  return data;
}

export async function saveReview(kind, refId, model, text, gates, proposed) {
  const stored = gates || proposed ? { gates, proposed } : null;
  rethrow((await supabase.from('reviews').insert({
    kind, ref_id: refId, model, text_body: text, proposed_json: stored,
  })).error);
}

export async function deleteScalpTrade(id) {
  const { data: shots } = await supabase.from('attachments').select('filename').eq('kind', 'scalp').eq('ref_id', id);
  if (shots && shots.length) rethrow((await supabase.storage.from('screenshots').remove(shots.map(s => s.filename))).error);
  rethrow((await supabase.from('reviews').delete().eq('kind', 'scalp').eq('ref_id', id)).error);
  rethrow((await supabase.from('attachments').delete().eq('kind', 'scalp').eq('ref_id', id)).error);
  rethrow((await supabase.from('scalp_trades').delete().eq('id', id)).error);
}

function numOrNull(v, fallback = null) {
  if (v === null || v === undefined || v === '') return fallback;
  const { value } = cleanNumber(v);
  return value === null ? fallback : value;
}

function round2(v) { return Math.round((v + Number.EPSILON) * 100) / 100; }
