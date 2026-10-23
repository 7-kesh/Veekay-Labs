// Port of app/strategy.py (minus build_playbook_pdf - deferred; the PDF needs a JS PDF lib,
// lower priority than the governance flow itself working). Versioned strategy rules: a rule is
// never edited in place - apply_change() closes the old row (effective_to) and opens a new one
// (effective_from), so every trade is graded against what was in force on ITS OWN date.
import { supabase } from './supabase-client.js';
import { getSession } from './auth.js';

export const SEED_DATE = '2026-10-19';

export const SEED_SCALP = [
  ['setup_a', 'Setup A - support hold',
    'Established support exists; C1 holds established support; C2 crosses C1 high intrabar -> '
    + 'potential entry. Established support = a level that has held for several candles; a low '
    + 'formed one or two candles ago is not established.'],
  ['setup_b', 'Setup B - resistance break',
    'Established resistance exists; C1 breaks AND CLOSES above it; C2 crosses C1 high intrabar '
    + '-> potential entry. No retest required. A wick through with a close below is not a break.'],
  ['trigger', 'Trigger',
    'Buy intrabar when C2 crosses above C1 high. A missed C2 is a missed trade. Only '
    + 'support/resistance known at entry may be used.'],
  ['setup_c', 'Setup C (experimental v0.4) - category X, never counted in A/B results',
    'Price between established support and resistance with meaningful room; the last two '
    + 'candles hold the 8 EMA and trend up; MOM and TTM positive (yellow TTM = weaker '
    + 'confirmation); current candle crosses above the previous candle high; stop a few cents '
    + 'below the previous candle low; sized by risk. Declared before entry, never a relabel of '
    + 'a failed A/B.'],
  ['gate_mom_ttm', 'Gate - MOM/TTM',
    'MOM and TTM improving towards positive (both). Negative and still falling does not '
    + 'confirm. Positive but falling is a risk signal to record, not a fail.'],
  ['gate_ema_alignment', 'Gate - 8/21 EMA alignment', '8 EMA above 21 EMA, all setups.'],
  ['gate_ema_extension', 'Gate - 8 EMA extension',
    'Not significantly extended from the 8 EMA: a fill more than about $0.20 above it is '
    + "extended, read with the stock's volatility."],
  ['gate_stop_before_entry', 'Gate - stop before entry', 'Structural stop identified BEFORE entry.'],
  ['gate_room', 'Gate - room to resistance',
    'Room to the next known resistance/HOD of at least 1R: (resistance - entry) >= '
    + '(entry - stop). HOD stays resistance until broken. VWAP is not resistance. A single '
    + 'candle body is not known resistance.'],
  ['gate_danger_structure', 'Gate - no danger structure', 'No danger structure overhead (double top, repeated rejection).'],
  ['sizing', 'Risk and size',
    '1R = $20 maximum planned risk. Shares = floor($20 / (entry - stop)). Less risk is '
    + 'allowed. Standing size 50 shares with a mental stop within about $0.40. A high-risk '
    + 'trade starts at 20 shares. A really good setup with a stop $0.20-$0.40 away can go to '
    + '50-100 shares. The stop comes first, then size. Mental stop: aim under $0.40 per share. '
    + 'Exit early only on objective deterioration; an early exit without it is a fear/emotional '
    + 'exit. One candle failing to make a new high is not deterioration.'],
  ['exit_plan', 'Exit plan',
    'Scale out about 25% of the REMAINING position at the peak (candle rising and extended '
    + 'from the 8 EMA fast). Then candle by candle: next candle beats the previous high -> '
    + 'stay; if not, watch one more candle and take another 25% if it drops; exit fully if the '
    + 'trade does not survive. A planned 25% partial is a valid exit. A full exit where the '
    + 'plan calls for a second 25% is recorded as early.'],
  ['categories', 'Categories',
    'A clean execution; B valid entry with an execution or management issue; C invalid '
    + 'entry; X experimental Setup C.'],
  ['violation_tags', 'Primary violation tags',
    'No established support; Inadequate room to resistance; Extended / chase; Anticipated '
    + 'trigger; MOM/TTM not confirming; Late entry / setup expired.'],
];

