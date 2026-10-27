// Port of app/rule_engine.py - deterministic Objective Assessment checks, no API call.
// Claude handles the gates that need a chart; this is the other half (size, stop presence,
// 5-minute same-ticker reset, category/violation consistency), computed instantly from the
// current (possibly unsaved) form values.

function num(v) {
  const f = parseFloat(v);
  return Number.isNaN(f) ? null : f;
}

function parseTime(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t ?? ''));
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function checkSize(trade, riskDollars) {
  const entry = num(trade.entry_price), stop = num(trade.stop), shares = num(trade.shares);
  if (entry === null || stop === null || shares === null) {
    return { check: 'size', status: 'insufficient_evidence', message: 'Entry, stop or shares not recorded.' };
  }
  const riskPerShare = entry - stop;
  if (riskPerShare <= 0) {
    return { check: 'size', status: 'fail', message: 'Stop is at or above entry - no defined risk.' };
  }
  const planned = riskPerShare * shares;
  const status = planned <= riskDollars + 0.01 ? 'pass' : 'fail';
  return { check: 'size', status,
    message: `${shares} shares x $${riskPerShare.toFixed(2)} risk/share = $${planned.toFixed(2)} planned risk (cap $${riskDollars.toFixed(2)}).` };
}

export function checkStopRecorded(trade) {
  const status = trade.stop !== null && trade.stop !== undefined && trade.stop !== '' ? 'pass' : 'fail';
  return { check: 'stop_recorded', status,
    message: status === 'pass' ? 'Stop recorded.' : 'No stop price recorded on this trade.' };
}

// priorExitTime: latest exit_time (HH:MM) among this ticker's earlier trades the same day, or null.
export function check5minReset(trade, priorExitTime) {
  if (!priorExitTime) {
    return { check: 'process_5min_reset', status: 'pass', message: 'No earlier same-ticker trade today.' };
  }
  const entry = parseTime(trade.entry_time), prior = parseTime(priorExitTime);
  if (entry === null || prior === null) {
    return { check: 'process_5min_reset', status: 'insufficient_evidence', message: 'Entry or prior exit time not recorded.' };
  }
  const gap = entry - prior;
  const status = gap >= 5 ? 'pass' : 'fail';
  return { check: 'process_5min_reset', status, message: `${gap.toFixed(1)} minutes since the prior same-ticker exit (need >= 5).` };
}

export function checkCategoryConsistency(trade) {
  const category = String(trade.category ?? '').trim();
  const violations = trade.violations || [];
  const hasViolations = violations.some(v => String(v).trim());
  if (category === 'A' && hasViolations) {
    return { check: 'category_consistency', status: 'fail', message: 'Category A (clean) but a violation is tagged - A should have none.' };
  }
  if ((category === 'B' || category === 'C') && !hasViolations) {
    return { check: 'category_consistency', status: 'fail', message: `Category ${category} should carry at least one violation tag.` };
  }
  return { check: 'category_consistency', status: 'pass', message: 'Category and violation tags are consistent.' };
}

export function run(trade, priorExitTime, riskDollars) {
  return [
    checkSize(trade, riskDollars),
    checkStopRecorded(trade),
    check5minReset(trade, priorExitTime),
    checkCategoryConsistency(trade),
  ];
}

// ---------------------------------------------------------------------------------------------
// Full manual rule check (2026-10-27). Grades one scalp trade against the strategy's rules (the
// keys in strategy.js / rules/scalp.md) using ONLY what is recorded on the trade form, so it runs
// instantly, offline from any AI, on unsaved edits. Things that need a chart (is the support
// established, did C1 close above resistance) are not guessed: they are checked against YOUR own
// Yes/No answers in the Assessments row, and flagged when those answers contradict each other or
// the numbers. Nothing here changes a rule; the thresholds ($20 1R, $0.20 extension, $0.40 stop,
// 1R of room, 5 minutes) are copied from the rule text.
//
// trade: form values (strings). ctx: {priorExitTime, riskDollars, setupC: {room_vs_risk,
// declared_before_entry, ema_hold_2candle, crossed_prev_candle_high, danger_structure}}.
// Status: pass | fail | warn (risk signal, not a fail) | insufficient_evidence | manual.
const blank = v => v === undefined || v === null || String(v).trim() === '';
const mk = (group, check, rule, title, status, message) => ({ group, check, rule, title, status, message });
const usd = v => `$${Math.abs(v).toFixed(2)}`;

