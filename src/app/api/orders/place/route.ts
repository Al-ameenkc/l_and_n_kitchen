import { NextResponse } from "next/server";
import { isMissingOrdersSchemaError, publicOrderPayload } from "@/lib/orders-db";
import { placeTableOrder } from "@/lib/waiter-queue";
import type { OrderItem } from "@/lib/orders-db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      table_token?: string;
      items?: OrderItem[];
      share_id?: string;
    };
    const placed = await placeTableOrder({
      tableToken: body.table_token?.trim() ?? "",
      items: body.items ?? [],
      shareId: body.share_id,
    });
    return NextResponse.json(
      {
        ...publicOrderPayload(placed.order),
        customer_token: placed.customerToken,
        table_number: placed.table.table_number,
        waiter_name: placed.order.waiter_name,
      },
      { status: 201 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not place order";
    if (isMissingOrdersSchemaError(message)) {
      return NextResponse.json(
        {
          error: "Run supabase/waiter-queue.sql in the Supabase SQL Editor, then refresh.",
          schemaMissing: true,
        },
        { status: 503 }
      );
    }
    const status = /already has an open order/i.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
