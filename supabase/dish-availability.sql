-- Dish availability for customer menu
-- Run in Supabase SQL Editor (or after schema.sql on fresh installs)

alter table dishes
  add column if not exists available boolean not null default true;

create index if not exists dishes_available_idx on dishes (available);

-- Public menu only sees available dishes; admin uses service role (bypasses RLS)
drop policy if exists "Public read dishes" on dishes;
create policy "Public read dishes"
  on dishes for select
  to anon, authenticated
  using (available = true);
