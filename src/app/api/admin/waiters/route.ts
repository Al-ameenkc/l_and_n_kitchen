import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isMissingOrdersSchemaError, listWaitersAdmin } from "@/lib/orders-db";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const waiters = await listWaitersAdmin();
    return NextResponse.json(waiters);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load waiters";
    if (isMissingOrdersSchemaError(message)) {
      return NextResponse.json(
        { error: message, schemaMissing: true, waiters: [] },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    staff_id?: string;
    name?: string;
    image_url?: string | null;
    active?: boolean;
  };

  const staffId = body.staff_id?.trim() ?? "";
  const name = body.name?.trim() ?? "";
  if (!staffId || !name) {
    return NextResponse.json({ error: "Waiter ID and name are required." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("waiters")
    .insert({
      staff_id: staffId,
      name,
      image_url: body.image_url || null,
      active: body.active ?? true,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
