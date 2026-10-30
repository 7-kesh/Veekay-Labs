-- Trading Journal: run once in Supabase -> SQL Editor, BEFORE deploying the matching app version.
-- Futures trades live in public.plans with kind = 'futures' (same table as options/swing). New columns
-- only; nothing existing changes. Contract details are typed per trade (nothing built in). Safe to re-run.
alter table public.plans
  add column if not exists point_value numeric,       -- $ per full point, e.g. 5 for MES
  add column if not exists tick_size numeric,         -- price increment, e.g. 0.25
  add column if not exists session text,              -- Asia | London | NY open | RTH | Overnight
  add column if not exists entry_time text,
  add column if not exists exit_time text,
  add column if not exists margin_used numeric,       -- total margin held for the position, $
  add column if not exists daily_loss_limit numeric,  -- $ you will not lose past in a day
  add column if not exists max_contracts numeric,
  add column if not exists setup text,
  add column if not exists emotions jsonb,
  add column if not exists violations jsonb,
  add column if not exists realized_ticks numeric;
