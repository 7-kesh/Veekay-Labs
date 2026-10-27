-- Trading Journal: run once in Supabase -> SQL Editor, BEFORE deploying the matching app version.
-- Options plans: gamma and theta for the premium-move estimate, planned hold days, and bid/ask stored
-- separately, the estimate saved with each plan (to compare against what actually happened), plus implied volatility (and an expected IV change) for the Black-Scholes estimate (the spread is still saved in bid_ask_spread). Safe to re-run.
alter table public.plans
  add column if not exists gamma numeric,
  add column if not exists theta numeric,      -- $ per share per day; brokers show it negative, the app uses its size
  add column if not exists hold_days numeric,  -- planned days to hold (theta decay is hold_days * theta)
  add column if not exists iv numeric,         -- implied volatility, % (e.g. 35)
  add column if not exists iv_shift numeric,   -- expected IV change by the exit, in points (e.g. -5 for an IV crush)
  add column if not exists est_premium_stop numeric,    -- estimated premium at the stock stop, saved with the plan
  add column if not exists est_premium_target numeric,  -- estimated premium at the stock target
  add column if not exists est_method text,             -- black-scholes | delta
  add column if not exists bid numeric,
  add column if not exists ask numeric;
