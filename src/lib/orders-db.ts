import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "./supabase/server";
import { ensureOrderSharesBucket, ORDER_SHARES_BUCKET } from "./storage";

export type OrderStatus = "new" | "accepted" | "completed" | "cancelled" | "paid";

export function isOrderClosed(status: OrderStatus | string | null | undefined): boolean {
  return status === "completed" || status === "paid" || status === "cancelled";
}

export function isOrderPaid(status: OrderStatus | string | null | undefined): boolean {
  return status === "paid" || status === "completed";
}

export type AssignmentState = "manual" | "seeking" | "offered" | "accepted" | "confirmed";

export interface DbWaiter {
  id: string;
  staff_id: string;
  name: string;
  image_url: string | null;
  active: boolean;
  on_duty?: boolean;
  duty_started_at?: string | null;
  queue_position?: number | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
}

export interface LockedOrderItem {
  id: string;
  qty: number;
}

export interface PendingOrderItem extends OrderItem {
  proposal_id: string;
  proposed_by: "waiter";
  proposed_at: string;
  waiter_name?: string;
}

export interface DbOrder {
  id: string;
  table_label: string;
  waiter_id: string | null;
  waiter_staff_id: string;
  waiter_name: string;
  waiter_image_url: string | null;
  items: OrderItem[];
  locked_items: LockedOrderItem[];
  pending_items: PendingOrderItem[];
  order_number: number | null;
  total: number;
  currency: string;
  status: OrderStatus;
  dish_ids: string[];
  share_id: string | null;
  customer_token: string | null;
  assigned_at: string;
  created_at: string;
  table_id: string | null;
  assignment_state: AssignmentState;
  offered_waiter_id: string | null;
  offer_expires_at: string | null;
  skipped_waiter_ids: string[];
  table_confirmed_at: string | null;
}

export function normalizeOrderItems(raw: unknown): OrderItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Partial<OrderItem>;
      const id = String(row.id ?? "").trim();
      if (!id) return null;
      return {
        id,
        name: String(row.name ?? id),
        category: String(row.category ?? ""),
        price: Number(row.price) || 0,
        qty: Math.max(1, Math.min(99, Math.round(Number(row.qty) || 1))),
      };
    })
    .filter((item): item is OrderItem => Boolean(item));
}

export function normalizeLockedItems(raw: unknown): LockedOrderItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Partial<LockedOrderItem>;
      const id = String(row.id ?? "").trim();
      if (!id) return null;
      return {
        id,
        qty: Math.max(1, Math.min(99, Math.round(Number(row.qty) || 1))),
      };
    })
    .filter((item): item is LockedOrderItem => Boolean(item));
}

export function normalizePendingItems(raw: unknown): PendingOrderItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Partial<PendingOrderItem>;
      const id = String(row.id ?? "").trim();
      const proposal_id = String(row.proposal_id ?? "").trim();
      if (!id || !proposal_id) return null;
      return {
        id,
        proposal_id,
        name: String(row.name ?? id),
        category: String(row.category ?? ""),
        price: Number(row.price) || 0,
        qty: Math.max(1, Math.min(99, Math.round(Number(row.qty) || 1))),
        proposed_by: "waiter" as const,
        proposed_at: String(row.proposed_at ?? new Date().toISOString()),
        ...(row.waiter_name ? { waiter_name: String(row.waiter_name) } : {}),
      } satisfies PendingOrderItem;
    })
    .filter((item): item is PendingOrderItem => Boolean(item));
}

export function orderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function mapDbOrder(row: Record<string, unknown>): DbOrder {
  const items = normalizeOrderItems(row.items);
  const locked = normalizeLockedItems(row.locked_items);
  return {
    id: String(row.id),
    table_label: String(row.table_label ?? ""),
    waiter_id: (row.waiter_id as string | null) ?? null,
    waiter_staff_id: String(row.waiter_staff_id ?? ""),
    waiter_name: String(row.waiter_name ?? ""),
    waiter_image_url: (row.waiter_image_url as string | null) ?? null,
    items,
    locked_items: locked.length
      ? locked
      : items.map((item) => ({ id: item.id, qty: item.qty })),
    pending_items: normalizePendingItems(row.pending_items),
    order_number:
      row.order_number === null || row.order_number === undefined
        ? null
        : Number(row.order_number) || null,
    total: Number(row.total) || orderTotal(items),
    currency: String(row.currency ?? "NGN"),
    status: (row.status as OrderStatus) || "new",
    dish_ids: Array.isArray(row.dish_ids) ? row.dish_ids.map(String) : items.map((i) => i.id),
    share_id: (row.share_id as string | null) ?? null,
    customer_token: (row.customer_token as string | null) ?? null,
    assigned_at: String(row.assigned_at ?? row.created_at ?? ""),
    created_at: String(row.created_at ?? ""),
    table_id: (row.table_id as string | null) ?? null,
    assignment_state: (row.assignment_state as AssignmentState) || "manual",
    offered_waiter_id: (row.offered_waiter_id as string | null) ?? null,
    offer_expires_at: (row.offer_expires_at as string | null) ?? null,
    skipped_waiter_ids: Array.isArray(row.skipped_waiter_ids)
      ? row.skipped_waiter_ids.map(String)
      : [],
    table_confirmed_at: (row.table_confirmed_at as string | null) ?? null,
  };
}

