// One-time import of the local Flask app's real trade history into Supabase. Reads a JSON
// file exported from data/journal.db (scalp_trades + trade_history + reviews) and writes it
// under the signed-in user's own session, same as every other write in this app - never a
// service-role key. Idempotent: skips any trade_no already present, same as app/importer.py.
import { supabase } from './supabase-client.js';

function rethrow(error) { if (error) throw error; }

export async function importLocalData(file, onProgress) {
  const text = await file.text();
  const data = JSON.parse(text);
  const log = (msg) => { if (onProgress) onProgress(msg); };

  const { data: existingRows, error: ee } = await supabase.from('scalp_trades').select('trade_no');
  rethrow(ee);
  const existing = new Set((existingRows || []).map(r => r.trade_no));

  // legacy_json was a plain TEXT column in SQLite (a JSON-encoded string); the Postgres schema
  // uses jsonb for it, so parse it into a real object here rather than double-encoding a string.
  const toInsert = (data.scalp_trades || []).filter(t => !existing.has(t.trade_no)).map(t => ({
    ...t, legacy_json: t.legacy_json ? JSON.parse(t.legacy_json) : null,
  }));
  const skipped = (data.scalp_trades || []).length - toInsert.length;
  log(`${toInsert.length} new trades to import, ${skipped} already present (skipped).`);
  if (!toInsert.length) return { trades: 0, skipped, history: 0, reviews: 0 };

  const { data: inserted, error: ie } = await supabase.from('scalp_trades').insert(toInsert).select('id,trade_no');
  rethrow(ie);
  const idByTradeNo = new Map(inserted.map(r => [r.trade_no, r.id]));
  log(`Inserted ${inserted.length} trades.`);

  const historyRows = (data.trade_history || [])
    .filter(h => idByTradeNo.has(h.trade_no))
    .map(h => ({
      kind: 'scalp', trade_id: idByTradeNo.get(h.trade_no), field: h.field,
      old_value: h.old_value, new_value: h.new_value, source: h.source, created_at: h.created_at,
    }));
  if (historyRows.length) rethrow((await supabase.from('trade_history').insert(historyRows)).error);
  log(`Inserted ${historyRows.length} history rows.`);

  const reviewRows = (data.reviews || [])
    .filter(r => idByTradeNo.has(r.trade_no))
    .map(r => ({
      kind: 'scalp', ref_id: idByTradeNo.get(r.trade_no), model: r.model, text_body: r.text,
      proposed_json: r.proposed_json ? JSON.parse(r.proposed_json) : null, created_at: r.created_at,
    }));
  if (reviewRows.length) rethrow((await supabase.from('reviews').insert(reviewRows)).error);
  log(`Inserted ${reviewRows.length} review rows.`);

  return { trades: inserted.length, skipped, history: historyRows.length, reviews: reviewRows.length };
}
