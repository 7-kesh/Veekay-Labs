import test from 'node:test';
import assert from 'node:assert/strict';
import { focus } from './improve.js';

const m = { n: 100, net: -170.0 };
function it(title, cost, n, kind = 'rule') {
  return { title, directive: title, cost, n, kind, severity: 'high', per: 1, share: 10, action: 'x' };
}
const items = [it('umbrella', 300, 68, 'umbrella'), it('broad window', 190, 55, 'behaviour'), it('extended', 270, 15),
  it('support', 110, 18), it('dup of support', 110, 18), it('outcome', 50, 10, 'outcome'), it('room', 64, 16)];
const got = focus(items, m, 3).map(f => f.directive);
assert.deepEqual(got, ['extended', 'support', 'room']);

console.log('all improve.js parity tests passed');

test('futures: violation tags are costed by what the tagged trades lost', async () => {
  const { planAreas } = await import('./improve.js');
  const t = (pl, violations) => ({ status: 'closed', realized_pl: pl, violations, planned_loss: 50, rr: 2, realized_r: pl / 50 });
  const rows = [t(-80, ['Moved or removed stop']), t(-40, ['Moved or removed stop', 'Chased / FOMO']), t(120, ['Chased / FOMO']), t(60, [])];
  const m = { n: 4, net: 60, gross_loss: 120, win_pct: 50, avg_win: 90, avg_loss: 60, breakeven_win_pct: 40 };
  const items = planAreas('futures', rows, {}, m);
  const moved = items.find(i => i.title === 'Violation: Moved or removed stop');
  assert.equal(moved.cost, 120);
  assert.equal(moved.n, 2);
  assert.ok(!items.find(i => i.title === 'Violation: Chased / FOMO'), 'a net-positive tag is not a leak');
});
