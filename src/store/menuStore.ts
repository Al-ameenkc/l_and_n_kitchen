import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Dish } from "@/types/menu";

interface MenuStore {
  wishlist: string[];
  trash: string[];
  searchQuery: string;
  categoryFilter: string;
  detailDishId: string | null;
  wishlistOpen: boolean;
  trashOpen: boolean;
  addToWishlist: (id: string) => void;
  addToTrash: (id: string) => void;
  removeFromWishlist: (id: string) => void;
  restoreFromTrashToWishlist: (id: string) => void;
  restoreFromTrashToDeck: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setDetailDishId: (id: string | null) => void;
  setWishlistOpen: (open: boolean) => void;
  setTrashOpen: (open: boolean) => void;
}

export const useMenuStore = create<MenuStore>()(
  persist(
    (set) => ({
      wishlist: [],
      trash: [],
      searchQuery: "",
      categoryFilter: "all",
      detailDishId: null,
      wishlistOpen: false,
      trashOpen: false,
      addToWishlist: (id) =>
        set((state) => ({
          wishlist: state.wishlist.includes(id)
            ? state.wishlist
            : [...state.wishlist, id],
          trash: state.trash.filter((t) => t !== id),
        })),
      addToTrash: (id) =>
        set((state) => ({
          trash: state.trash.includes(id) ? state.trash : [...state.trash, id],
          wishlist: state.wishlist.filter((w) => w !== id),
        })),
      removeFromWishlist: (id) =>
        set((state) => ({
          wishlist: state.wishlist.filter((w) => w !== id),
        })),
      restoreFromTrashToWishlist: (id) =>
        set((state) => ({
          trash: state.trash.filter((t) => t !== id),
          wishlist: state.wishlist.includes(id)
            ? state.wishlist
            : [...state.wishlist, id],
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
    }),
    {
      name: "ln-kitchen-menu",
      partialize: (state) => ({
        wishlist: state.wishlist,
        trash: state.trash,
      }),
    }
  )
);

export function getWishlistTotal(dishes: Dish[], wishlist: string[]): number {
  return wishlist.reduce((sum, id) => {
    const dish = dishes.find((d) => d.id === id);
    return sum + (dish?.price ?? 0);
  }, 0);
}

export function getWishlistDishes(dishes: Dish[], wishlist: string[]): Dish[] {
  return wishlist
    .map((id) => dishes.find((d) => d.id === id))
    .filter((d): d is Dish => Boolean(d));
}

export function getTrashDishes(dishes: Dish[], trash: string[]): Dish[] {
  return trash
    .map((id) => dishes.find((d) => d.id === id))
    .filter((d): d is Dish => Boolean(d));
}
