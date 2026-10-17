import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assignOrderNumberIfNeeded,
  createCustomerToken,
  isOrderClosed,
  mapDbOrder,
  normalizeOrderItems,
  orderTotal,
  syncShareFromOrder,
  type DbOrder,
  type DbWaiter,
  type OrderItem,
} from "./orders-db";
import { createServiceClient } from "./supabase/server";
import { MAX_ACTIVE_TABLES, OFFER_SECONDS } from "./waiter-limits";

const CLOSED = ["completed", "cancelled", "paid"];
const COUNTED_STATES = new Set(["accepted", "confirmed", "manual"]);

export interface RestaurantTable {
  id: string;
  table_number: number;
  qr_token: string;
  status: "free" | "taken";
  active_order_id: string | null;
}

export interface QueueWaiter {
  id: string;
  staff_id: string;
  name: string;
  image_url: string | null;
  on_duty: boolean;
  queue_position: number;
  active_tables: number;
  busy: boolean;
  place: number | null;
}

function clientOrNew(client?: SupabaseClient) {
  return client ?? createServiceClient();
}

function mapTable(row: Record<string, unknown>): RestaurantTable {
  return {
    id: String(row.id),
    table_number: Number(row.table_number),
    qr_token: String(row.qr_token),
    status: row.status === "taken" ? "taken" : "free",
    active_order_id: (row.active_order_id as string | null) ?? null,
  };
}

export async function activeTableCounts(
  client?: SupabaseClient
): Promise<Map<string, number>> {
  const supabase = clientOrNew(client);
  const { data, error } = await supabase
    .from("orders")
    .select("waiter_id, assignment_state, status")
    .not("status", "in", `(${CLOSED.join(",")})`);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const waiterId = row.waiter_id as string | null;
    const state = String(row.assignment_state ?? "manual");
    if (!waiterId || !COUNTED_STATES.has(state)) continue;
    counts.set(waiterId, (counts.get(waiterId) ?? 0) + 1);
  }
  return counts;
}

export async function listQueue(client?: SupabaseClient): Promise<QueueWaiter[]> {
  const supabase = clientOrNew(client);
  const { data, error } = await supabase
    .from("waiters")
    .select("*")
    .eq("active", true)
    .order("queue_position", { ascending: true, nullsFirst: false });
  if (error) throw error;
  const counts = await activeTableCounts(supabase);
  const waiters = (data ?? []) as DbWaiter[];
  const onDuty = waiters
    .filter((waiter) => waiter.on_duty && waiter.queue_position != null)
    .sort((a, b) => Number(a.queue_position) - Number(b.queue_position));
  const placeById = new Map(onDuty.map((waiter, index) => [waiter.id, index + 1]));
  return waiters.map((waiter) => {
    const active = counts.get(waiter.id) ?? 0;
    return {
      id: waiter.id,
      staff_id: waiter.staff_id,
      name: waiter.name,
      image_url: waiter.image_url,
      on_duty: Boolean(waiter.on_duty),
      queue_position: Number(waiter.queue_position ?? 0),
      active_tables: active,
      busy: active >= MAX_ACTIVE_TABLES,
      place: placeById.get(waiter.id) ?? null,
    };
  });
}

async function nextQueuePosition(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from("waiters")
    .select("queue_position")
    .order("queue_position", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (Number(data?.[0]?.queue_position) || 0) + 1;
}

export async function moveWaiterToBottom(waiterId: string, client?: SupabaseClient) {
  const supabase = clientOrNew(client);
  const position = await nextQueuePosition(supabase);
  const { error } = await supabase
    .from("waiters")
    .update({ queue_position: position })
    .eq("id", waiterId);
  if (error) throw error;
}

export async function clockIn(staffId: string, client?: SupabaseClient): Promise<QueueWaiter> {
  const supabase = clientOrNew(client);
  const { data, error } = await supabase
    .from("waiters")
    .select("*")
    .eq("staff_id", staffId.trim())
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  const waiter = data as DbWaiter | null;
  if (!waiter) throw new Error("Waiter ID not found. Ask admin to add this waiter first.");

  if (!waiter.on_duty) {
    const position = await nextQueuePosition(supabase);
    const { error: updateError } = await supabase
      .from("waiters")
      .update({
        on_duty: true,
        duty_started_at: new Date().toISOString(),
        queue_position: position,
      })
      .eq("id", waiter.id);
    if (updateError) throw updateError;
  }

  await tickQueue(supabase);
  const queue = await listQueue(supabase);
  const mine = queue.find((row) => row.id === waiter.id);
  if (!mine) throw new Error("Could not join the queue.");
  return mine;
}

export async function clockOut(staffId: string, client?: SupabaseClient) {
  const supabase = clientOrNew(client);
  const { data, error } = await supabase
    .from("waiters")
    .select("id")
    .eq("staff_id", staffId.trim())
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("Waiter not found.");

  const { error: updateError } = await supabase
    .from("waiters")
    .update({ on_duty: false })
    .eq("id", data.id);
  if (updateError) throw updateError;

  const { data: offered } = await supabase
    .from("orders")
    .select("id")
    .eq("assignment_state", "offered")
    .eq("offered_waiter_id", data.id);
  for (const order of offered ?? []) {
    await passOffer(String(order.id), String(data.id), supabase);
  }
  await tickQueue(supabase);
}

async function seekingOrders(supabase: SupabaseClient): Promise<DbOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("assignment_state", "seeking")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const now = Date.now();
  return (data ?? [])
    .map((row) => mapDbOrder(row as Record<string, unknown>))
    .filter((order) => !order.offer_expires_at || new Date(order.offer_expires_at).getTime() <= now);
}

