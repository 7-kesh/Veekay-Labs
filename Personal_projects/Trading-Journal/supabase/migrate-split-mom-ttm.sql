-- Trading Journal: run this once in Supabase -> SQL Editor. Splits Setup C's MOM/TTM into
-- four selectable fields instead of free text: mom_sign (Negative/Positive), mom_direction
-- (Increasing/Decreasing), ttm_color (Red/Yellow/Green/Blue), ttm_direction
-- (Increasing/Decreasing). Safe to run regardless of whether an earlier version of this
-- migration (mom_ttm -> mom/ttm) already ran - setup_c_log has no rows yet either way.

alter table public.setup_c_log drop column if exists mom_ttm;
alter table public.setup_c_log drop column if exists mom;
alter table public.setup_c_log drop column if exists ttm;
alter table public.setup_c_log add column if not exists mom_sign text;
alter table public.setup_c_log add column if not exists mom_direction text;
alter table public.setup_c_log add column if not exists ttm_color text;
alter table public.setup_c_log add column if not exists ttm_direction text;
