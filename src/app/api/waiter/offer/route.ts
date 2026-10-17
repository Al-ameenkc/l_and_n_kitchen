import { NextResponse } from "next/server";
import { findWaiterByStaffId, isMissingOrdersSchemaError } from "@/lib/orders-db";
import { acceptOffer, passOffer } from "@/lib/waiter-queue";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      staff_id?: string;
      order_id?: string;
      action?: "accept" | "pass";
    };
    const staffId = body.staff_id?.trim() ?? "";
    const orderId = body.order_id?.trim() ?? "";
    if (!staffId || !orderId) {
      return NextResponse.json({ error: "Waiter and order are required." }, { status: 400 });
    }
    const supabase = createServiceClient();
    const waiter = await findWaiterByStaffId(staffId, supabase);
    if (!waiter) {
      return NextResponse.json({ error: "Waiter not found." }, { status: 404 });
    }
    if (body.action === "pass") {
      await passOffer(orderId, waiter.id, supabase);
      return NextResponse.json({ ok: true });
    }
    const order = await acceptOffer(orderId, waiter.id, supabase);
    return NextResponse.json({
      id: order.id,
      table_label: order.table_label,
      assignment_state: order.assignment_state,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update the offer";
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
