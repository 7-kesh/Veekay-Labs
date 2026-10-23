-- Trading Journal: run this once in Supabase -> SQL Editor. Ported from app/db.py's SQLite
-- schema - real relational tables (not a jsonb blob like piggy-payday-site), since this data
-- is genuinely tabular and benefits from typed columns for stats queries. Single user: locked
-- to Veekay's own email via the same allowed_emails + security-definer gate pattern as
-- piggy-payday-site and ER-Triage, for consistency across this workspace's Supabase projects.

create table if not exists public.allowed_emails (
  email text primary key
);
alter table public.allowed_emails enable row level security;  -- no policies: only editable from the SQL editor

create or replace function public.is_veekay()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails a
    where lower(a.email) = lower(auth.jwt() ->> 'email')
  );
$$;
revoke all on function public.is_veekay() from public, anon;
grant execute on function public.is_veekay() to authenticated;

-- One trigger function, reused by every table below, to keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- settings ----------
create table if not exists public.settings (
  key text primary key,
  value text
);

-- ---------- scalp trades ----------
create table if not exists public.scalp_trades (
  id bigint generated always as identity primary key,
  trade_no text unique,
  account text default 'paper',             -- paper | live
  date date, ticker text, day_seq int,
  entry_time text, exit_time text,          -- "HH:MM", kept as text to match existing format exactly
  entry_price numeric, shares numeric, stop numeric, planned_risk numeric,
  exits_text text, avg_exit numeric,
  commission numeric, gross_pnl numeric, net_pnl numeric, r_multiple numeric,
  category text, setup text,
  setup_valid text, entry_valid text, exit_valid text,
  violations text, emotions text,
  entry_order text, exit_order text,
  orders_text text, notes text,
  tally_2candle text,                       -- success | fail | contaminated | '' - Setup A/B only
  legacy_json jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index if not exists ix_scalp_date on public.scalp_trades(date);

-- ---------- options/swing plans ----------
create table if not exists public.plans (
  id bigint generated always as identity primary key,
  kind text not null,                       -- options | swing
  account text default 'paper',
  ticker text, direction text, status text default 'planned',
  plan_date date, thesis text,
  strike numeric, expiry date, delta numeric, bid_ask_spread numeric, volume numeric, open_interest numeric,
  underlying_entry numeric, underlying_stop numeric, underlying_target numeric,
  entry_price numeric, stop_price numeric, target_price numeric, qty numeric,
  account_balance numeric, risk_pct numeric,
  checklist jsonb,
  investment numeric, planned_loss numeric, potential_profit numeric, rr numeric,
  entry_date date, exit_date date, actual_entry numeric, actual_exit numeric, fees numeric,
  exit_reason text, exit_scenario text, entry_followed text, exit_followed text,
  realized_pl numeric, roi numeric, realized_r numeric,
  orders_text text, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index if not exists ix_plans_kind on public.plans(kind, status);

-- ---------- screenshots ----------
-- file bytes live in Supabase Storage (bucket "screenshots"), not this table - this just
-- indexes them the same way app/db.py's "attachments" table does today.
create table if not exists public.attachments (
  id bigint generated always as identity primary key,
  kind text, ref_id bigint, filename text, created_at timestamptz default now()
);
create index if not exists ix_att on public.attachments(kind, ref_id);

-- ---------- Claude reviews ----------
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  kind text, ref_id bigint, model text, text_body text, proposed_json jsonb,
  created_at timestamptz default now()
);
create index if not exists ix_rev on public.reviews(kind, ref_id);

-- ---------- versioned strategy rules ----------
-- Never edited in place: a change closes the old row (effective_to) and opens a new one
-- (effective_from), so a trade is always assessed against what was in force on its own date.
create table if not exists public.strategy_rules (
  id bigint generated always as identity primary key,
  kind text not null default 'scalp',
  rule_key text not null,
  text_body text not null,
  effective_from date not null,
  effective_to date,
  source text,
  created_at timestamptz default now()
);
create index if not exists ix_rules_lookup on public.strategy_rules(kind, rule_key, effective_from);

create table if not exists public.strategy_change_log (
  id bigint generated always as identity primary key,
  date date not null,
  kind text not null default 'scalp',
  rule_key text not null,
  original text,
  new_text text not null,
  effect text,
  applies_same_day boolean default false,
  created_at timestamptz default now()
);
create index if not exists ix_change_log_date on public.strategy_change_log(date);

-- ---------- experimental Setup C per-trade log ----------
create table if not exists public.setup_c_log (
  id bigint generated always as identity primary key,
  trade_id bigint not null unique references public.scalp_trades(id) on delete cascade,
  version date,
  support_below text, resistance_above text, room_vs_risk text,
  declared_before_entry text, ema_hold_2candle text, crossed_prev_candle_high text,
  mom_ttm text, danger_structure text, confluence_strength text, invalidation_price numeric,
  result text, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

-- ---------- weekly wrap-up free text ----------
create table if not exists public.weekly_notes (
  week_start date primary key,
  action_items text, weekend_prep text, notes text,
  updated_at timestamptz default now()
);

-- ---------- audit trail ----------
create table if not exists public.trade_history (
  id bigint generated always as identity primary key,
  kind text not null default 'scalp',
  trade_id bigint not null,
  field text not null,
  old_value text, new_value text, source text,
  created_at timestamptz default now()
);
create index if not exists ix_trade_history on public.trade_history(kind, trade_id);

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  for t in select unnest(array['scalp_trades', 'plans', 'setup_c_log']) loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format('create trigger touch_updated_at before update on public.%I
                     for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------- RLS: enable everywhere, authenticated-and-allow-listed gets full CRUD, anon gets nothing ----------
do $$
declare t text;
begin
  for t in select unnest(array['settings', 'scalp_trades', 'plans', 'attachments', 'reviews',
                                'strategy_rules', 'strategy_change_log', 'setup_c_log',
                                'weekly_notes', 'trade_history']) loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "veekay only" on public.%I', t);
    execute format('create policy "veekay only" on public.%I
                     for all to authenticated using (public.is_veekay()) with check (public.is_veekay())', t);
  end loop;
end $$;

-- >>> EDIT: put your real sign-in email before running this file.
insert into public.allowed_emails (email) values
  ('you@example.com')
on conflict do nothing;
