-- Waiter queue, restaurant tables, and automatic order assignment.
-- Run in the Supabase SQL Editor after orders-waiters.sql.

alter table waiters
  add column if not exists on_duty boolean not null default false;

alter table waiters
  add column if not exists duty_started_at timestamptz;

alter table waiters
  add column if not exists queue_position bigint;

create index if not exists waiters_queue_position_idx on waiters (queue_position);

create table if not exists restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  table_number integer not null unique check (table_number > 0),
  qr_token text not null unique,
  status text not null default 'free' check (status in ('free', 'taken')),
  active_order_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists restaurant_tables_qr_token_idx on restaurant_tables (qr_token);

alter table orders
  add column if not exists table_id uuid references restaurant_tables (id) on delete set null;

alter table orders
  add column if not exists assignment_state text not null default 'manual';

alter table orders
  add column if not exists offered_waiter_id uuid references waiters (id) on delete set null;

alter table orders
  add column if not exists offer_expires_at timestamptz;

alter table orders
  add column if not exists skipped_waiter_ids uuid[] not null default '{}';

alter table orders
  add column if not exists table_confirmed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_assignment_state_check'
  ) then
    alter table orders
      add constraint orders_assignment_state_check
      check (assignment_state in ('manual', 'seeking', 'offered', 'accepted', 'confirmed'));
  end if;
end $$;

create index if not exists orders_assignment_state_idx on orders (assignment_state);
create index if not exists orders_table_id_idx on orders (table_id);

alter table restaurant_tables enable row level security;
