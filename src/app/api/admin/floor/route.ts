import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isMissingOrdersSchemaError, isOrderClosed, listOrdersAdmin } from "@/lib/orders-db";
import { listQueue, listTables, tickQueue } from "@/lib/waiter-queue";
import { OFFER_SECONDS } from "@/lib/waiter-limits";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await tickQueue();
    const [queue, tables, orders] = await Promise.all([
      listQueue(),
      listTables(),
      listOrdersAdmin(),
    ]);
    const open = orders.filter((order) => !isOrderClosed(order.status));
    const waiterByOrder = new Map(
      open.filter((order) => order.table_id).map((order) => [order.table_id as string, order])
    );
    const now = Date.now();
    return NextResponse.json({
      offer_seconds: OFFER_SECONDS,
      queue: queue
        .filter((waiter) => waiter.on_duty)
        .sort((a, b) => (a.place ?? 99) - (b.place ?? 99)),
      off_duty: queue.filter((waiter) => !waiter.on_duty),
      tables: tables.map((table) => {
        const order = waiterByOrder.get(table.id);
        return {
          ...table,
          waiter_name: order?.waiter_name || "",
          order_status: order?.assignment_state ?? null,
          order_id: order?.id ?? null,
        };
      }),
      offers: open
        .filter((order) => order.assignment_state === "offered" || order.assignment_state === "seeking")
        .map((order) => ({
          id: order.id,
          table_label: order.table_label,
          waiter_name: order.waiter_name,
          assignment_state: order.assignment_state,
          seconds_left: order.offer_expires_at
            ? Math.max(0, Math.ceil((new Date(order.offer_expires_at).getTime() - now) / 1000))
            : null,
          total: order.total,
        })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load the floor";
    if (isMissingOrdersSchemaError(message)) {
      return NextResponse.json(
        {
          error: "Run supabase/waiter-queue.sql in the Supabase SQL Editor, then refresh.",
          schemaMissing: true,
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
