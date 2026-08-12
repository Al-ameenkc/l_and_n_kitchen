import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isMissingOrdersSchemaError, listOrdersAdmin } from "@/lib/orders-db";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const orders = await listOrdersAdmin();
    return NextResponse.json(orders);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load orders";
    if (isMissingOrdersSchemaError(message)) {
      return NextResponse.json(
        { error: message, schemaMissing: true, orders: [] },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
