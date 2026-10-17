import { NextResponse } from "next/server";
import { isMissingOrdersSchemaError } from "@/lib/orders-db";
import { confirmTableScan } from "@/lib/waiter-queue";

function tokenFromScan(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const tIndex = parts.indexOf("t");
    if (tIndex >= 0 && parts[tIndex + 1]) return decodeURIComponent(parts[tIndex + 1]);
  } catch {
    /* plain token */
  }
  return trimmed.replace(/^\/?t\//, "");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { staff_id?: string; qr_token?: string };
    const staffId = body.staff_id?.trim() ?? "";
    const token = tokenFromScan(body.qr_token ?? "");
    if (!staffId || !token) {
      return NextResponse.json({ error: "Waiter ID and table QR are required." }, { status: 400 });
    }
    const result = await confirmTableScan(staffId, token);
    return NextResponse.json({
      already: result.already,
      table_number: result.table.table_number,
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
