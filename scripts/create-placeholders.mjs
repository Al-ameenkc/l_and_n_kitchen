const placeholders = {
  "english-dishes": { label: "English Dishes", from: "#b45309", to: "#f59e0b" },
  grill: { label: "Grill", from: "#7c2d12", to: "#ea580c" },
  "side-dishes": { label: "Sides", from: "#a16207", to: "#facc15" },
  soups: { label: "Soups", from: "#166534", to: "#4ade80" },
  alacarte: { label: "A la Carte", from: "#9a3412", to: "#fb923c" },
  sauces: { label: "Sauces", from: "#be123c", to: "#fb7185" },
  salads: { label: "Salads", from: "#15803d", to: "#86efac" },
  mocktails: { label: "Mocktails", from: "#0e7490", to: "#67e8f9" },
  smoothies: { label: "Smoothies", from: "#7e22ce", to: "#d8b4fe" },
  "fresh-juice": { label: "Fresh Juice", from: "#ca8a04", to: "#fde047" },
  drinks: { label: "Drinks", from: "#1d4ed8", to: "#93c5fd" },
  tea: { label: "Tea", from: "#854d0e", to: "#fcd34d" },
  books: { label: "Books", from: "#374151", to: "#9ca3af" },
  traditional: { label: "Traditional", from: "#14532d", to: "#86efac" },
  snacks: { label: "Snacks", from: "#c2410c", to: "#fdba74" },
  dessert: { label: "Dessert", from: "#be185d", to: "#f9a8d4" },
  others: { label: "Others", from: "#57534e", to: "#d6d3d1" },
  vip: { label: "VIP", from: "#581c87", to: "#c084fc" },
  games: { label: "Games", from: "#0f766e", to: "#5eead4" },
  delivery: { label: "Delivery", from: "#1e3a8a", to: "#60a5fa" },
};

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const dir = join(process.cwd(), "public", "images", "placeholders");
mkdirSync(dir, { recursive: true });

for (const [slug, { label, from, to }] of Object.entries(placeholders)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="42" font-weight="700">${label}</text>
  <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="Arial,sans-serif" font-size="20">L&amp;N Kitchen</text>
</svg>`;
  writeFileSync(join(dir, `${slug}.svg`), svg);
}

console.log(`Created ${Object.keys(placeholders).length} placeholder images`);