export const STRATEGY_LABELS = Object.fromEntries(SEED_SCALP.map(([k, label]) => [k, label]));
export const STRATEGY_ORDER = SEED_SCALP.map(([k]) => k);

function rethrow(error) { if (error) throw error; }

export async function seedIfEmpty() {
  const { data, error } = await supabase.from('strategy_rules').select('rule_key').eq('kind', 'scalp');
  rethrow(error);
  const existing = new Set((data || []).map(r => r.rule_key));
  const missing = SEED_SCALP.filter(([k]) => !existing.has(k));
  if (!missing.length) return;
  const rows = missing.map(([rule_key, , text_body]) => ({
    kind: 'scalp', rule_key, text_body, effective_from: SEED_DATE, source: 'initial seed from rules/scalp.md',
  }));
  rethrow((await supabase.from('strategy_rules').insert(rows)).error);
}

export async function currentRules(kind = 'scalp', asOf = null) {
  const date = asOf || new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from('strategy_rules').select('rule_key,text_body,effective_from')
    .eq('kind', kind).lte('effective_from', date)
    .or(`effective_to.is.null,effective_to.gt.${date}`)
    .order('rule_key', { ascending: true }).order('effective_from', { ascending: false });
  rethrow(error);
  const out = {};
  for (const r of data || []) if (!(r.rule_key in out)) out[r.rule_key] = r.text_body;
  return out;
}

export async function rulesTextFor(kind = 'scalp', asOf = null) {
  const rules = await currentRules(kind, asOf);
  const lines = [];
  for (const [ruleKey, text] of Object.entries(rules)) {
    lines.push(`**${STRATEGY_LABELS[ruleKey] || ruleKey}**: ${text}`);
  }
  return lines.join('\n\n');
}

export async function ruleEffectiveFrom(ruleKey, asOf = null, kind = 'scalp') {
  const date = asOf || new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from('strategy_rules').select('effective_from')
    .eq('kind', kind).eq('rule_key', ruleKey).lte('effective_from', date)
    .or(`effective_to.is.null,effective_to.gt.${date}`)
    .order('effective_from', { ascending: false }).limit(1);
  rethrow(error);
  return data && data[0] ? data[0].effective_from : null;
}

export async function changeLog(kind = 'scalp') {
  const { data, error } = await supabase.from('strategy_change_log').select('*').eq('kind', kind).order('id', { ascending: false });
  rethrow(error);
  return data;
}

export async function applyChange(kind, ruleKey, newText, effectiveFrom, effect, appliesSameDay, source) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: currentRows, error: ce } = await supabase.from('strategy_rules').select('*')
    .eq('kind', kind).eq('rule_key', ruleKey).lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gt.${today}`)
    .order('effective_from', { ascending: false }).limit(1);
  rethrow(ce);
  const current = currentRows && currentRows[0];
  const originalText = current ? current.text_body : null;
  if (current) rethrow((await supabase.from('strategy_rules').update({ effective_to: effectiveFrom }).eq('id', current.id)).error);
  rethrow((await supabase.from('strategy_rules').insert({
    kind, rule_key: ruleKey, text_body: newText, effective_from: effectiveFrom, source,
  })).error);
  rethrow((await supabase.from('strategy_change_log').insert({
    date: today, kind, rule_key: ruleKey, original: originalText, new_text: newText,
    effect, applies_same_day: !!appliesSameDay,
  })).error);
}

// Calls the /api/classify-change Pages Function (keeps the Anthropic key server-side).
export async function classifyChange(ruleKey, originalText, newText, model) {
  const session = await getSession();
  if (!session) throw new Error('Not signed in.');
  const res = await fetch('/api/classify-change', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ ruleKey, originalText, newText, model }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not classify the change.');
  return data;
}
