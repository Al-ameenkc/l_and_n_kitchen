import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    staff_id?: string;
    name?: string;
    image_url?: string | null;
    active?: boolean;
  };

  const updates: Record<string, unknown> = {};
  if (body.staff_id !== undefined) updates.staff_id = body.staff_id.trim();
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.image_url !== undefined) updates.image_url = body.image_url;
  if (body.active !== undefined) updates.active = body.active;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("waiters")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from("waiters").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
