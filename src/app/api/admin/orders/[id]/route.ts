import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  assignOrderNumberIfNeeded,
  getOrderById,
  isMissingOrdersSchemaError,
  isOrderClosed,
  mapDbOrder,
  normalizeOrderItems,
  orderTotal,
  resolvePendingItem,
  syncShareFromOrder,
  type OrderStatus,
} from "@/lib/orders-db";
import { releaseTableForOrder } from "@/lib/waiter-queue";
import { createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const STATUSES: OrderStatus[] = ["new", "accepted", "completed", "cancelled", "paid"];

export async function PUT(request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      status?: string;
      items?: unknown;
      pending_action?: "accept" | "reject";
      proposal_id?: string;
    };

    const supabase = createServiceClient();

    if (body.pending_action && body.proposal_id) {
      const resolved = await resolvePendingItem(
        id,
        body.proposal_id,
        body.pending_action,
        supabase
      );
      try {
        await syncShareFromOrder(resolved);
      } catch (shareErr) {
        console.error("syncShareFromOrder:", shareErr);
      }
      return NextResponse.json(resolved);
    }

    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) {
      const status = body.status as OrderStatus;
      if (!STATUSES.includes(status)) {
        return NextResponse.json({ error: "Invalid status." }, { status: 400 });
      }
      updates.status = status;
    }

    if (body.items !== undefined) {
      const items = normalizeOrderItems(body.items);
      if (!items.length) {
        return NextResponse.json(
          { error: "Order must keep at least one dish." },
          { status: 400 }
        );
      }
      updates.items = items;
      updates.total = orderTotal(items);
      updates.dish_ids = items.map((item) => item.id);
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const existing = await getOrderById(id, supabase);
    if (!existing) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (body.items !== undefined && isOrderClosed(existing.status)) {
      return NextResponse.json(
        { error: "Paid or closed orders cannot be edited." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (isMissingOrdersSchemaError(error.message)) {
        return NextResponse.json(
          {
            error: "Run supabase/order-live-sync.sql in the Supabase SQL Editor.",
            schemaMissing: true,
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    let order = mapDbOrder(data as Record<string, unknown>);

    if (body.status === "accepted" && !order.order_number) {
      try {
        order = await assignOrderNumberIfNeeded(id, supabase);
      } catch (numErr) {
        console.error("assignOrderNumberIfNeeded:", numErr);
      }
    }

    try {
      await syncShareFromOrder(order);
    } catch (shareErr) {
      console.error("syncShareFromOrder:", shareErr);
    }

    if (body.status && ["completed", "cancelled", "paid"].includes(body.status)) {
      try {
        await releaseTableForOrder(order.id);
      } catch (releaseErr) {
        console.error("releaseTableForOrder:", releaseErr);
      }
    }

    return NextResponse.json(order);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
