import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { slugify } from "@/lib/slugify";
import { createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

function parseList(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export async function PUT(request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.name !== undefined) {
    updates.name = String(body.name).trim();
    if (!body.slug) updates.slug = slugify(String(body.name));
  }
  if (body.slug !== undefined) updates.slug = String(body.slug);
  if (body.category_id !== undefined) updates.category_id = String(body.category_id);
  if (body.price !== undefined) updates.price = Number(body.price);
  if (body.short_description !== undefined) updates.short_description = String(body.short_description);
  if (body.description !== undefined) updates.description = String(body.description);
  if (body.ingredients !== undefined) updates.ingredients = parseList(body.ingredients);
  if (body.allergens !== undefined) updates.allergens = parseList(body.allergens);
  if (body.prep_time_min !== undefined) updates.prep_time_min = Number(body.prep_time_min);
  if (body.prep_time_max !== undefined) updates.prep_time_max = Number(body.prep_time_max);
  if (body.estimated_calories !== undefined) updates.estimated_calories = Number(body.estimated_calories);
  if (body.best_combo_with !== undefined) updates.best_combo_with = String(body.best_combo_with);
  if (body.image_url !== undefined) updates.image_url = body.image_url;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("dishes")
    .update(updates)
    .eq("id", id)
    .select()
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
  const { error } = await supabase.from("dishes").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
