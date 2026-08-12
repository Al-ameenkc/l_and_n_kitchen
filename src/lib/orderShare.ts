import type { Dish } from "@/types/menu";

export function buildOrderShareUrl(origin: string, dishIds: string[]): string {
  const ids = dishIds.filter(Boolean).join(",");
  const url = new URL("/order", origin);
  if (ids) url.searchParams.set("ids", ids);
  return url.toString();
}

export function parseOrderIdsParam(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function qrImageUrl(data: string, size = 180): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(data)}`;
}

export function resolveOrderDishes(allDishes: Dish[], ids: string[]): Dish[] {
  const byId = new Map(allDishes.map((d) => [d.id, d]));
  return ids.map((id) => byId.get(id)).filter((d): d is Dish => Boolean(d));
}
