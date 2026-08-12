import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { OrderStatus } from "@/lib/orders-db";
import { createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const STATUSES: OrderStatus[] = ["new", "accepted", "completed", "cancelled"];

export async function PUT(request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { status?: string };
  const status = body.status as OrderStatus | undefined;
  if (!status || !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