async function offerOrder(
  supabase: SupabaseClient,
  order: DbOrder,
  reserved: Map<string, number>
) {
  const queue = await listQueue(supabase);
  const skipped = new Set(order.skipped_waiter_ids);
  const next = queue
    .filter((waiter) => waiter.on_duty && waiter.place != null)
    .sort((a, b) => (a.place ?? 0) - (b.place ?? 0))
    .find((waiter) => !skipped.has(waiter.id) && waiter.active_tables + (reserved.get(waiter.id) ?? 0) < MAX_ACTIVE_TABLES);

  if (!next) {
    if (order.skipped_waiter_ids.length) {
      await supabase
        .from("orders")
        .update({
          skipped_waiter_ids: [],
          offer_expires_at: new Date(Date.now() + OFFER_SECONDS * 1000).toISOString(),
        })
        .eq("id", order.id)
        .eq("assignment_state", "seeking");
    }
    return;
  }

  const expires = new Date(Date.now() + OFFER_SECONDS * 1000).toISOString();
  await supabase
    .from("orders")
    .update({
      assignment_state: "offered",
      offered_waiter_id: next.id,
      offer_expires_at: expires,
      waiter_id: null,
      waiter_staff_id: next.staff_id,
      waiter_name: next.name,
      waiter_image_url: next.image_url,
    })
    .eq("id", order.id)
    .eq("assignment_state", "seeking");
  reserved.set(next.id, (reserved.get(next.id) ?? 0) + 1);
}

export async function tickQueue(client?: SupabaseClient) {
  const supabase = clientOrNew(client);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("orders")
    .select("id, offered_waiter_id, skipped_waiter_ids")
    .eq("assignment_state", "offered")
    .lt("offer_expires_at", now);
  if (error) throw error;

  for (const row of data ?? []) {
    const skipped = Array.isArray(row.skipped_waiter_ids)
      ? row.skipped_waiter_ids.map(String)
      : [];
    const offeredId = row.offered_waiter_id ? String(row.offered_waiter_id) : "";
    if (offeredId && !skipped.includes(offeredId)) skipped.push(offeredId);
    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({
        assignment_state: "seeking",
        offered_waiter_id: null,
        offer_expires_at: null,
        skipped_waiter_ids: skipped,
        waiter_id: null,
        waiter_staff_id: "",
        waiter_name: "",
        waiter_image_url: null,
      })
      .eq("id", row.id)
      .eq("assignment_state", "offered")
      .lt("offer_expires_at", now)
      .select("id");
    if (updateError) throw updateError;
    if (updated?.length && offeredId) {
      await moveWaiterToBottom(offeredId, supabase);
    }
  }

  const waiting = await seekingOrders(supabase);
  const reserved = new Map<string, number>();
  for (const order of waiting) {
    await offerOrder(supabase, order, reserved);
  }
}

export async function passOffer(orderId: string, waiterId: string, client?: SupabaseClient) {
  const supabase = clientOrNew(client);
  const order = await loadOrder(orderId, supabase);
  if (!order || order.assignment_state !== "offered" || order.offered_waiter_id !== waiterId) {
    return;
  }
  const skipped = order.skipped_waiter_ids.includes(waiterId)
    ? order.skipped_waiter_ids
    : [...order.skipped_waiter_ids, waiterId];
  const { error } = await supabase
    .from("orders")
    .update({
      assignment_state: "seeking",
      offered_waiter_id: null,
      offer_expires_at: null,
      skipped_waiter_ids: skipped,
      waiter_id: null,
      waiter_staff_id: "",
      waiter_name: "",
      waiter_image_url: null,
    })
    .eq("id", orderId)
    .eq("assignment_state", "offered")
    .eq("offered_waiter_id", waiterId);
  if (error) throw error;
  await moveWaiterToBottom(waiterId, supabase);
  await tickQueue(supabase);
}

