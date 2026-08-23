import { NextResponse } from "next/server";
import {
  assertCustomerItemsAllowed,
  getOrderById,
  isMissingOrdersSchemaError,
  normalizeOrderItems,
  publicOrderPayload,
  syncShareFromOrder,
  updateOrderItems,
  type OrderItem,
} from "@/lib/orders-db";
import { createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

function readToken(request: Request, bodyToken?: string): string {
  const header = request.headers.get("x-order-token")?.trim() ?? "";
  if (header) return header;
  const url = new URL(request.url);
  const query = url.searchParams.get("token")?.trim() ?? "";
  if (query) return query;
  return bodyToken?.trim() ?? "";
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const token = readToken(request);
    if (!token) {
      return NextResponse.json({ error: "Order token required." }, { status: 401 });
    }

    const order = await getOrderById(id);
    if (!order || !order.customer_token || order.customer_token !== token) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json(publicOrderPayload(order));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load order";
    if (isMissingOrdersSchemaError(message)) {
      return NextResponse.json(
        { error: "Run supabase/order-live-sync.sql in Supabase.", schemaMissing: true },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      token?: string;
      action?: "add" | "set_qty" | "remove" | "replace";
      item?: OrderItem;
      id?: string;
      qty?: number;
      items?: OrderItem[];
    };

    const token = readToken(request, body.token);
    if (!token) {
      return NextResponse.json({ error: "Order token required." }, { status: 401 });
    }

    const supabase = createServiceClient();
    const order = await getOrderById(id, supabase);
    if (!order || !order.customer_token || order.customer_token !== token) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.status === "completed" || order.status === "cancelled") {
      return NextResponse.json(
        { error: "This order is closed and can no longer be changed." },
        { status: 400 }
      );
    }

    let nextItems = [...order.items];
    const action = body.action ?? "replace";

    if (action === "add" && body.item) {
      const item = normalizeOrderItems([body.item])[0];
      if (!item) {
        return NextResponse.json({ error: "Invalid dish." }, { status: 400 });
      }
      const existing = nextItems.find((row) => row.id === item.id);
      if (existing) {
        existing.qty = Math.min(99, existing.qty + item.qty);
      } else {
        nextItems.push(item);
      }
    } else if (action === "set_qty" && body.id) {
      const qty = Math.max(1, Math.min(99, Math.round(Number(body.qty) || 1)));
      nextItems = nextItems.map((row) =>
        row.id === body.id ? { ...row, qty } : row
      );
    } else if (action === "remove" && body.id) {
      nextItems = nextItems.filter((row) => row.id !== body.id);
    } else if (action === "replace" && Array.isArray(body.items)) {
      nextItems = normalizeOrderItems(body.items);
    } else {
      return NextResponse.json({ error: "Invalid update." }, { status: 400 });
    }

    const lockError = assertCustomerItemsAllowed(order.locked_items, nextItems);
    if (lockError) {
      return NextResponse.json({ error: lockError }, { status: 403 });
    }

    const updated = await updateOrderItems(id, nextItems, supabase);
    try {
      await syncShareFromOrder(updated);
    } catch (shareErr) {
      console.error("syncShareFromOrder:", shareErr);
    }

    return NextResponse.json(publicOrderPayload(updated));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update order";
    if (isMissingOrdersSchemaError(message)) {
      return NextResponse.json(
        { error: "Run supabase/order-live-sync.sql in Supabase.", schemaMissing: true },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
