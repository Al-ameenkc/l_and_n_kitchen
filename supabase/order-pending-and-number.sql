-- Pending waiter proposals + sequential order numbers (run in Supabase SQL Editor)

create sequence if not exists order_number_seq start 1;

alter table orders add column if not exists order_number int unique;
alter table orders add column if not exists pending_items jsonb not null default '[]'::jsonb;

create or replace function assign_order_number(p_order_id uuid)
returns int
language plpgsql
as $$
declare
  new_num int;
  existing int;
begin
  select order_number into existing from orders where id = p_order_id;
  if existing is not null then
    return existing;
  end if;
  select nextval('order_number_seq') into new_num;
  update orders set order_number = new_num where id = p_order_id and order_number is null;
  return new_num;
end;
$$;