export async function acceptOffer(orderId: string, waiterId: string, client?: SupabaseClient) {
  const supabase = clientOrNew(client);
  await tickQueue(supabase);
  const order = await loadOrder(orderId, supabase);
  if (!order) throw new Error("Order not found.");
  if (order.assignment_state !== "offered" || order.offered_waiter_id !== waiterId) {
    throw new Error("This order is no longer waiting for you.");
  }
  if (order.offer_expires_at && new Date(order.offer_expires_at).getTime() <= Date.now()) {
    throw new Error("Time is up. The order moved to the next waiter.");
  }
  const counts = await activeTableCounts(supabase);
  if ((counts.get(waiterId) ?? 0) >= MAX_ACTIVE_TABLES) {
    throw new Error("You already have 5 tables. Finish one before taking another.");
  }

  const { data: waiter, error: waiterError } = await supabase
    .from("waiters")
    .select("*")
    .eq("id", waiterId)
    .single();
  if (waiterError) throw waiterError;
  const profile = waiter as DbWaiter;

  const { data, error } = await supabase
    .from("orders")
    .update({
      assignment_state: "accepted",
      status: "accepted",
      waiter_id: profile.id,
      waiter_staff_id: profile.staff_id,
      waiter_name: profile.name,
      waiter_image_url: profile.image_url,
      offered_waiter_id: null,
      offer_expires_at: null,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("assignment_state", "offered")
    .eq("offered_waiter_id", waiterId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("This order is no longer waiting for you.");

  await moveWaiterToBottom(waiterId, supabase);
  let saved = mapDbOrder(data as Record<string, unknown>);
  try {
    saved = await assignOrderNumberIfNeeded(orderId, supabase);
  } catch (err) {
    console.error("assignOrderNumberIfNeeded:", err);
  }
  try {
    await syncShareFromOrder(saved);
  } catch (err) {
    console.error("syncShareFromOrder:", err);
  }
  await tickQueue(supabase);
  return saved;
}

async function loadOrder(id: string, supabase: SupabaseClient): Promise<DbOrder | null> {
  const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapDbOrder(data as Record<string, unknown>);
}

export async function findTableByToken(token: string, client?: SupabaseClient) {
  const supabase = clientOrNew(client);
  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("*")
    .eq("qr_token", token.trim())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapTable(data as Record<string, unknown>);
}

export async function confirmTableScan(staffId: string, qrToken: string, client?: SupabaseClient) {
  const supabase = clientOrNew(client);
  const table = await findTableByToken(qrToken, supabase);
  if (!table) throw new Error("That QR code is not a table at this restaurant.");

  const { data: waiter, error: waiterError } = await supabase
    .from("waiters")
    .select("id, name")
    .eq("staff_id", staffId.trim())
    .eq("active", true)
    .maybeSingle();
  if (waiterError) throw waiterError;
  if (!waiter) throw new Error("Waiter not found.");

  const { data: rows, error } = await supabase
    .from("orders")
    .select("*")
    .eq("waiter_id", waiter.id)
    .eq("table_id", table.id)
    .in("assignment_state", ["accepted", "confirmed"])
    .not("status", "in", `(${CLOSED.join(",")})`)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  const order = rows?.[0] ? mapDbOrder(rows[0] as Record<string, unknown>) : null;
  if (!order) {
    throw new Error(`No order is waiting for you at table ${table.table_number}.`);
  }
  if (order.assignment_state === "confirmed") {
    return { order, table, already: true };
  }

  const confirmedAt = new Date().toISOString();
  const { error: orderError } = await supabase
    .from("orders")
    .update({
      assignment_state: "confirmed",
      table_confirmed_at: confirmedAt,
    })
    .eq("id", order.id)
    .eq("assignment_state", "accepted");
  if (orderError) throw orderError;

  const { error: tableError } = await supabase
    .from("restaurant_tables")
    .update({ status: "taken", active_order_id: order.id })
    .eq("id", table.id);
  if (tableError) throw tableError;

  return {
    order: { ...order, assignment_state: "confirmed" as const, table_confirmed_at: confirmedAt },
    table: { ...table, status: "taken" as const, active_order_id: order.id },
    already: false,
  };
}

export async function releaseTableForOrder(orderId: string, client?: SupabaseClient) {
  const supabase = clientOrNew(client);
  const order = await loadOrder(orderId, supabase);
  if (!order?.table_id || !isOrderClosed(order.status)) return;
  await supabase
    .from("restaurant_tables")
    .update({ status: "free", active_order_id: null })
    .eq("id", order.table_id)
    .eq("active_order_id", orderId);
  await tickQueue(supabase);
}

export async function placeTableOrder(
  input: { tableToken: string; items: OrderItem[]; shareId?: string },
  client?: SupabaseClient
) {
  const supabase = clientOrNew(client);
  const items = normalizeOrderItems(input.items);
  if (!items.length) throw new Error("Order has no dishes.");
  const table = await findTableByToken(input.tableToken, supabase);
  if (!table) throw new Error("Scan the QR code on your table before ordering.");

  const { data: openRows, error: openError } = await supabase
    .from("orders")
    .select("id")
    .eq("table_id", table.id)
    .in("assignment_state", ["seeking", "offered", "accepted", "confirmed"])
    .not("status", "in", `(${CLOSED.join(",")})`)
    .limit(1);
  if (openError) throw openError;
  if (openRows?.length) {
    throw new Error(`Table ${table.table_number} already has an open order.`);
  }

  const shareId =
    input.shareId?.replace(/[^a-zA-Z0-9]/g, "") ||
    crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const customerToken = createCustomerToken();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      table_label: `Table ${table.table_number}`,
      table_id: table.id,
      waiter_id: null,
      waiter_staff_id: "",
      waiter_name: "",
      waiter_image_url: null,
      items,
      locked_items: items.map((item) => ({ id: item.id, qty: item.qty })),
      total: orderTotal(items),
      currency: "NGN",
      status: "new",
      dish_ids: items.map((item) => item.id),
      share_id: shareId,
      customer_token: customerToken,
      assignment_state: "seeking",
      skipped_waiter_ids: [],
      assigned_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;

  await tickQueue(supabase);
  const order = (await loadOrder(String(data.id), supabase)) ?? mapDbOrder(data as Record<string, unknown>);
  try {
    await syncShareFromOrder(order);
  } catch (err) {
    console.error("syncShareFromOrder:", err);
  }
  return { order, customerToken, table };
}

export async function ensureTables(from: number, to: number, client?: SupabaseClient) {
  const supabase = clientOrNew(client);
  const start = Math.max(1, Math.floor(from));
  const end = Math.max(start, Math.floor(to));
  if (end - start > 200) throw new Error("Create at most 200 tables at a time.");
  const { data: existing, error } = await supabase.from("restaurant_tables").select("table_number");
  if (error) throw error;
  const have = new Set((existing ?? []).map((row) => Number(row.table_number)));
  const rows = [];
  for (let number = start; number <= end; number += 1) {
    if (have.has(number)) continue;
    rows.push({
      table_number: number,
      qr_token: crypto.randomUUID().replace(/-/g, ""),
      status: "free",
    });
  }
  if (rows.length) {
    const { error: insertError } = await supabase.from("restaurant_tables").insert(rows);
    if (insertError) throw insertError;
  }
  return listTables(supabase);
}

export async function listTables(client?: SupabaseClient) {
  const supabase = clientOrNew(client);
  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("*")
    .order("table_number", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapTable(row as Record<string, unknown>));
}

export async function waiterSession(staffId: string, client?: SupabaseClient) {
  const supabase = clientOrNew(client);
  await tickQueue(supabase);
  const queue = await listQueue(supabase);
  const me = queue.find((waiter) => waiter.staff_id.toLowerCase() === staffId.trim().toLowerCase());
  if (!me) throw new Error("Waiter not found.");

  const { data: waiterRow } = await supabase
    .from("waiters")
    .select("id")
    .eq("staff_id", me.staff_id)
    .maybeSingle();
  const waiterId = String(waiterRow?.id ?? me.id);

  const { data: offerRows } = await supabase
    .from("orders")
    .select("*")
    .eq("assignment_state", "offered")
    .eq("offered_waiter_id", waiterId)
    .limit(1);
  const offer = offerRows?.[0] ? mapDbOrder(offerRows[0] as Record<string, unknown>) : null;
  const secondsLeft = offer?.offer_expires_at
    ? Math.max(0, Math.ceil((new Date(offer.offer_expires_at).getTime() - Date.now()) / 1000))
    : 0;

  const { data: mine } = await supabase
    .from("orders")
    .select("*")
    .eq("waiter_id", waiterId)
    .in("assignment_state", ["accepted", "confirmed"])
    .not("status", "in", `(${CLOSED.join(",")})`)
    .order("assigned_at", { ascending: false });

  return {
    waiter: me,
    offer: offer
      ? {
          id: offer.id,
          table_label: offer.table_label,
          seconds_left: secondsLeft,
          items: offer.items,
          total: offer.total,
        }
      : null,
    tables: (mine ?? []).map((row) => {
      const order = mapDbOrder(row as Record<string, unknown>);
      return {
        id: order.id,
        table_label: order.table_label,
        assignment_state: order.assignment_state,
        total: order.total,
        items: order.items,
      };
    }),
  };
}
