import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "./supabase/server";

export type OrderStatus = "new" | "accepted" | "completed" | "cancelled";

export interface DbWaiter {
  id: string;
  staff_id: string;
  name: string;
  image_url: string | null;
  active: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
}

export interface DbOrder {
  id: string;
  table_label: string;
  waiter_id: string | null;
  waiter_staff_id: string;
  waiter_name: string;
  waiter_image_url: string | null;
  items: OrderItem[];
  total: number;
  currency: string;
  status: OrderStatus;
  dish_ids: string[];
  assigned_at: string;
  created_at: string;
}

export async function listWaitersAdmin(): Promise<DbWaiter[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("waiters")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbWaiter[];
}

export async function findWaiterByStaffId(
  staffId: string,
  client?: SupabaseClient
): Promise<DbWaiter | null> {
  const supabase = client ?? createServiceClient();
  const { data, error } = await supabase
    .from("waiters")
    .select("*")
    .eq("staff_id", staffId.trim())
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as DbWaiter | null) ?? null;
}

export async function listOrdersAdmin(): Promise<DbOrder[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("assigned_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as DbOrder[]).map((row) => ({
    ...row,
    total: Number(row.total),
    items: (Array.isArray(row.items) ? row.items : []).map((item) => ({
      ...item,
      price: Number(item.price) || 0,
      qty: Math.max(1, Number(item.qty) || 1),
    })),
  }));
}

export function isMissingOrdersSchemaError(message: string | undefined): boolean {
  if (!message) return false;
  return /could not find the table|schema cache|relation .* does not exist/i.test(message);
}
