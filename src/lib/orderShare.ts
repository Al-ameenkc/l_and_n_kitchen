import type { Dish } from "@/types/menu";

export type OrderShareItem = {
  id: string;
  qty: number;
};

export function buildOrderShareUrl(origin: string, shareId: string): string {
  const url = new URL("/order", origin);
  url.searchParams.set("s", shareId);
  return url.toString();
}

/** Legacy long QR payload: ids=slug:qty,slug2 */
export function buildLegacyOrderShareUrl(origin: string, items: OrderShareItem[]): string {
  const encoded = items
    .filter((item) => item.id)
    .map((item) => {
      const qty = Math.max(1, Math.round(item.qty) || 1);
      return qty > 1 ? `${item.id}:${qty}` : item.id;
    })
    .join(",");
  const url = new URL("/order", origin);
  if (encoded) url.searchParams.set("ids", encoded);
  return url.toString();
}

export function parseOrderItemsParam(raw: string | null | undefined): OrderShareItem[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return null;
      const colon = trimmed.lastIndexOf(":");
      if (colon === -1) return { id: trimmed, qty: 1 };
      const id = trimmed.slice(0, colon).trim();
      const qtyRaw = Number(trimmed.slice(colon + 1));
      if (!id) return null;
      return {
        id,
        qty: Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.min(99, Math.round(qtyRaw)) : 1,
      };
    })
    .filter((item): item is OrderShareItem => Boolean(item));
}

/** @deprecated use parseOrderItemsParam */
export function parseOrderIdsParam(raw: string | null | undefined): string[] {
  return parseOrderItemsParam(raw).map((item) => item.id);
}

export function qrImageUrl(data: string, size = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&ecc=M&data=${encodeURIComponent(data)}`;
}

export type OrderDish = Dish & { qty: number };

export function resolveOrderDishes(
  allDishes: Dish[],
  items: OrderShareItem[]
): OrderDish[] {
  const byId = new Map(allDishes.map((d) => [d.id, d]));
  return items
    .map((item) => {
      const dish = byId.get(item.id);
      if (!dish) return null;
      return { ...dish, qty: item.qty };
    })
    .filter((d): d is OrderDish => Boolean(d));
}
