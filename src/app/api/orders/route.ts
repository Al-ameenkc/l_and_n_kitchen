import { NextResponse } from "next/server";
import {
  findWaiterByStaffId,
  isMissingOrdersSchemaError,
  type OrderItem,
} from "@/lib/orders-db";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      table_label?: string;
      waiter_staff_id?: string;
      waiter_name?: string;
      items?: OrderItem[];
      dish_ids?: string[];
    };

    const tableLabel = body.table_label?.trim() ?? "";
    const staffId = body.waiter_staff_id?.trim() ?? "";
    const waiterNameInput = body.waiter_name?.trim() ?? "";
    const items = Array.isArray(body.items) ? body.items : [];

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
    const normalizedItems = items.map((item) => {
      const qty = Math.max(1, Math.round(Number(item.qty) || 1));
      return {
        id: String(item.id),
        name: String(item.name),
        category: String(item.category ?? ""),
        price: Number(item.price) || 0,
        qty,
      };
    });
    const total = normalizedItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );
    const dishIds = Array.isArray(body.dish_ids)
      ? body.dish_ids.map(String)
      : normalizedItems.map((item) => item.id);

    const { data, error } = await supabase
      .from("orders")
      .insert({
        table_label: tableLabel,
        waiter_id: waiter.id,
        waiter_staff_id: waiter.staff_id,
        waiter_name: waiterName,
        waiter_image_url: waiter.image_url,
        items: normalizedItems,
        total,
        currency: "NGN",
        status: "new",
        dish_ids: dishIds,
        assigned_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      if (isMissingOrdersSchemaError(error.message)) {
        return NextResponse.json(
          {
            error:
              "Orders/waiters tables are not set up yet. Run supabase/orders-waiters.sql in the Supabase SQL Editor.",
            schemaMissing: true,
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not assign order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
