import { writeFileSync } from "fs";
import { join } from "path";
import { createRequire } from "module";

// Build menu.json at build time via tsx transpile
const require = createRequire(import.meta.url);

async function main() {
  const { buildMenuData } = await import("../src/data/menu.ts");
  const data = buildMenuData();
  const outPath = join(process.cwd(), "src", "data", "menu.json");
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`Wrote ${data.dishes.length} dishes to menu.json`);
}

main();
