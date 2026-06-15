import type { Dish, MenuData } from "@/types/menu";
import { getCategoryPlaceholder } from "@/utils/dishImage";
import { CATEGORIES, RAW_MENU, type RawDish } from "./rawDishes";

const PREP_BY_CATEGORY: Record<string, [number, number]> = {
  "English Dishes": [15, 30],
  Grill: [20, 35],
  "Side Dishes": [10, 20],
  Soups: [25, 45],
  Alacarte: [15, 25],
  Sauces: [10, 20],
  Salads: [8, 15],
  Mocktails: [5, 10],
  Smoothies: [5, 10],
  "Fresh Juice": [5, 10],
  Drinks: [2, 8],
  Tea: [5, 12],
  Books: [1, 1],
  Traditional: [20, 40],
  Snacks: [10, 20],
  Others: [1, 5],
  VIP: [1, 5],
  Games: [1, 1],
  Delivery: [1, 1],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function inferIngredients(name: string, category: string): string[] {
  const lower = name.toLowerCase();
  const items: string[] = [];

  if (lower.includes("chicken")) items.push("chicken");
  if (lower.includes("beef") || lower.includes("balangu") || lower.includes("ram"))
    items.push("beef or ram");
  if (lower.includes("fish") || lower.includes("tilapia") || lower.includes("catfish"))
    items.push("fish");
  if (lower.includes("egg")) items.push("eggs");
  if (lower.includes("rice") || lower.includes("jollof")) items.push("rice");
  if (lower.includes("yam") || lower.includes("plantain")) items.push("yam or plantain");
  if (lower.includes("beans")) items.push("beans");
  if (lower.includes("indomie") || lower.includes("spaghetti"))
    items.push("noodles");
  if (lower.includes("pepper") || lower.includes("ferfesu")) items.push("pepper spices");
  if (lower.includes("egusi")) items.push("melon seeds");
  if (lower.includes("ogbono")) items.push("ogbono seeds");
  if (lower.includes("okra") || lower.includes("kubewa")) items.push("okra");
  if (lower.includes("groundnut") || lower.includes("taushe")) items.push("groundnuts");
  if (lower.includes("spinach") || lower.includes("ganye")) items.push("spinach");
  if (lower.includes("moringa") || lower.includes("zogale")) items.push("moringa leaves");
  if (lower.includes("orange") || lower.includes("watermelon") || lower.includes("pineapple"))
    items.push("fresh fruit");
  if (lower.includes("zobo")) items.push("hibiscus, ginger");
  if (lower.includes("kunu")) items.push("millet or tiger nuts");
  if (lower.includes("fura")) items.push("millet, fermented milk");

  if (items.length === 0) {
    const defaults: Record<string, string[]> = {
      Drinks: ["refreshing base ingredients"],
      Tea: ["tea leaves", "spices"],
      Mocktails: ["fruit mix", "soda or tonic"],
      Smoothies: ["milk", "ice cream", "flavoring"],
      Salads: ["fresh vegetables", "dressing"],
      Snacks: ["flour", "oil", "seasoning"],
      Sauces: ["tomatoes", "peppers", "spices"],
      Books: ["printed book"],
      VIP: ["private dining experience"],
      Games: ["game equipment rental"],
      Delivery: ["delivery service fee"],
      Others: ["service item"],
    };
    return defaults[category] ?? ["seasonal ingredients"];
  }

  return [...new Set(items)];
}

function inferAllergens(name: string, ingredients: string[]): string[] {
  const lower = name.toLowerCase();
  const allergens: string[] = [];

  if (
    lower.includes("groundnut") ||
    lower.includes("taushe") ||
    lower.includes("peanut") ||
    ingredients.some((i) => i.includes("groundnut"))
  ) {
    allergens.push("peanuts");
  }
  if (
    lower.includes("fish") ||
    lower.includes("tilapia") ||
    lower.includes("catfish") ||
    lower.includes("croaker")
  ) {
    allergens.push("fish");
  }
  if (lower.includes("egg") || lower.includes("omelette")) allergens.push("eggs");
  if (lower.includes("milk") || lower.includes("shake") || lower.includes("fura"))
    allergens.push("dairy");
  if (lower.includes("wheat") || lower.includes("bread") || lower.includes("sandwich"))
    allergens.push("gluten");
  if (ingredients.some((i) => i.includes("nuts"))) allergens.push("tree nuts");

  if (allergens.length === 0) allergens.push("ask staff for full allergen info");
  return allergens;
}

function buildDescription(raw: RawDish, category: string): string {
  const base = raw.shortDescription ?? raw.name;
  const categoryHints: Record<string, string> = {
    "English Dishes":
      "A hearty Nigerian-style plate prepared fresh in our kitchen. Expect bold seasoning and generous portions.",
    Grill:
      "Grilled or roasted over open flame for a smoky aroma. Served hot with traditional Northern Nigerian flair.",
    "Side Dishes": "Perfect accompaniment to your main — simple, comforting, and freshly prepared.",
    Soups:
      "Rich, aromatic soup slow-simmered with traditional spices. Best paired with swallow or rice.",
    Alacarte: "Made to order — allow a little extra time for fresh preparation.",
    Sauces: "Flavor-packed sauce to complement rice, swallow, or grilled protein.",
    Salads: "Crisp and refreshing mix, lightly dressed.",
    Mocktails: "Non-alcoholic mixed drink — sweet, tangy, and cooling.",
    Smoothies: "Thick, creamy blend served chilled.",
    "Fresh Juice": "Pressed from fresh fruit — bright and naturally sweet.",
    Drinks: "Chilled beverage, ready to serve.",
    Tea: "Warm spiced or classic tea — aromatic and soothing.",
    Traditional:
      "Authentic Northern Nigerian specialty — familiar flavors with homestyle preparation.",
    Snacks: "Light bite, fried fresh — crisp outside, soft inside.",
    VIP: "Premium private dining or lounge experience at L&N Kitchen.",
    Games: "Recreational activity available at the restaurant.",
    Delivery: "Delivery fee based on distance from the restaurant.",
    Others: "Additional service or packaging item.",
    Books: "Book available for purchase at the restaurant.",
  };

  return `${base}. ${categoryHints[category] ?? "Prepared fresh at L&N Kitchen."}`;
}

const CALORIES_BY_CATEGORY: Record<string, [number, number]> = {
  "English Dishes": [420, 780],
  Grill: [380, 720],
  "Side Dishes": [180, 420],
  Soups: [260, 540],
  Alacarte: [220, 480],
  Sauces: [120, 320],
  Salads: [90, 280],
  Mocktails: [80, 220],
  Smoothies: [240, 520],
  "Fresh Juice": [70, 180],
  Drinks: [40, 220],
  Tea: [15, 90],
  Books: [0, 0],
  Traditional: [300, 680],
  Snacks: [160, 420],
  Others: [0, 50],
  VIP: [0, 0],
  Games: [0, 0],
  Delivery: [0, 0],
};

const COMBO_BY_CATEGORY: Record<string, string> = {
  "English Dishes": "Fried Plantain & Chapman mocktail",
  Grill: "Boiled Plantain & Zobo drink",
  "Side Dishes": "Any grilled protein or soup",
  Soups: "Tuwon Shinkafa or Semovita swallow",
  Alacarte: "Arabian Tea or Fresh Juice",
  Sauces: "Plain White Rice or Boiled Yam",
  Salads: "Grilled Chicken or Chapman",
  Mocktails: "CEO Salad or Suya-style grill",
  Smoothies: "Puff-Puff or Akara snack",
  "Fresh Juice": "Light salad or snack platter",
  Drinks: "Grill platter or rice dish",
  Tea: "Samosa or Pancakes",
  Books: "A quiet corner & Arabian Tea",
  Traditional: "Miyan Taushe or pepper soup",
  Snacks: "Zobo or Fresh Pineapple Juice",
  Others: "Any main course dish",
  VIP: "Full traditional platter & mocktails",
  Games: "Snacks & soft drinks",
  Delivery: "Any menu favorites",
};

function inferCalories(category: string, name: string): number {
  const [min, max] = CALORIES_BY_CATEGORY[category] ?? [200, 450];
  if (min === 0 && max === 0) return 0;
  const lower = name.toLowerCase();
  let factor = 0.55;
  if (lower.includes("special") || lower.includes("combo") || lower.includes("platter")) factor = 0.92;
  if (lower.includes("only") || lower.includes("water") || lower.includes("tea")) factor = 0.25;
  if (lower.includes("big") || lower.includes("buffet") || lower.includes("iftar")) factor = 0.98;
  return Math.round(min + (max - min) * factor);
}

function inferBestCombo(category: string, name: string): string {
  const base = COMBO_BY_CATEGORY[category] ?? "Chef's recommended side & drink";
  const lower = name.toLowerCase();
  if (lower.includes("fish")) return "Fried Plantain & Tartar-style pepper sauce";
  if (lower.includes("jollof")) return "Grilled Chicken & Coleslaw";
  if (lower.includes("pepper soup") || lower.includes("ferfesu")) return "White Rice or Agidi";
  if (lower.includes("fura")) return "Masa (1 pc) & Kunu Tsamiya";
  return base;
}

function enrichDish(category: string, raw: RawDish, index: number): Dish {
  const id = `${slugify(category)}-${slugify(raw.name)}`;
  const [prepTimeMin, prepTimeMax] = PREP_BY_CATEGORY[category] ?? [10, 20];
  const ingredients = inferIngredients(raw.name, category);
  const allergens = inferAllergens(raw.name, ingredients);

  return {
    id,
    name: raw.name,
    category,
    price: raw.price,
    currency: "NGN",
    shortDescription: raw.shortDescription ?? raw.name,
    description: buildDescription(raw, category),
    ingredients,
    allergens,
    prepTimeMin,
    prepTimeMax,
    estimatedCalories: inferCalories(category, raw.name),
    bestComboWith: inferBestCombo(category, raw.name),
    image: getCategoryPlaceholder(category),
  };
}

export function buildMenuData(): MenuData {
  const dishes: Dish[] = [];

  for (const category of CATEGORIES) {
    const items = RAW_MENU[category] ?? [];
    items.forEach((raw, index) => {
      dishes.push(enrichDish(category, raw, index));
    });
  }

  return {
    categories: [...CATEGORIES],
    dishes,
  };
}

export const menuData = buildMenuData();
