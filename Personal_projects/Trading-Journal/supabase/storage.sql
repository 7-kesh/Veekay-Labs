-- Trading Journal: run this once in Supabase -> SQL Editor, after schema.sql.
-- Creates the "screenshots" bucket (private - not public) and locks it to Veekay's own
-- account via the same is_veekay() gate schema.sql already set up, so screenshots get the
-- same allow-listed-only access as every other table.

insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

drop policy if exists "veekay only - screenshots" on storage.objects;
create policy "veekay only - screenshots" on storage.objects
  for all to authenticated
  using (bucket_id = 'screenshots' and public.is_veekay())
  with check (bucket_id = 'screenshots' and public.is_veekay());
