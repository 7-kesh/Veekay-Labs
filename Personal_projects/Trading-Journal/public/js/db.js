// Data layer over Supabase - port of app/db.py + the trade-save logic in app/routes.py's
// _save_scalp / _next_trade_no / _suggest_category, plus app/audit.py's log_changes.
import { supabase } from './supabase-client.js';
import { DEFAULT_SETTINGS } from './constants.js';
import { scalpResult } from './calc.js';
import * as setupC from './setup-c.js';

function rethrow(error) { if (error) throw error; }

// ---------- settings ----------

// Screenshots auto-expire after 30 days - the review's text output is the durable record, not
// the raw image. Lazy, same as app/db.py's purge_old_screenshots(): runs once per app load,
// no cron needed.
export async function purgeOldScreenshots(days = 30) {
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

export async function getScalpTrade(id) {
  const { data, error } = await supabase.from('scalp_trades').select('*').eq('id', id).single();
  rethrow(error);
  return data;
}

async function nextTradeNo() {
  // trade_no is always assigned as max+1 at insert time, so it stays monotonic with id -
  // the newest row by id always holds the highest trade_no, deletions notwithstanding.
  const { data, error } = await supabase.from('scalp_trades').select('trade_no')
    .order('id', { ascending: false }).limit(1);
  rethrow(error);
  const last = data && data[0] ? parseInt(String(data[0].trade_no || '').slice(1), 10) : 0;
  return 'T' + String((Number.isNaN(last) ? 0 : last) + 1).padStart(3, '0');
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
    entry_order: form.entry_order || '', exit_order: form.exit_order || '', orders_text: form.orders_text || '',
    notes: form.notes || '', tally_2candle: form.tally_2candle || '',
    ticker: (form.ticker || '').toUpperCase(),
    account: form.account === 'live' ? 'live' : 'paper',
    violations: (form.violations || []).join('; '),
    emotions: (form.emotions || []).join('; '),
    entry_price: numOrNull(form.entry_price), shares: numOrNull(form.shares), stop: numOrNull(form.stop),
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
  const f = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,%]/g, ''));
  return Number.isNaN(f) ? fallback : f;
}

function round2(v) { return Math.round((v + Number.EPSILON) * 100) / 100; }
