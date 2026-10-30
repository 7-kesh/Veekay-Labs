// Port of app/setup_c.py - per-trade evidence log for experimental Setup C.
import { supabase } from './supabase-client.js';
import { ruleEffectiveFrom } from './strategy.js';
import { cleanNumber } from './numeric.js';

// Setup-C-specific only - known Support/Resistance/Confluence and MOM/TTM moved onto every
// scalp trade (scalp_trades columns, see constants.js), since Section 3's assessment applies
// to every setup, not just the experimental one. See supabase/migrate-section3-assessments.sql.
export const FIELDS = ['room_vs_risk', 'declared_before_entry', 'ema_hold_2candle', 'crossed_prev_candle_high',
  'danger_structure', 'invalidation_price', 'result', 'notes'];

export const RESULTS = { X: 'X - valid sample', C: 'C - failed a gate', E: 'E - under review' };

function rethrow(error) { if (error) throw error; }

export async function get(tradeId) {
  const { data, error } = await supabase.from('setup_c_log').select('*').eq('trade_id', tradeId).maybeSingle();
  rethrow(error);
  return data;
}

// form: {support_below, resistance_above, ..., setup_c_notes} - setup_c_notes maps to the
// "notes" column, since the trade's own notes textarea already owns name="notes".
export async function save(tradeId, tradeDate, form) {
  const values = {};
  for (const k of FIELDS) {
    const raw = k === 'notes' ? form.setup_c_notes : form[k];
    values[k] = raw || null;
  }
  // invalidation_price is a numeric column: keep the number, and move any words typed with it into notes.
  if (values.invalidation_price) {
    const { value, extra } = cleanNumber(values.invalidation_price);
    values.invalidation_price = value;
    if (extra) values.notes = [values.notes, `Invalidation note: ${extra}`].filter(Boolean).join('\n');
  }
  const version = await ruleEffectiveFrom('setup_c', tradeDate);
  const existing = await get(tradeId);
  if (existing) {
    rethrow((await supabase.from('setup_c_log').update({ version, ...values }).eq('trade_id', tradeId)).error);
  } else {
    rethrow((await supabase.from('setup_c_log').insert({ trade_id: tradeId, version, ...values })).error);
  }
}

export async function tally() {
  const { data, error } = await supabase.from('setup_c_log').select('result');
  rethrow(error);
  const out = { X: 0, C: 0, E: 0, 'not recorded': 0 };
  for (const r of data || []) out[r.result || 'not recorded'] = (out[r.result || 'not recorded'] || 0) + 1;
  return out;
}

// Quick-record from the weekly review: set only the result on a Setup C trade's evidence row.
export async function setResult(tradeId, tradeDate, result) {
  const existing = await get(tradeId);
  if (existing) rethrow((await supabase.from('setup_c_log').update({ result: result || null }).eq('trade_id', tradeId)).error);
  else rethrow((await supabase.from('setup_c_log').insert({ trade_id: tradeId, version: await ruleEffectiveFrom('setup_c', tradeDate), result: result || null })).error);
}

// Results for many trades in ONE query: Map of trade_id -> result ('' when not recorded).
export async function resultsFor(tradeIds) {
  if (!tradeIds.length) return new Map();
  const { data, error } = await supabase.from('setup_c_log').select('trade_id,result').in('trade_id', tradeIds);
  rethrow(error);
  return new Map((data || []).map(r => [r.trade_id, r.result || '']));
}
