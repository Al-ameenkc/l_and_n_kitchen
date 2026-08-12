-- Waiters + guest orders (run in Supabase SQL Editor after schema.sql)

create table if not exists waiters (
  id uuid primary key default gen_random_uuid(),
  staff_id text not null unique,
  name text not null,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists waiters_staff_id_idx on waiters (staff_id);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  table_label text not null,
  waiter_id uuid references waiters (id) on delete set null,
  waiter_staff_id text not null,
  waiter_name text not null,
  waiter_image_url text,
  items jsonb not null default '[]'::jsonb,
  total numeric(12, 2) not null check (total >= 0),
  currency text not null default 'NGN',
  status text not null default 'new'
    check (status in ('new', 'accepted', 'completed', 'cancelled')),
  dish_ids text[] not null default '{}',
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists orders_assigned_at_idx on orders (assigned_at desc);
create index if not exists orders_status_idx on orders (status);

alter table waiters enable row level security;
alter table orders enable row level security;

-- Public can look up active waiters by staff_id (via API using service role preferably)
-- No broad public policies on waiters/orders — access through Next.js API routes with service role.

drop policy if exists "Public read waiters" on waiters;
drop policy if exists "Public insert orders" on orders;

-- Optional: allow anon read of active waiters (name + image only exposed via API)
create policy "Public read active waiters"
  on waiters for select
  to anon, authenticated
  using (active = true);

-- Orders: no public select; inserts go through service-role API