// Tag that the strategy says goes with each failed gate.
export const GATE_TAGS = {
  structure: 'No established support', trigger: 'Anticipated trigger', extension: 'Extended / chase',
  room: 'Inadequate room to resistance', momttm: 'MOM/TTM not confirming', size: 'Planned risk over $20',
  stop: 'No stop set before entry', reset: '5-min reset violated',
};

function momTtm(t) {
  // Improving (Increasing) confirms. Decreasing while negative does not. Decreasing while positive
  // is a risk signal to record, not a fail. TTM sign is read from its colour: Red = negative.
  const parts = [
    ['MOM', t.mom_sign, t.mom_direction],
    ['TTM', blank(t.ttm_color) ? '' : (t.ttm_color === 'Red' ? 'Negative' : 'Positive'), t.ttm_direction],
  ];
  if (parts.some(([, , d]) => blank(d))) {
    return mk('Gates', 'momttm', 'gate_mom_ttm', 'MOM / TTM', 'insufficient_evidence', 'MOM or TTM direction not recorded.');
  }
  const fails = parts.filter(([, s, d]) => d === 'Decreasing' && s !== 'Positive');
  const risks = parts.filter(([, s, d]) => d === 'Decreasing' && s === 'Positive');
  if (fails.length) return mk('Gates', 'momttm', 'gate_mom_ttm', 'MOM / TTM', 'fail', `${fails.map(f => f[0]).join(' and ')} not improving (negative or unknown sign and falling) - does not confirm.`);
  if (risks.length) return mk('Gates', 'momttm', 'gate_mom_ttm', 'MOM / TTM', 'warn', `${risks.map(f => f[0]).join(' and ')} positive but falling - a risk signal to record, not a fail.`);
  return mk('Gates', 'momttm', 'gate_mom_ttm', 'MOM / TTM', 'pass', 'Both improving.');
}

