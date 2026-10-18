import { NextResponse } from "next/server";
import { isMissingOrdersSchemaError } from "@/lib/orders-db";
import { editConfirmedOrder } from "@/lib/waiter-queue";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      staff_id?: string;
      order_id?: string;
      action?: string;
      dish_id?: string;
      qty?: number;
    };
    const staffId = body.staff_id?.trim() ?? "";
    const orderId = body.order_id?.trim() ?? "";
    const dishId = body.dish_id?.trim() ?? "";
    if (!staffId || !orderId || !dishId) {
      return NextResponse.json({ error: "Order and dish are required." }, { status: 400 });
    }

    if (body.action === "add") {
      const order = await editConfirmedOrder(staffId, orderId, { action: "add", dishId });
      return NextResponse.json(order);
    }
    if (body.action === "remove") {
      const order = await editConfirmedOrder(staffId, orderId, { action: "remove", dishId });
      return NextResponse.json(order);
    }
    if (body.action === "set_qty") {
      const order = await editConfirmedOrder(staffId, orderId, {
        action: "set_qty",
        dishId,
        qty: Number(body.qty),
      });
      return NextResponse.json(order);
    }

    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update the order";
    if (isMissingOrdersSchemaError(message)) {
      return NextResponse.json(
        {
          error: "Run supabase/waiter-queue.sql in the Supabase SQL Editor.",
          schemaMissing: true,
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
