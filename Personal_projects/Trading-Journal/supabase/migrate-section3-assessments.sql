-- Trading Journal: run this once in Supabase -> SQL Editor. Promotes known Support/
-- Resistance/Confluence and MOM/TTM from Setup-C-only (setup_c_log) to every scalp trade
-- (scalp_trades), and adds the new Section 3 "Assessments" fields (structure/trigger/
-- extended/EMA alignment), per Veekay's 2026-10-23 form-flow redesign. setup_c_log keeps
-- only what's genuinely Setup-C-specific: room_vs_risk, declared_before_entry,
-- ema_hold_2candle, crossed_prev_candle_high, danger_structure, invalidation_price, result.

alter table public.scalp_trades add column if not exists support_below numeric;
alter table public.scalp_trades add column if not exists resistance_above numeric;
alter table public.scalp_trades add column if not exists confluence_strength text;
alter table public.scalp_trades add column if not exists structure_valid text;
alter table public.scalp_trades add column if not exists trigger_valid text;
alter table public.scalp_trades add column if not exists extended text;
alter table public.scalp_trades add column if not exists ema_alignment text;
alter table public.scalp_trades add column if not exists mom_sign text;
alter table public.scalp_trades add column if not exists mom_direction text;
alter table public.scalp_trades add column if not exists ttm_color text;
alter table public.scalp_trades add column if not exists ttm_direction text;
-- 'draft' = needs review/updating later (plain Save), 'complete' = final check done (Complete review).
alter table public.scalp_trades add column if not exists review_status text default 'draft';

alter table public.setup_c_log drop column if exists support_below;
alter table public.setup_c_log drop column if exists resistance_above;
alter table public.setup_c_log drop column if exists confluence_strength;
alter table public.setup_c_log drop column if exists mom_sign;
alter table public.setup_c_log drop column if exists mom_direction;
alter table public.setup_c_log drop column if exists ttm_color;
alter table public.setup_c_log drop column if exists ttm_direction;
