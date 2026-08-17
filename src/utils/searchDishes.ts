import type { Dish } from "@/types/menu";

export function scoreDish(dish: Dish, query: string): number {
  const q = query.toLowerCase();
  const name = dish.name.toLowerCase();
  const category = dish.category.toLowerCase();
  const short = dish.shortDescription.toLowerCase();
  const ingredients = dish.ingredients.join(" ").toLowerCase();

  if (name === q) return 100;
  if (name.startsWith(q)) return 90;
  if (name.includes(q)) return 75;
  if (category.startsWith(q)) return 60;
  if (category.includes(q)) return 50;
  if (short.includes(q) || ingredients.includes(q)) return 35;
  if (dish.description.toLowerCase().includes(q)) return 25;
  return 0;
}

export function searchDishes(dishes: Dish[], query: string): Dish[] {
  const q = query.trim();
  if (!q) return dishes;

  return dishes
    .map((dish) => ({ dish, score: scoreDish(dish, q) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.dish.name.localeCompare(b.dish.name))
    .map((row) => row.dish);
}
