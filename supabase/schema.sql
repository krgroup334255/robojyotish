-- =================================================================
-- RoboJyotish — Supabase schema
-- Run this in Supabase SQL editor.
-- =================================================================

-- profiles: one row per auth.users, carries admin flag & prefs
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  is_admin boolean default false,
  preferred_language text default 'en',
  created_at timestamptz default now()
);

-- readings: each Jyotish order
create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,

  -- intake form
  full_name text not null,
  birth_date date not null,
  birth_time time not null,
  birth_place_name text not null,
  birth_place_lat double precision not null,
  birth_place_lng double precision not null,
  birth_place_timezone text not null,
  current_location text,
  life_events text[] default '{}',
  life_events_notes text,
  languages text[] default array['en'],   -- en / ta / ms / custom

  -- computed chart (from sweph)
  chart_data jsonb,

  -- AI-generated reading (one entry per language)
  readings jsonb default '{}'::jsonb,

  -- pipeline state
  status text not null default 'pending_payment'
    check (status in (
      'pending_payment',
      'paid',
      'computing_chart',
      'generating',
      'pending_review',
      'approved',
      'released',
      'rejected',
      'failed'
    )),

  -- admin review
  admin_notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,

  -- artefacts
  pdf_paths jsonb default '{}'::jsonb, -- { en: 'readings/xxx/en.pdf', ta: '...' }

  -- payment
  stripe_session_id text,
  stripe_payment_intent text,
  amount_cents integer,
  currency text default 'myr',

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists readings_user_idx on public.readings(user_id);
create index if not exists readings_status_idx on public.readings(status);
create index if not exists readings_created_idx on public.readings(created_at desc);

-- audit log of admin actions
create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid references public.readings(id) on delete cascade,
  admin_id uuid references auth.users(id),
  action text not null,
  diff jsonb,
  created_at timestamptz default now()
);

-- =================================================================
-- Triggers
-- =================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (
    new.id,
    new.email,
    coalesce(
      new.email = any (string_to_array(current_setting('app.admin_bootstrap_emails', true), ',')),
      false
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists readings_touch on public.readings;
create trigger readings_touch
  before update on public.readings
  for each row execute function public.touch_updated_at();

-- =================================================================
-- Row Level Security
-- =================================================================
alter table public.profiles enable row level security;
alter table public.readings enable row level security;
alter table public.admin_audit enable row level security;

-- profiles: users see their own; admins see all
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id);

-- readings: users see their own; admins see all
drop policy if exists readings_self_read on public.readings;
create policy readings_self_read on public.readings
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- inserts/updates happen via service-role key from API routes only.

-- admin_audit: admins only
drop policy if exists admin_audit_admin_only on public.admin_audit;
create policy admin_audit_admin_only on public.admin_audit
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- =================================================================
-- Storage bucket for PDFs
-- Run manually in the Supabase Dashboard → Storage:
--   bucket name: readings
--   public: false
-- Or via SQL:
-- =================================================================
insert into storage.buckets (id, name, public)
values ('readings', 'readings', false)
on conflict (id) do nothing;

-- Users can download their own PDFs; admins can download any.
drop policy if exists readings_bucket_read on storage.objects;
create policy readings_bucket_read on storage.objects
  for select using (
    bucket_id = 'readings'
    and (
      exists (
        select 1 from public.readings r
        where r.user_id = auth.uid()
          and position(r.id::text in name) > 0
          and r.status = 'released'
      )
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.is_admin
      )
    )
  );
