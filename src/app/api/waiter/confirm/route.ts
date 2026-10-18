import { NextResponse } from "next/server";
import { isMissingOrdersSchemaError } from "@/lib/orders-db";
import { confirmCustomerOrderScan } from "@/lib/waiter-queue";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { staff_id?: string; qr_token?: string };
    const staffId = body.staff_id?.trim() ?? "";
    const scanned = body.qr_token?.trim() ?? "";
    if (!staffId || !scanned) {
      return NextResponse.json({ error: "Scan the customer's order QR." }, { status: 400 });
    }
    const result = await confirmCustomerOrderScan(staffId, scanned);
    return NextResponse.json({
      already: result.already,
      table_label: result.order.table_label,
      order_id: result.order.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not confirm the table";
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
