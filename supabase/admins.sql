-- =================================================================
-- RoboJyotish — Admin bootstrap
-- Run this in Supabase SQL Editor. Safe to re-run (idempotent).
--
-- Edit the admin_emails list below to add / remove admins.
-- Any user signing in with a matching email is automatically granted
-- is_admin = true. Already-signed-in users are also updated on run.
-- =================================================================

-- 1) Central list of admin emails (single source of truth).
create table if not exists public.admin_emails (
  email text primary key,
  added_at timestamptz default now()
);

-- 2) Insert / refresh the current admin roster.
insert into public.admin_emails (email) values
  ('kannankrisha4767@gmail.com'),
  ('balaramr@gmail.com'),
  ('rajes.jes@gmail.com')
on conflict (email) do nothing;

-- 3) Grant admin to any of these emails who ALREADY signed up.
update public.profiles p
set is_admin = true
where lower(p.email) in (select lower(email) from public.admin_emails);

-- 4) Replace the signup trigger so new admins get promoted on first login.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (
    new.id,
    new.email,
    exists (
      select 1 from public.admin_emails a
      where lower(a.email) = lower(new.email)
    )
  )
  on conflict (id) do update
    set is_admin = excluded.is_admin or public.profiles.is_admin;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Verify — should list all 3 admins and is_admin=true if they've logged in.
select a.email, p.is_admin, p.created_at
from public.admin_emails a
left join public.profiles p on lower(p.email) = lower(a.email)
order by a.email;
