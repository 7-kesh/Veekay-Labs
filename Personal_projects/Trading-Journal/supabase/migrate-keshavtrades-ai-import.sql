-- KeshavTrades: private staging for reviewed AI extraction batches.
-- Run once in Supabase SQL Editor after the existing Trading Journal schema.
create table if not exists public.ai_import_batches (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  filename text not null,
  broker text,
  account text not null default 'live',
  file_type text,
  summary text,
  extracted jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.ai_import_batches enable row level security;
drop policy if exists "KeshavTrades owner only" on public.ai_import_batches;
create policy "KeshavTrades owner only" on public.ai_import_batches
  for all to authenticated
  using (public.is_veekay() and user_id = auth.uid())
  with check (public.is_veekay() and user_id = auth.uid());
grant select, insert, delete on public.ai_import_batches to authenticated;
grant usage, select on sequence public.ai_import_batches_id_seq to authenticated;
