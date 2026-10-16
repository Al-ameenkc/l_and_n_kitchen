import { NextResponse } from "next/server";
import {
  getOrderByShareId,
  isMissingOrdersSchemaError,
  isOrderClosed,
  mapDbOrder,
  normalizeOrderItems,
  proposeWaiterItem,
  syncShareFromOrder,
  type OrderItem,
} from "@/lib/orders-db";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      share_id?: string;
      waiter_staff_id?: string;
      item?: OrderItem;
    };

    const shareId = body.share_id?.trim().replace(/[^a-zA-Z0-9]/g, "") ?? "";
    const staffId = body.waiter_staff_id?.trim() ?? "";
    const item = normalizeOrderItems(body.item ? [body.item] : [])[0];

    if (!shareId) {
      return NextResponse.json({ error: "Share ID is required." }, { status: 400 });
    }
    if (!staffId) {
      return NextResponse.json({ error: "Waiter ID is required." }, { status: 400 });
    }
    if (!item) {
      return NextResponse.json({ error: "Invalid dish." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const order = await getOrderByShareId(shareId, supabase);
    if (!order) {
      return NextResponse.json({ error: "Order not found for this QR." }, { status: 404 });
    }
    if (order.waiter_staff_id.toLowerCase() !== staffId.toLowerCase()) {
      return NextResponse.json(
        { error: "Only the assigned waiter can propose additions." },
        { status: 403 }
      );
    }
    if (isOrderClosed(order.status)) {
      return NextResponse.json({ error: "This order is closed." }, { status: 400 });
    }

    const updated = await proposeWaiterItem(order.id, item, order.waiter_name, supabase);
    try {
      await syncShareFromOrder(updated);
    } catch (shareErr) {
      console.error("syncShareFromOrder:", shareErr);
    }

    return NextResponse.json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not propose dish";
    if (isMissingOrdersSchemaError(message)) {
      return NextResponse.json(
        {
          error: "Run supabase/order-pending-and-number.sql in the Supabase SQL Editor.",
          schemaMissing: true,
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
