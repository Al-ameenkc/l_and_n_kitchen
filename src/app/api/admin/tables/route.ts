import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isMissingOrdersSchemaError } from "@/lib/orders-db";
import { ensureTables } from "@/lib/waiter-queue";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { from?: number; to?: number };
    const from = Number(body.from);
    const to = Number(body.to);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < from) {
      return NextResponse.json({ error: "Enter a table range, such as 1 to 12." }, { status: 400 });
    }
    const tables = await ensureTables(from, to);
    return NextResponse.json({ tables });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create tables";
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
