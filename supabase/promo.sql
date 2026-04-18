-- =================================================================
-- RoboJyotish — Launch promo: first 1000 unique emails get a FREE reading.
-- Run this AFTER schema.sql.
-- =================================================================

-- Global config (single row).
-- NOTE: is_active defaults to FALSE — the promo counter & free slots stay
-- hidden until you explicitly activate it (see "Activate / deactivate" at
-- the bottom of this file).
create table if not exists public.promo_config (
  id smallint primary key default 1,
  free_cap integer not null default 1000,
  free_claimed integer not null default 0,
  is_active boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint promo_config_singleton check (id = 1)
);

insert into public.promo_config (id, is_active)
  values (1, false)
on conflict (id) do nothing;

-- Record of every email that claimed a free reading (unique per email).
create table if not exists public.promo_claims (
  email text primary key,
  reading_id uuid references public.readings(id) on delete cascade,
  claimed_at timestamptz default now()
);

-- Mark free readings on the readings table.
alter table public.readings
  add column if not exists is_free boolean default false;

-- Public read for the counter (so the landing page can show "867 left").
alter table public.promo_config enable row level security;
drop policy if exists promo_config_public_read on public.promo_config;
create policy promo_config_public_read on public.promo_config
  for select to anon, authenticated using (true);

-- Admins can update the config row.
drop policy if exists promo_config_admin_update on public.promo_config;
create policy promo_config_admin_update on public.promo_config
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- promo_claims: only service role writes; admins read.
alter table public.promo_claims enable row level security;
drop policy if exists promo_claims_admin_read on public.promo_claims;
create policy promo_claims_admin_read on public.promo_claims
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Helper RPC: atomically attempt to claim a free slot for an email.
-- Returns json: { ok, reason, remaining }
create or replace function public.claim_free_slot(p_email text, p_reading_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  cfg record;
  already_claimed boolean;
  new_claimed int;
begin
  select * into cfg from public.promo_config where id = 1 for update;
  if not cfg.is_active then
    return jsonb_build_object('ok', false, 'reason', 'promo_inactive', 'remaining', 0);
  end if;

  select exists(select 1 from public.promo_claims where email = p_email)
    into already_claimed;
  if already_claimed then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed',
      'remaining', greatest(cfg.free_cap - cfg.free_claimed, 0));
  end if;

  if cfg.free_claimed >= cfg.free_cap then
    return jsonb_build_object('ok', false, 'reason', 'cap_reached', 'remaining', 0);
  end if;

  insert into public.promo_claims (email, reading_id)
    values (p_email, p_reading_id);

  update public.promo_config
    set free_claimed = free_claimed + 1, updated_at = now()
    where id = 1
    returning free_claimed into new_claimed;

  update public.readings set is_free = true where id = p_reading_id;

  return jsonb_build_object(
    'ok', true,
    'reason', 'claimed',
    'remaining', greatest(cfg.free_cap - new_claimed, 0)
  );
end;
$$;

grant execute on function public.claim_free_slot(text, uuid) to service_role;

-- =================================================================
-- Activate / deactivate the launch promo (run these manually)
-- =================================================================
-- To START the first-1000-free launch (ONLY once your production domain
-- robojyotish.com is live and all 9 env vars on Vercel are correct):
--
--   update public.promo_config set is_active = true where id = 1;
--
-- To PAUSE / STOP the promo (e.g. cap reached or you want to resume billing):
--
--   update public.promo_config set is_active = false where id = 1;
--
-- To CHANGE the cap (e.g. extend to 2000):
--
--   update public.promo_config set free_cap = 2000 where id = 1;
--
-- To RESET the counter (rarely needed):
--
--   update public.promo_config set free_claimed = 0 where id = 1;
--   truncate public.promo_claims;
