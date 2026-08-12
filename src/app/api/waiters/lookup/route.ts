import { NextResponse } from "next/server";
import { findWaiterByStaffId, isMissingOrdersSchemaError } from "@/lib/orders-db";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const staffId = new URL(request.url).searchParams.get("staff_id")?.trim() ?? "";
  if (!staffId) {
    return NextResponse.json({ error: "staff_id is required." }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const waiter = await findWaiterByStaffId(staffId, supabase);
    if (!waiter) {
      return NextResponse.json({ error: "Waiter not found." }, { status: 404 });
    }
    return NextResponse.json({
      id: waiter.id,
      staff_id: waiter.staff_id,
      name: waiter.name,
      image_url: waiter.image_url,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Lookup failed";
    if (isMissingOrdersSchemaError(message)) {
      return NextResponse.json(
        {
          error:
            "Orders/waiters tables are not set up yet. Run supabase/orders-waiters.sql in the Supabase SQL Editor.",
          schemaMissing: true,
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
