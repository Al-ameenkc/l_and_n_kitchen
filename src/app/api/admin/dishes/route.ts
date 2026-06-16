import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listDishesAdmin } from "@/lib/menu-db";
import { slugify } from "@/lib/slugify";
import { createServiceClient } from "@/lib/supabase/server";

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dishes = await listDishesAdmin();
  return NextResponse.json(dishes);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;

  if (!body.name || !body.category_id) {
    return NextResponse.json({ error: "Name and category are required." }, { status: 400 });
  }

  const name = String(body.name).trim();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("dishes")
    .insert({
      slug: body.slug ? String(body.slug) : slugify(name),
      name,
      category_id: String(body.category_id),
      price: Number(body.price) || 0,
      currency: "NGN",
      short_description: String(body.short_description ?? name),
      description: String(body.description ?? body.short_description ?? name),
      ingredients: parseList(body.ingredients),
      allergens: parseList(body.allergens),
      prep_time_min: Number(body.prep_time_min) || 10,
      prep_time_max: Number(body.prep_time_max) || 20,
      estimated_calories: Number(body.estimated_calories) || 0,
      best_combo_with: String(body.best_combo_with ?? ""),
      image_url: body.image_url ? String(body.image_url) : null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
