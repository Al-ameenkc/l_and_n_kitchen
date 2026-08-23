-- Live order sync: link QR shares to orders, lock original items, enable Realtime
-- Run in Supabase SQL Editor after orders-waiters.sql and dish-availability.sql

alter table orders
  add column if not exists share_id text;

alter table orders
  add column if not exists customer_token text;

alter table orders
  add column if not exists locked_items jsonb not null default '[]'::jsonb;

create index if not exists orders_share_id_idx on orders (share_id);
create index if not exists orders_customer_token_idx on orders (customer_token);

-- Realtime for menu changes (availability, new dishes, categories)
do $$
begin
  begin
    alter publication supabase_realtime add table dishes;
  exception
    when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table categories;
  exception
    when duplicate_object then null;
  end;
end $$;
