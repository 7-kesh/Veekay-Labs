import assert from 'node:assert/strict';
import { cleanNumber, cleanTime, cleanDate, isDateField, formatUsd } from './numeric.js';
const c = (s) => cleanNumber(s);
assert.deepEqual(c('at 4.67 invalidation'), { value: 4.67, extra: 'at invalidation' });
assert.equal(c('$4.67').value, 4.67);
assert.equal(c('1,234.50').value, 1234.5);
assert.equal(c('-0.48').value, -0.48);
assert.equal(c('.5').value, 0.5);
assert.equal(c('7.12').extra, '');
assert.deepEqual(c(''), { value: null, extra: '' });
assert.equal(c('n/a').value, null);
assert.equal(c(12).value, 12);
const T = cleanTime;
assert.equal(T('942'), '09:42'); assert.equal(T('9.42'), '09:42'); assert.equal(T('9 42'), '09:42');
assert.equal(T('9:42'), '09:42'); assert.equal(T('9:42 am'), '09:42'); assert.equal(T('1:05pm'), '13:05');
assert.equal(T('12:10 am'), '00:10'); assert.equal(T('09:42:15'), '09:42:15'); assert.equal(T('1342'), '13:42');
assert.equal(T('9'), '09:00'); assert.equal(T('25:00'), null); assert.equal(T('9:75'), null); assert.equal(T('abc'), null);
assert.equal(T(''), null);
console.log('numeric ok');

{
  const d = (s) => cleanDate(s, new Date(Date.UTC(2026, 9, 27)));
  assert.equal(d('2026-10-27'), '2026-10-27');
  assert.equal(d('2026-1-5'), '2026-01-05');
  assert.equal(d('10/27/2026'), '2026-10-27');
  assert.equal(d('10/27/26'), '2026-10-27');
  assert.equal(d('10/27'), '2026-10-27');
  assert.equal(d('1027'), '2026-10-27');
  assert.equal(d('20261027'), '2026-10-27');
  assert.equal(d('Oct 27'), '2026-10-27');
  assert.equal(d('october 27, 2026'), '2026-10-27');
  assert.equal(d('27 Oct 2026'), '2026-10-27');
  assert.equal(d('Oct 27th'), '2026-10-27');
  assert.equal(d('2026-02-30'), null);
  assert.equal(d('13/40'), null);
  assert.equal(d('tomorrow'), null);
  assert.equal(d(''), null);
  assert.ok(isDateField('plan_date') && isDateField('expiry') && isDateField('date') && !isDateField('update_x'));
}

assert.equal(formatUsd(4.5), '4.50');
assert.equal(formatUsd(4), '4.00');
assert.equal(formatUsd(4.675), '4.675');
assert.equal(formatUsd(0.0525), '0.0525');
assert.equal(formatUsd(1234.5), '1234.50');
assert.equal(formatUsd(-0.5), '-0.50');
assert.equal(formatUsd(null), '');
