-- Trading Journal: run this once in Supabase -> SQL Editor. Splits Setup C's combined
-- mom_ttm field into separate mom/ttm columns, matching TradeVenture's original Setup_C_Log.csv
-- (which already tracked them separately) rather than the Flask app's combined free-text field.
-- Safe to run as-is: setup_c_log has no rows yet, so there's nothing to migrate.

alter table public.setup_c_log rename column mom_ttm to mom;
alter table public.setup_c_log add column if not exists ttm text;
