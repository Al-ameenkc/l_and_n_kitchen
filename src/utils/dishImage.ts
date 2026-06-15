const categorySlugMap: Record<string, string> = {
  "English Dishes": "english-dishes",
  Grill: "grill",
  "Side Dishes": "side-dishes",
  Soups: "soups",
  Alacarte: "alacarte",
  Sauces: "sauces",
  Salads: "salads",
  Mocktails: "mocktails",
  Smoothies: "smoothies",
  "Fresh Juice": "fresh-juice",
  Drinks: "drinks",
  Tea: "tea",
  Books: "books",
  Traditional: "traditional",
  Snacks: "snacks",
  Dessert: "dessert",
  Others: "others",
  VIP: "vip",
  Games: "games",
  Delivery: "delivery",
};

export function getCategoryPlaceholder(category: string): string {
  const slug = categorySlugMap[category] ?? "others";
  return `/images/placeholders/${slug}.svg`;
}

export function getDishImage(dishId: string, category: string): string {
  return `/images/dishes/${dishId}.jpg`;
}

export function resolveDishImage(
  dishId: string,
  category: string,
  customImage?: string
): string {
  return customImage ?? getCategoryPlaceholder(category);
}
