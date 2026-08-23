import { NextResponse } from "next/server";
import {
  createCustomerToken,
  findWaiterByStaffId,
  isMissingOrdersSchemaError,
  mapDbOrder,
  normalizeOrderItems,
  orderTotal,
  publicOrderPayload,
  syncShareFromOrder,
  type OrderItem,
} from "@/lib/orders-db";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      table_label?: string;
      waiter_staff_id?: string;
      waiter_name?: string;
      share_id?: string;
      items?: OrderItem[];
      dish_ids?: string[];
    };

    const tableLabel = body.table_label?.trim() ?? "";
    const staffId = body.waiter_staff_id?.trim() ?? "";
    const waiterNameInput = body.waiter_name?.trim() ?? "";
    const shareId = body.share_id?.trim().replace(/[^a-zA-Z0-9]/g, "") ?? "";
    const items = normalizeOrderItems(body.items);

    if (!tableLabel) {
      return NextResponse.json({ error: "Table / lounge is required." }, { status: 400 });
    }
    if (!staffId) {
      return NextResponse.json({ error: "Waiter ID is required." }, { status: 400 });
    }
    if (!items.length) {
      return NextResponse.json({ error: "Order has no dishes." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const waiter = await findWaiterByStaffId(staffId, supabase);
    if (!waiter) {
      return NextResponse.json(
        { error: "Waiter ID not found. Ask admin to add this waiter first." },
        { status: 404 }
      );
    }

    const waiterName = waiterNameInput || waiter.name;
    const total = orderTotal(items);
    const dishIds = Array.isArray(body.dish_ids)
      ? body.dish_ids.map(String)
      : items.map((item) => item.id);
    const lockedItems = items.map((item) => ({ id: item.id, qty: item.qty }));
    const customerToken = createCustomerToken();

    const { data, error } = await supabase
      .from("orders")
      .insert({
        table_label: tableLabel,
        waiter_id: waiter.id,
        waiter_staff_id: waiter.staff_id,
        waiter_name: waiterName,
        waiter_image_url: waiter.image_url,
        items,
        locked_items: lockedItems,
        total,
        currency: "NGN",
        status: "new",
        dish_ids: dishIds,
        share_id: shareId || null,
        customer_token: customerToken,
        assigned_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      if (isMissingOrdersSchemaError(error.message)) {
        return NextResponse.json(
          {
            error:
              "Orders tables need an update. Run supabase/order-live-sync.sql in the Supabase SQL Editor.",
            schemaMissing: true,
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const order = mapDbOrder(data as Record<string, unknown>);
    try {
      await syncShareFromOrder(order);
    } catch (shareErr) {
      console.error("syncShareFromOrder:", shareErr);
    }

    return NextResponse.json(
      {
        ...publicOrderPayload(order),
        customer_token: customerToken,
        waiter_name: order.waiter_name,
        waiter_staff_id: order.waiter_staff_id,
        waiter_image_url: order.waiter_image_url,
      },
      { status: 201 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not assign order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
