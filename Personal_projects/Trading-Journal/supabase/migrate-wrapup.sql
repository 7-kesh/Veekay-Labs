-- Trading Journal: run once in Supabase -> SQL Editor. Adds the tables behind the Claude-chat
-- workflow (docs/1_PRD.md section 12): journal entries, learnings and improvements imported
-- from the "wrap up for today" block (schema tj-wrapup/1). Same RLS as every other table.

create table if not exists public.journal_entries (
  id bigint generated always as identity primary key,
  date date not null unique,
  summary text not null default '',
  trades jsonb not null default '[]'::jsonb,   -- [{trade_no, verdict, category, violations[], lesson}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learnings (
  id bigint generated always as identity primary key,
  date date not null,
  text text not null,
  trade_nos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (date, text)
);

create table if not exists public.improvements (
  id bigint generated always as identity primary key,
  date date not null,
  text text not null,
  target_type text not null default 'none' check (target_type in ('violation', 'metric', 'none')),
  target_value text,
  target_setup text,
  trade_nos jsonb not null default '[]'::jsonb,
  status text not null default 'proposed' check (status in ('proposed', 'adopted', 'resolved', 'dropped')),
  adopted_on date,
  resolved_on date,
  created_at timestamptz not null default now(),
  unique (date, text)
);

do $$
declare t text;
begin
  for t in select unnest(array['journal_entries', 'learnings', 'improvements']) loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "veekay only" on public.%I', t);
    execute format('create policy "veekay only" on public.%I
                     for all to authenticated using (public.is_veekay()) with check (public.is_veekay())', t);
  end loop;
end $$;

drop trigger if exists touch_updated_at on public.journal_entries;
create trigger touch_updated_at before update on public.journal_entries
  for each row execute function public.touch_updated_at();
