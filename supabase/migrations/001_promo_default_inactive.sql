-- =================================================================
-- Migration 001 — Deactivate the promo until it's deliberately turned on.
--
-- If you've already run the old promo.sql (which set is_active = true),
-- run this file to pause the counter. It does NOT delete claimed rows
-- and is safe to re-run.
-- =================================================================

-- Change the table default for future inserts.
alter table public.promo_config
  alter column is_active set default false;

-- Deactivate the existing row — this hides the promo banner + counter
-- and makes /api/checkout fall through to Stripe (or dev bypass).
update public.promo_config set is_active = false where id = 1;

-- Sanity check — should show is_active = false
select id, free_cap, free_claimed, is_active from public.promo_config;
