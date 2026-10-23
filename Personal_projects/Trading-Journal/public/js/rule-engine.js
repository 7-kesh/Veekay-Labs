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
