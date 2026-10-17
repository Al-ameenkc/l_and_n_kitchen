import { NextResponse } from "next/server";
import { isMissingOrdersSchemaError } from "@/lib/orders-db";
import { clockIn, clockOut } from "@/lib/waiter-queue";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { staff_id?: string; action?: "in" | "out" };
    const staffId = body.staff_id?.trim() ?? "";
    if (!staffId) {
      return NextResponse.json({ error: "Waiter ID is required." }, { status: 400 });
    }
    if (body.action === "out") {
      await clockOut(staffId);
      return NextResponse.json({ ok: true });
    }
    const waiter = await clockIn(staffId);
    return NextResponse.json(waiter);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update duty";
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
