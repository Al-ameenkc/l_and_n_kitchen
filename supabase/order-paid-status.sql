-- Allow "paid" order status (run in Supabase SQL Editor)
-- Marks payment complete so the guest app can reset to a fresh session

alter table orders drop constraint if exists orders_status_check;
alter table orders
  add constraint orders_status_check
  check (status in ('new', 'accepted', 'completed', 'cancelled', 'paid'));
