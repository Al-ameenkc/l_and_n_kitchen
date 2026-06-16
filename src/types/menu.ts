export interface Dish {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: "NGN";
  shortDescription: string;
  description: string;
  ingredients: string[];
  allergens: string[];
  prepTimeMin: number;
  prepTimeMax: number;
  estimatedCalories: number;
  bestComboWith: string;
  image: string;
}

export interface MenuData {
  categories: string[];
  dishes: Dish[];
  /** Category name → image URL (from admin / Supabase) */
  categoryImages?: Record<string, string>;
}
