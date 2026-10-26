// Run: node public/js/export-format.test.mjs [outDir]  (writes sample zips when outDir is given)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTradeZip, buildDayZip, resetGapSeconds, toSeconds } from './export-format.js';

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5]);
const item = (no, ticker, shots = 2) => ({
  kind: 'scalp',
  trade: { id: 7, trade_no: no, ticker, date: '2026-10-26', entry_time: '09:41:30', net_pnl: -20.5, notes: 'café – ünïcode', empty: '', nul: null, legacy_json: '{"a":1}' },
  setupC: { danger_structure: 'none', invalidation_price: 5.1, result: null },
  priorSameTickerExit: '09:38:00',
  shots: Array.from({ length: shots }, () => ({ mime: 'image/png', filename: 'x.png', bytes: png })),
});

assert.equal(toSeconds('09:41'), 9 * 3600 + 41 * 60);
assert.equal(toSeconds('junk'), null);
assert.equal(resetGapSeconds('09:38:00', '09:41:30'), 210);
assert.equal(resetGapSeconds(null, '09:41:30'), null);

const t = buildTradeZip(item('T104', 'ABCD'), '2026-10-26T12:00:00Z');
assert.equal(t.filename, 'trade_T104_ABCD_20261026.zip');
const d = buildDayZip('2026-10-26', [item('T104', 'ABCD'), item('T105', 'WXYZ', 0)], '2026-10-26T12:00:00Z');
assert.equal(d.filename, 'day_2026-10-26.zip');

const out = process.argv[2];
if (out) { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(`${out}/${t.filename}`, t.bytes); fs.writeFileSync(`${out}/${d.filename}`, d.bytes); }
console.log('export-format ok');
