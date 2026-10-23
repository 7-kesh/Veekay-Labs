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
