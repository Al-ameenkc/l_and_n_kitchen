import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Dish } from "@/types/menu";

export type WishlistEntry = {
  id: string;
  qty: number;
};

export type WishlistDish = Dish & { qty: number };

interface MenuStore {
  wishlist: WishlistEntry[];
  trash: string[];
  searchQuery: string;
  categoryFilter: string;
  detailDishId: string | null;
  wishlistOpen: boolean;
  trashOpen: boolean;
  addToWishlist: (id: string) => void;
  addToTrash: (id: string) => void;
  removeFromWishlist: (id: string) => void;
  setWishlistQty: (id: string, qty: number) => void;
  restoreFromTrashToWishlist: (id: string) => void;
  restoreFromTrashToDeck: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setDetailDishId: (id: string | null) => void;
  setWishlistOpen: (open: boolean) => void;
  setTrashOpen: (open: boolean) => void;
  syncWithMenuDishIds: (validDishIds: string[]) => void;
}

function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.min(99, Math.max(1, Math.round(qty)));
}

function normalizeWishlist(raw: unknown): WishlistEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === "string") {
        return { id: entry, qty: 1 };
      }
      if (entry && typeof entry === "object" && "id" in entry) {
        const id = String((entry as WishlistEntry).id ?? "").trim();
        if (!id) return null;
        return {
          id,
          qty: clampQty(Number((entry as WishlistEntry).qty) || 1),
        };
      }
      return null;
    })
    .filter((entry): entry is WishlistEntry => Boolean(entry));
}

function hasWishlistId(wishlist: WishlistEntry[], id: string): boolean {
  return wishlist.some((entry) => entry.id === id);
}

export const useMenuStore = create<MenuStore>()(
  persist(
    (set) => ({
      wishlist: [],
      trash: [],
      searchQuery: "",
      categoryFilter: "",
      detailDishId: null,
      wishlistOpen: false,
      trashOpen: false,
      addToWishlist: (id) =>
        set((state) => ({
          wishlist: hasWishlistId(state.wishlist, id)
            ? state.wishlist
            : [...state.wishlist, { id, qty: 1 }],
          trash: state.trash.filter((t) => t !== id),
        })),
      addToTrash: (id) =>
        set((state) => ({
          trash: state.trash.includes(id) ? state.trash : [...state.trash, id],
          wishlist: state.wishlist.filter((w) => w.id !== id),
        })),
      removeFromWishlist: (id) =>
        set((state) => ({
          wishlist: state.wishlist.filter((w) => w.id !== id),
        })),
      setWishlistQty: (id, qty) =>
        set((state) => ({
          wishlist: state.wishlist.map((entry) =>
            entry.id === id ? { ...entry, qty: clampQty(qty) } : entry
          ),
        })),
      restoreFromTrashToWishlist: (id) =>
        set((state) => ({
          trash: state.trash.filter((t) => t !== id),
          wishlist: hasWishlistId(state.wishlist, id)
            ? state.wishlist
            : [...state.wishlist, { id, qty: 1 }],
        })),
      restoreFromTrashToDeck: (id) =>
        set((state) => ({
          trash: state.trash.filter((t) => t !== id),
        })),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setCategoryFilter: (category) => set({ categoryFilter: category }),
      setDetailDishId: (id) => set({ detailDishId: id }),
      setWishlistOpen: (open) => set({ wishlistOpen: open, trashOpen: false }),
      setTrashOpen: (open) => set({ trashOpen: open, wishlistOpen: false }),
      syncWithMenuDishIds: (validDishIds) =>
        set((state) => {
          const valid = new Set(validDishIds);
          return {
            wishlist: state.wishlist.filter((entry) => valid.has(entry.id)),
            trash: state.trash.filter((id) => valid.has(id)),
            detailDishId:
              state.detailDishId && valid.has(state.detailDishId)
                ? state.detailDishId
                : null,
          };
        }),
    }),
    {
      name: "ln-kitchen-menu",
      version: 2,
      partialize: (state) => ({
        wishlist: state.wishlist,
        trash: state.trash,
      }),
      migrate: (persisted) => {
        const state = (persisted ?? {}) as {
          wishlist?: unknown;
          trash?: string[];
        };
        return {
          wishlist: normalizeWishlist(state.wishlist),
          trash: Array.isArray(state.trash) ? state.trash : [],
        };
      },
    }
  )
);

export function getWishlistItemCount(wishlist: WishlistEntry[]): number {
  return wishlist.reduce((sum, entry) => sum + entry.qty, 0);
}

export function getWishlistTotal(dishes: Dish[], wishlist: WishlistEntry[]): number {
  return wishlist.reduce((sum, entry) => {
    const dish = dishes.find((d) => d.id === entry.id);
    return sum + (dish?.price ?? 0) * entry.qty;
  }, 0);
}

export function getWishlistDishes(
  dishes: Dish[],
  wishlist: WishlistEntry[]
): WishlistDish[] {
  return wishlist
    .map((entry) => {
      const dish = dishes.find((d) => d.id === entry.id);
      if (!dish) return null;
      return { ...dish, qty: entry.qty };
    })
    .filter((d): d is WishlistDish => Boolean(d));
}

export function getTrashDishes(dishes: Dish[], trash: string[]): Dish[] {
  return trash
    .map((id) => dishes.find((d) => d.id === id))
    .filter((d): d is Dish => Boolean(d));
}
