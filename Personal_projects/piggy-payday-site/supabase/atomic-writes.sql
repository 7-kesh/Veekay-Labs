-- Piggy Payday: safe money moves. Run in Supabase -> SQL Editor AFTER schema.sql (safe to re-run).
--
-- Every deposit / withdrawal / invest / sell is ONE database operation that locks the rows it
-- touches, so two devices can't overwrite each other, a half-finished step can't happen, and an
-- overdraw is refused by the database itself. Signed-in users can no longer write to `docs`
-- directly; they can only call these functions.

drop policy if exists "family only" on public.docs;
drop policy if exists "family read" on public.docs;
create policy "family read" on public.docs
  for select to authenticated
  using (public.is_family());
revoke insert, update, delete on public.docs from anon, authenticated;

-- ---------- helpers (not callable from the app) ----------
create or replace function public.piggy_now() returns text
language sql stable as $$
  select to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;

create or replace function public.piggy_new_id() returns text
language sql volatile as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 20)
$$;

create or replace function public.piggy_require_family() returns void
language plpgsql stable as $$
begin
  if not public.is_family() then raise exception 'not allowed'; end if;
end $$;

-- Changes one bank under a row lock; refuses to go below $0. Returns the new balance.
create or replace function public.piggy_apply_bucket(
  p_bucket text, p_delta numeric, p_earned numeric, p_withdrawn numeric, p_market numeric
) returns numeric
language plpgsql security definer set search_path = public as $$
declare cur jsonb; newbal numeric;
begin
  if p_bucket not in ('save', 'gift', 'spend') then raise exception 'unknown bank: %', p_bucket; end if;
  -- First use on a fresh database: create the bank at $0.
  insert into public.docs (collection, id, data) values ('buckets', p_bucket,
    jsonb_build_object('balance', 0, 'label', initcap(p_bucket), 'totalEarned', 0, 'totalWithdrawn', 0, 'marketNet', 0))
  on conflict (collection, id) do nothing;
  select data into cur from public.docs where collection = 'buckets' and id = p_bucket for update;
  newbal := round((cur->>'balance')::numeric + p_delta, 2);
  if newbal < 0 then raise exception 'not enough money in %', p_bucket; end if;
  update public.docs set
    data = cur || jsonb_build_object(
      'balance', newbal,
      'totalEarned',    round(coalesce((cur->>'totalEarned')::numeric, 0)    + p_earned, 2),
      'totalWithdrawn', round(coalesce((cur->>'totalWithdrawn')::numeric, 0) + p_withdrawn, 2),
      'marketNet',      round(coalesce((cur->>'marketNet')::numeric, 0)      + p_market, 2),
      'updatedAt', public.piggy_now()),
    updated_at = now()
  where collection = 'buckets' and id = p_bucket;
  return newbal;
end $$;

