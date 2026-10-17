import { NextResponse } from "next/server";
import { isMissingOrdersSchemaError } from "@/lib/orders-db";
import { findTableByToken } from "@/lib/waiter-queue";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.json({ error: "token is required." }, { status: 400 });
  }
  try {
    const table = await findTableByToken(token);
    if (!table) {
      return NextResponse.json({ error: "Table not found." }, { status: 404 });
    }
    return NextResponse.json({
      table_number: table.table_number,
      status: table.status,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not look up the table";
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