export function createCustomerToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/** Ensure customer updates never drop or undercut locked original items. */
export function assertCustomerItemsAllowed(
  locked: LockedOrderItem[],
  nextItems: OrderItem[]
): string | null {
  const nextById = new Map(nextItems.map((item) => [item.id, item]));
  for (const lockedItem of locked) {
    const next = nextById.get(lockedItem.id);
    if (!next) {
      return "Ask your waiter - only staff can remove dishes from a submitted order.";
    }
    if (next.qty < lockedItem.qty) {
      return `Quantity for ${next.name} cannot go below ${lockedItem.qty} after submitting. Ask your waiter to change it.`;
    }
  }
  return null;
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
  return (data ?? []).map((row) => mapDbOrder(row as Record<string, unknown>));
}

export async function getOrderById(
  id: string,
  client?: SupabaseClient
): Promise<DbOrder | null> {
  const supabase = client ?? createServiceClient();
  const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapDbOrder(data as Record<string, unknown>);
}

export async function getOrderByShareId(
  shareId: string,
  client?: SupabaseClient
): Promise<DbOrder | null> {
  const supabase = client ?? createServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("share_id", shareId)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapDbOrder(data as Record<string, unknown>);
}

export async function updateOrderItems(
  id: string,
  items: OrderItem[],
  client?: SupabaseClient,
  pendingItems?: PendingOrderItem[]
): Promise<DbOrder> {
  const supabase = client ?? createServiceClient();
  const total = orderTotal(items);
  const updates: Record<string, unknown> = {
    items,
    total,
    dish_ids: items.map((item) => item.id),
  };
  if (pendingItems !== undefined) {
    updates.pending_items = pendingItems;
  }
  const { data, error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapDbOrder(data as Record<string, unknown>);
}

export async function assignOrderNumberIfNeeded(
  id: string,
  client?: SupabaseClient
): Promise<DbOrder> {
  const supabase = client ?? createServiceClient();
  const { error: rpcError } = await supabase.rpc("assign_order_number", { p_order_id: id });
  if (rpcError && !isMissingOrdersSchemaError(rpcError.message)) {
    throw rpcError;
  }
  const order = await getOrderById(id, supabase);
  if (!order) throw new Error("Order not found.");
  return order;
}

export function mergeItemIntoList(items: OrderItem[], item: OrderItem): OrderItem[] {
  const next = [...items];
  const existing = next.find((row) => row.id === item.id);
  if (existing) {
    existing.qty = Math.min(99, existing.qty + item.qty);
    return next;
  }
  next.push(item);
  return next;
}

export async function proposeWaiterItem(
  orderId: string,
  item: OrderItem,
  waiterName: string,
  client?: SupabaseClient
): Promise<DbOrder> {
  const supabase = client ?? createServiceClient();
  const order = await getOrderById(orderId, supabase);
  if (!order) throw new Error("Order not found.");
  if (isOrderClosed(order.status)) throw new Error("This order is closed.");

  const proposal: PendingOrderItem = {
    ...item,
    proposal_id: `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    proposed_by: "waiter",
    proposed_at: new Date().toISOString(),
    waiter_name: waiterName,
  };

  const pending_items = [...order.pending_items, proposal];
  const { data, error } = await supabase
    .from("orders")
    .update({ pending_items })
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw error;
  return mapDbOrder(data as Record<string, unknown>);
}

export async function resolvePendingItem(
  orderId: string,
  proposalId: string,
  action: "accept" | "reject",
  client?: SupabaseClient
): Promise<DbOrder> {
  const supabase = client ?? createServiceClient();
  const order = await getOrderById(orderId, supabase);
  if (!order) throw new Error("Order not found.");

  const pending = order.pending_items.find((row) => row.proposal_id === proposalId);
  if (!pending) throw new Error("Pending item not found.");

  const pending_items = order.pending_items.filter((row) => row.proposal_id !== proposalId);
  let items = order.items;
  if (action === "accept") {
    items = mergeItemIntoList(items, {
      id: pending.id,
      name: pending.name,
      category: pending.category,
      price: pending.price,
      qty: pending.qty,
    });
  }

  return updateOrderItems(orderId, items, supabase, pending_items);
}

export async function writeOrderSharePayload(
  shareId: string,
  payload: Record<string, unknown>,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? createServiceClient();
  await ensureOrderSharesBucket(supabase);
  const body = JSON.stringify({
    ...payload,
    updated_at: new Date().toISOString(),
  });
  const { error } = await supabase.storage
    .from(ORDER_SHARES_BUCKET)
    .upload(`${shareId}.json`, Buffer.from(body, "utf8"), {
      contentType: "application/json",
      upsert: true,
    });
  if (error) throw error;
}

export async function syncShareFromOrder(order: DbOrder): Promise<void> {
  if (!order.share_id) return;
  await writeOrderSharePayload(order.share_id, {
    items: order.items.map((item) => ({ id: item.id, qty: item.qty })),
    order_id: order.id,
    customer_token: order.customer_token,
    locked_items: order.locked_items,
    pending_items: order.pending_items,
    status: order.status,
    table_label: order.table_label,
    total: order.total,
    order_number: order.order_number,
  });
}

export function publicOrderPayload(order: DbOrder) {
  return {
    id: order.id,
    table_label: order.table_label,
    items: order.items,
    locked_items: order.locked_items,
    pending_items: order.pending_items,
    total: order.total,
    currency: order.currency,
    status: order.status,
    share_id: order.share_id,
    assigned_at: order.assigned_at,
    order_number: order.order_number,
    assignment_state: order.assignment_state,
    waiter_name: order.waiter_name,
    offer_expires_at: order.offer_expires_at,
  };
}

export function isMissingOrdersSchemaError(message: string | undefined): boolean {
  if (!message) return false;
  return /could not find the table|schema cache|relation .* does not exist|column .* does not exist/i.test(
    message
  );
}