export function runStrategy(t, ctx = {}) {
  const out = [];
  const setup = String(t.setup || '').toUpperCase();
  const entry = num(t.entry_price), stop = num(t.stop), shares = num(t.shares), res = num(t.resistance_above), sup = num(t.support_below);
  const risk = typeof ctx.riskDollars === 'number' ? ctx.riskDollars : 20;
  const violations = (t.violations || []).map(v => String(v).trim()).filter(Boolean);

  // --- Setup and trigger
  if (!['A', 'B', 'C'].includes(setup)) out.push(mk('Setup and trigger', 'setup', 'setup_a', 'Setup', 'insufficient_evidence', 'No setup (A / B / C) chosen.'));
  else out.push(mk('Setup and trigger', 'setup', 'setup_' + setup.toLowerCase(), `Setup ${setup}`, 'pass', 'Setup chosen.'));
  const structureRule = setup === 'B' ? 'setup_b' : setup === 'C' ? 'setup_c' : 'setup_a';
  const structureWhat = setup === 'B' ? 'C1 broke and closed above established resistance' : setup === 'C' ? 'price sits between established support and resistance' : 'C1 held established support';
  if (blank(t.structure_valid)) out.push(mk('Setup and trigger', 'structure', structureRule, 'Structure', 'insufficient_evidence', 'Structure answer not recorded.'));
  else out.push(mk('Setup and trigger', 'structure', structureRule, 'Structure', t.structure_valid === 'Y' ? 'pass' : 'fail', t.structure_valid === 'Y' ? `You recorded: ${structureWhat}.` : `You recorded No: ${structureWhat} did not happen.`));
  if (setup === 'A' && sup === null) out.push(mk('Setup and trigger', 'support_level', 'setup_a', 'Known support level', 'warn', 'Setup A needs an established support: record the support price.'));
  if (blank(t.trigger_valid)) out.push(mk('Setup and trigger', 'trigger', 'trigger', 'Trigger', 'insufficient_evidence', 'Trigger answer not recorded.'));
  else out.push(mk('Setup and trigger', 'trigger', 'trigger', 'Trigger', t.trigger_valid === 'Y' ? 'pass' : 'fail', t.trigger_valid === 'Y' ? 'C2 crossed the C1 high intrabar.' : 'Trigger not valid (anticipated, or C2 never crossed C1 high).'));

  // --- Gates
  out.push(momTtm(t));
  out.push(blank(t.ema_alignment) ? mk('Gates', 'ema_alignment', 'gate_ema_alignment', '8 / 21 EMA alignment', 'insufficient_evidence', 'EMA alignment not recorded.')
    : mk('Gates', 'ema_alignment', 'gate_ema_alignment', '8 / 21 EMA alignment', t.ema_alignment === 'Y' ? 'pass' : 'fail', t.ema_alignment === 'Y' ? '8 EMA above 21 EMA.' : '8 EMA not above 21 EMA.'));
  out.push(blank(t.extended) ? mk('Gates', 'extension', 'gate_ema_extension', '8 EMA extension', 'insufficient_evidence', 'Extended? not answered.')
    : mk('Gates', 'extension', 'gate_ema_extension', '8 EMA extension', t.extended === 'Y' ? 'fail' : 'pass', t.extended === 'Y' ? 'Extended from the 8 EMA (more than about $0.20).' : 'Not extended from the 8 EMA.'));
  const stopOk = checkStopRecorded(t);
  out.push(mk('Gates', 'stop', 'gate_stop_before_entry', 'Stop before entry', stopOk.status, stopOk.status === 'pass' ? 'Stop recorded (whether it was set before entry is your word).' : stopOk.message));
  if (entry === null || stop === null || res === null) {
    out.push(mk('Gates', 'room', 'gate_room', 'Room to resistance', 'insufficient_evidence', 'Needs entry, stop and known resistance.'));
  } else {
    const room = res - entry, need = entry - stop;
    out.push(mk('Gates', 'room', 'gate_room', 'Room to resistance', need > 0 && room >= need - 1e-9 ? 'pass' : 'fail',
      `Room ${usd(room)} vs 1R ${usd(need)}${need > 0 && room >= need - 1e-9 ? '' : ' - less than 1R of room'}.`));
  }
  if (setup === 'C') {
    const d = String((ctx.setupC || {}).danger_structure || '').trim().toLowerCase();
    out.push(!d ? mk('Gates', 'danger', 'gate_danger_structure', 'Danger structure overhead', 'insufficient_evidence', 'Danger structure not recorded for Setup C.')
      : mk('Gates', 'danger', 'gate_danger_structure', 'Danger structure overhead', d === 'none' ? 'pass' : 'fail', d === 'none' ? 'None recorded.' : `Recorded: ${(ctx.setupC || {}).danger_structure}.`));
  } else {
    out.push(mk('Gates', 'danger', 'gate_danger_structure', 'Danger structure overhead', 'manual', 'Check the chart for a double top or repeated rejection above (not recorded for Setup A/B).'));
  }

  // --- Setup C evidence (only when Setup C is chosen)
  if (setup === 'C') {
    const c = ctx.setupC || {};
    const yn = (check, title, v, good, bad) => out.push(blank(v) ? mk('Setup C', check, 'setup_c', title, 'insufficient_evidence', 'Not recorded.') : mk('Setup C', check, 'setup_c', title, v === 'Y' ? 'pass' : 'fail', v === 'Y' ? good : bad));
    yn('c_declared', 'Declared before entry', c.declared_before_entry, 'Declared before entering.', 'Not declared before entry - Setup C is never a relabel of a failed A/B.');
    yn('c_ema_hold', 'Last two candles held the 8 EMA', c.ema_hold_2candle, 'Held.', 'Did not hold the 8 EMA.');
    yn('c_cross', 'Crossed previous candle high', c.crossed_prev_candle_high, 'Crossed.', 'Did not cross the previous candle high.');
    out.push(blank(c.room_vs_risk) ? mk('Setup C', 'c_room', 'setup_c', 'Room vs risk', 'insufficient_evidence', 'Not recorded.')
      : mk('Setup C', 'c_room', 'setup_c', 'Room vs risk', c.room_vs_risk === 'ample' ? 'pass' : c.room_vs_risk === 'tight' ? 'warn' : 'fail', `Recorded: ${c.room_vs_risk}.`));
    if (t.ttm_color === 'Yellow') out.push(mk('Setup C', 'c_yellow', 'setup_c', 'TTM colour', 'warn', 'Yellow TTM is weaker confirmation.'));
    out.push(mk('Setup C', 'c_category', 'categories', 'Category', t.category === 'X' ? 'pass' : (blank(t.category) ? 'insufficient_evidence' : 'fail'),
      t.category === 'X' ? 'Category X (experimental, kept out of A/B results).' : blank(t.category) ? 'Category not chosen (Setup C is category X).' : 'Setup C trades are category X, not A/B/C.'));
  }

  // --- Risk and size
  const size = checkSize(t, risk);
  out.push(mk('Risk and size', 'size', 'sizing', '1R cap', size.status, size.message));
  if (entry !== null && stop !== null && entry > stop) {
    const per = entry - stop;
    out.push(mk('Risk and size', 'stop_distance', 'sizing', 'Stop distance', per > 0.40 + 1e-9 ? 'warn' : 'pass', `${usd(per)} per share (aim under $0.40).`));
  }
  if (shares !== null && shares > 100) out.push(mk('Risk and size', 'share_size', 'sizing', 'Share count', 'warn', `${shares} shares is above the 50-100 range the rules allow for a very good setup.`));

  // --- Process
  const reset = check5minReset(t, ctx.priorExitTime);
  out.push(mk('Process', 'reset', 'sizing', '5-minute reset', reset.status, reset.message));
  const hasExit = !blank(t.exit_time) || !blank(t.exits_text);
  out.push(!hasExit ? mk('Process', 'exit', 'exit_plan', 'Exit plan', 'insufficient_evidence', 'No exit recorded yet.')
    : blank(t.exit_valid) ? mk('Process', 'exit', 'exit_plan', 'Exit plan', 'insufficient_evidence', 'Exit valid not answered.')
      : mk('Process', 'exit', 'exit_plan', 'Exit plan', t.exit_valid === 'Y' ? 'pass' : 'fail', t.exit_valid === 'Y' ? 'You recorded the exit followed the plan.' : 'You recorded the exit did not follow the plan (scale ~25% at the peak, then candle by candle).'));

  // --- Judgement consistency: entry valid, category and tags must agree with the checks above
  const by = k => out.find(c => c.check === k);
  const failed = ['structure', 'trigger', 'ema_alignment', 'extension', 'stop', 'room', 'momttm', 'size', 'reset'].filter(k => by(k) && by(k).status === 'fail');
  const failedNames = failed.map(k => by(k).title);
  if (blank(t.entry_valid)) out.push(mk('Judgement', 'entry_valid', 'categories', 'Entry valid', 'insufficient_evidence', 'Entry valid not answered.'));
  else if (t.entry_valid === 'Y' && failedNames.length) out.push(mk('Judgement', 'entry_valid', 'categories', 'Entry valid', 'fail', `Marked valid, but these failed: ${failedNames.join(', ')}.`));
  else if (t.entry_valid === 'N' && !failedNames.length && !['setup', 'structure'].some(k => by(k) && by(k).status === 'insufficient_evidence')) out.push(mk('Judgement', 'entry_valid', 'categories', 'Entry valid', 'warn', 'Marked invalid, but no gate shows a failure - say why in the notes.'));
  else out.push(mk('Judgement', 'entry_valid', 'categories', 'Entry valid', 'pass', t.entry_valid === 'Y' ? 'Marked valid and no gate failed.' : 'Marked invalid and a gate failed.'));
  const cat = String(t.category || '').trim();
  const hasV = violations.length > 0;
  let catMsg = null;
  if (cat === 'A' && (hasV || failedNames.length || t.entry_valid === 'N')) catMsg = 'Category A (clean) but a violation, failed check or invalid entry is recorded.';
  else if (cat === 'B' && !hasV) catMsg = 'Category B should carry at least one violation tag.';
  else if (cat === 'B' && t.entry_valid === 'N') catMsg = 'Category B means a valid entry, but you marked the entry invalid.';
  else if (cat === 'C' && t.entry_valid === 'Y') catMsg = 'Category C means an invalid entry, but you marked it valid.';
  out.push(blank(cat) ? mk('Judgement', 'category', 'categories', 'Category', 'insufficient_evidence', 'Category not chosen.')
    : mk('Judgement', 'category', 'categories', 'Category', catMsg ? 'fail' : 'pass', catMsg || 'Category agrees with the answers above.'));
  // Each failed gate should carry the tag the strategy names for it.
  const untagged = failed.map(k => ({ k, tag: GATE_TAGS[k === 'ema_alignment' ? null : k] })).filter(x => x.tag && !violations.includes(x.tag));
  if (untagged.length) out.push(mk('Judgement', 'tags_missing', 'violation_tags', 'Violation tags', 'warn', `Failed but not tagged: ${untagged.map(x => x.tag).join('; ')}.`));
  const tagsNoFail = Object.entries(GATE_TAGS).filter(([k, tag]) => violations.includes(tag) && by(k) && by(k).status === 'pass');
  if (tagsNoFail.length) out.push(mk('Judgement', 'tags_extra', 'violation_tags', 'Violation tags', 'warn', `Tagged, but the recorded data passes it: ${tagsNoFail.map(([, tag]) => tag).join('; ')}.`));
  if (!untagged.length && !tagsNoFail.length) out.push(mk('Judgement', 'tags', 'violation_tags', 'Violation tags', 'pass', 'Tags match the failed checks.'));

  const summary = { pass: 0, fail: 0, warn: 0, insufficient_evidence: 0, manual: 0 };
  out.forEach(c => { summary[c.status] += 1; });
  return { checks: out, summary };
}
