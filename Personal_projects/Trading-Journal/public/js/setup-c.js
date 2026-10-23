// Port of app/setup_c.py - per-trade evidence log for experimental Setup C.
import { supabase } from './supabase-client.js';
import { ruleEffectiveFrom } from './strategy.js';

export const FIELDS = ['support_below', 'resistance_above', 'room_vs_risk', 'declared_before_entry',
  'ema_hold_2candle', 'crossed_prev_candle_high', 'mom', 'ttm', 'danger_structure',
  'confluence_strength', 'invalidation_price', 'result', 'notes'];

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
