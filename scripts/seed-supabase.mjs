/**
 * Seed Supabase from the built-in static menu.
 * Usage: copy .env.example to .env.local, fill Supabase keys, then:
 *   npx tsx scripts/seed-supabase.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);
const menuPath = join(process.cwd(), "src", "data", "menu.json");
const menu = JSON.parse(readFileSync(menuPath, "utf8"));

const catIdByName = new Map();

for (let i = 0; i < menu.categories.length; i++) {
  const name = menu.categories[i];
  const { data, error } = await supabase
    .from("categories")
    .upsert(
      { name, slug: slugify(name), sort_order: i, image_url: null },
      { onConflict: "name" }
    )
    .select("id, name")
    .single();
  if (error) {
    console.error("Category error:", name, error.message);
    continue;
  }
  catIdByName.set(data.name, data.id);
  console.log("Category:", name);
}

for (const dish of menu.dishes) {
  const categoryId = catIdByName.get(dish.category);
  if (!categoryId) {
    console.warn("Skip (no category):", dish.name);
    continue;
  }

  const { error } = await supabase.from("dishes").upsert(
    {
      slug: dish.id,
      name: dish.name,
      category_id: categoryId,
      price: dish.price,
      currency: "NGN",
      short_description: dish.shortDescription,
      description: dish.description,
      ingredients: dish.ingredients,
      allergens: dish.allergens,
      prep_time_min: dish.prepTimeMin,
      prep_time_max: dish.prepTimeMax,
      estimated_calories: dish.estimatedCalories,
      best_combo_with: dish.bestComboWith,
      image_url: dish.image?.startsWith("http") ? dish.image : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );

  if (error) console.error("Dish error:", dish.name, error.message);
  else console.log("Dish:", dish.name);
}

console.log("Done.");
