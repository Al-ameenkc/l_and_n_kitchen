import type { Dish, MenuData } from "@/types/menu";
import { getCategoryPlaceholder } from "@/utils/dishImage";
import { createPublicClient, createServiceClient, isSupabaseConfigured } from "./supabase/server";

export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
}

export interface DbDish {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  price: number;
  currency: string;
  short_description: string;
  description: string;
  ingredients: string[];
  allergens: string[];
  prep_time_min: number;
  prep_time_max: number;
  estimated_calories: number;
  best_combo_with: string;
  image_url: string | null;
  categories?: { name: string; slug: string; image_url: string | null } | null;
}

function mapDish(row: DbDish, categoryName: string): Dish {
  return {
    id: row.slug,
    name: row.name,
    category: categoryName,
    price: Number(row.price),
    currency: "NGN",
    shortDescription: row.short_description,
    description: row.description,
    ingredients: row.ingredients ?? [],
    allergens: row.allergens ?? [],
    prepTimeMin: row.prep_time_min,
    prepTimeMax: row.prep_time_max,
    estimatedCalories: row.estimated_calories,
    bestComboWith: row.best_combo_with,
    image: row.image_url || getCategoryPlaceholder(categoryName),
  };
}

export async function fetchMenuFromDb(): Promise<MenuData | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createPublicClient();
    const { data: categories, error: catErr } = await supabase
      .from("categories")
      .select("id, name, slug, image_url, sort_order")
      .order("sort_order", { ascending: true });

    if (catErr) throw catErr;
    if (!categories?.length) return null;

    const { data: dishes, error: dishErr } = await supabase
      .from("dishes")
      .select(
        "id, slug, name, category_id, price, currency, short_description, description, ingredients, allergens, prep_time_min, prep_time_max, estimated_calories, best_combo_with, image_url, categories(name)"
      );

    if (dishErr) throw dishErr;

    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    return {
      categories: categories.map((c) => c.name),
      categoryImages: Object.fromEntries(
        categories
          .filter((c) => c.image_url)
          .map((c) => [c.name, c.image_url as string])
      ),
      dishes: (dishes ?? []).map((d) => {
        const row = d as DbDish & { categories: { name: string } | { name: string }[] | null };
        const cat = row.categories;
        const categoryName = Array.isArray(cat)
          ? cat[0]?.name
          : cat?.name ?? catMap.get(row.category_id) ?? "Others";
        return mapDish(row, categoryName);
      }),
    };
  } catch (e) {
    console.error("fetchMenuFromDb:", e);
    return null;
  }
}

export async function getMenuData(): Promise<MenuData> {
  const fromDb = await fetchMenuFromDb();
  return (
    fromDb ?? {
      categories: [],
      dishes: [],
      categoryImages: {},
    }
  );
}

export async function listCategoriesAdmin(): Promise<DbCategory[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listDishesAdmin(): Promise<DbDish[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("dishes")
    .select("*, categories(name, slug, image_url)")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbDish[];
}