create or replace function public.piggy_add_txn(
  p_type text, p_bucket text, p_amount numeric, p_after numeric, p_note text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.docs (collection, id, data) values ('transactions', public.piggy_new_id(),
    jsonb_build_object('type', p_type, 'bucket', p_bucket, 'amount', p_amount,
      'balanceAfter', p_after, 'note', coalesce(left(p_note, 60), ''), 'ts', public.piggy_now()));
end $$;

revoke all on function public.piggy_apply_bucket(text, numeric, numeric, numeric, numeric) from public, anon, authenticated;
revoke all on function public.piggy_add_txn(text, text, numeric, numeric, text)            from public, anon, authenticated;

-- ---------- what the app calls ----------
-- p_alloc looks like {"save": 2.5, "gift": 1, "spend": 0.5}
create or replace function public.piggy_deposit(p_alloc jsonb, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare b text; amt numeric; nb numeric; total numeric := 0;
begin
  perform public.piggy_require_family();
  for b in select jsonb_object_keys(p_alloc) loop
    if b not in ('save', 'gift', 'spend') then raise exception 'unknown bank: %', b; end if;
  end loop;
  foreach b in array array['save', 'gift', 'spend'] loop
    amt := round(coalesce((p_alloc->>b)::numeric, 0), 2);
    if amt < 0 then raise exception 'amount can''t be negative'; end if;
    if amt > 0 then
      nb := public.piggy_apply_bucket(b, amt, amt, 0, 0);
      perform public.piggy_add_txn('deposit', b, amt, nb, p_note);
      total := total + amt;
    end if;
  end loop;
  if total <= 0 then raise exception 'nothing to deposit'; end if;
end $$;

create or replace function public.piggy_withdraw(p_bucket text, p_amount numeric, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare amt numeric := round(p_amount, 2); nb numeric;
begin
  perform public.piggy_require_family();
  if amt is null or amt <= 0 then raise exception 'enter an amount greater than 0'; end if;
  nb := public.piggy_apply_bucket(p_bucket, -amt, 0, amt, 0);
  perform public.piggy_add_txn('withdraw', p_bucket, amt, nb, p_note);
end $$;

-- p_level is the index level the app is showing. The database can't check live prices itself,
-- so it only rejects absurd values.
create or replace function public.piggy_invest(p_index text, p_amount numeric, p_level numeric) returns void
language plpgsql security definer set search_path = public as $$
declare amt numeric := round(p_amount, 2); nb numeric; label text;
begin
  perform public.piggy_require_family();
  if p_index not in ('sp', 'nas') then raise exception 'unknown market: %', p_index; end if;
  if amt is null or amt <= 0 then raise exception 'enter an amount greater than 0'; end if;
  if p_level is null or p_level < 1000 or p_level > 200000 then raise exception 'bad market level'; end if;
  label := case p_index when 'sp' then 'S&P 500' else 'NASDAQ' end;
  nb := public.piggy_apply_bucket('save', -amt, 0, 0, amt);
  insert into public.docs (collection, id, data) values ('positions', public.piggy_new_id(),
    jsonb_build_object('index', p_index, 'amount', amt, 'units', amt / p_level,
      'buyLevel', p_level, 'status', 'open', 'ts', public.piggy_now()));
  perform public.piggy_add_txn('invest', 'save', amt, nb, 'Invested in ' || label);
end $$;

-- Returns the dollar value credited back to Save.
create or replace function public.piggy_sell(p_position_id text, p_level numeric) returns numeric
language plpgsql security definer set search_path = public as $$
declare pos jsonb; v numeric; gain numeric; nb numeric; label text;
begin
  perform public.piggy_require_family();
  if p_level is null or p_level < 1000 or p_level > 200000 then raise exception 'bad market level'; end if;
  select data into pos from public.docs where collection = 'positions' and id = p_position_id for update;
  if pos is null then raise exception 'investment not found'; end if;
  if pos->>'status' <> 'open' then raise exception 'already sold'; end if;
  v := round((pos->>'units')::numeric * p_level, 2);
  gain := round(v - (pos->>'amount')::numeric, 2);
  label := case pos->>'index' when 'sp' then 'S&P 500' else 'NASDAQ' end;
  nb := public.piggy_apply_bucket('save', v, 0, 0, -v);
  update public.docs set
    data = pos || jsonb_build_object('status', 'sold', 'soldValue', v, 'soldTs', public.piggy_now()),
    updated_at = now()
  where collection = 'positions' and id = p_position_id;
  perform public.piggy_add_txn('divest', 'save', v, nb,
    'Sold ' || label || ' (' || case when gain >= 0 then '+$' else E'−$' end || abs(gain)::text || ')');
  return v;
end $$;

revoke all on function public.piggy_deposit(jsonb, text)               from public, anon;
revoke all on function public.piggy_withdraw(text, numeric, text)      from public, anon;
revoke all on function public.piggy_invest(text, numeric, numeric)     from public, anon;
revoke all on function public.piggy_sell(text, numeric)                from public, anon;
grant execute on function public.piggy_deposit(jsonb, text)            to authenticated;
grant execute on function public.piggy_withdraw(text, numeric, text)   to authenticated;
grant execute on function public.piggy_invest(text, numeric, numeric)  to authenticated;
grant execute on function public.piggy_sell(text, numeric)             to authenticated;
