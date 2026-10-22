-- Piggy Payday: run this once in Supabase -> SQL Editor.

-- One generic document table; the app stores buckets / transactions / positions in it.
create table if not exists public.docs (
  collection text not null,
  id         text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

-- Only emails on this list can read or write anything.
create table if not exists public.allowed_emails (
  email text primary key
);

alter table public.docs           enable row level security;
alter table public.allowed_emails enable row level security;  -- no policies: only editable from the SQL editor

-- Security definer so the policy can read allowed_emails even though callers can't.
create or replace function public.is_family()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails a
    where lower(a.email) = lower(auth.jwt() ->> 'email')
  );
$$;
revoke all on function public.is_family() from public, anon;
grant execute on function public.is_family() to authenticated;

drop policy if exists "family only" on public.docs;
create policy "family only" on public.docs
  for all to authenticated
  using (public.is_family())
  with check (public.is_family());

-- Live sync between devices.
alter publication supabase_realtime add table public.docs;

-- >>> EDIT: put the real email addresses that may sign in (yours, your partner's, your kid's if he has one).
insert into public.allowed_emails (email) values
  ('you@example.com')
on conflict do nothing;
