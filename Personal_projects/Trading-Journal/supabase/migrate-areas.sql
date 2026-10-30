-- Trading Journal: run once in Supabase -> SQL Editor. Splits Improvements, Daily journal, Weekly
-- review and Strategy by area (scalp / options / swing / futures) and adds the weekly commitments
-- that show up on Today and on each area's trade form. Same RLS as every other table.

alter table public.improvements add column if not exists area text not null default 'scalp'
  check (area in ('scalp', 'options', 'swing', 'futures'));

-- Manual daily journal: one row per day per area, typed by hand (the Claude wrap-up import keeps
-- using journal_entries for scalp).
create table if not exists public.journal_notes (
  id bigint generated always as identity primary key,
  date date not null,
  area text not null check (area in ('scalp', 'options', 'swing', 'futures')),
  summary text not null default '',      -- how the day went
  went_well text not null default '',
  to_fix text not null default '',
  tomorrow text not null default '',     -- plan / focus for the next session
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (date, area)
);

-- Weekly review, per area: what went well / what to fix.
create table if not exists public.weekly_area_notes (
  week_start date not null,
  area text not null check (area in ('scalp', 'options', 'swing', 'futures')),
  went_well text not null default '',
  to_fix text not null default '',
  updated_at timestamptz not null default now(),
  primary key (week_start, area)
);

-- Weekly commitments: recorded in a week's review, shown on Today and on that area's trade form
-- while open. status: open -> done / dropped.
create table if not exists public.weekly_actions (
  id bigint generated always as identity primary key,
  week_start date not null,              -- Monday of the review it was recorded in
  area text not null check (area in ('scalp', 'options', 'swing', 'futures')),
  text text not null,
  status text not null default 'open' check (status in ('open', 'done', 'dropped')),
  closed_on date,
  created_at timestamptz not null default now()
);
create index if not exists ix_weekly_actions on public.weekly_actions(area, status);

-- Education backlog: things to learn / study, checked off when done.
create table if not exists public.education_items (
  id bigint generated always as identity primary key,
  text text not null,
  done boolean not null default false,
  done_on date,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  for t in select unnest(array['journal_notes', 'weekly_area_notes', 'weekly_actions', 'education_items']) loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "veekay only" on public.%I', t);
    execute format('create policy "veekay only" on public.%I
                     for all to authenticated using (public.is_veekay()) with check (public.is_veekay())', t);
  end loop;
end $$;

drop trigger if exists touch_updated_at on public.journal_notes;
create trigger touch_updated_at before update on public.journal_notes
  for each row execute function public.touch_updated_at();
