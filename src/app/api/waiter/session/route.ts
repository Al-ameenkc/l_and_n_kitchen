import { NextResponse } from "next/server";
import { isMissingOrdersSchemaError } from "@/lib/orders-db";
import { waiterSession } from "@/lib/waiter-queue";

export async function GET(request: Request) {
  const staffId = new URL(request.url).searchParams.get("staff_id")?.trim() ?? "";
  if (!staffId) {
    return NextResponse.json({ error: "staff_id is required." }, { status: 400 });
  }
  try {
    const session = await waiterSession(staffId);
    return NextResponse.json(session);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load waiter session";
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
