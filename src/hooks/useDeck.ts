import { useMemo } from "react";
import type { Dish } from "@/types/menu";
import { useMenuStore } from "@/store/menuStore";

export function useDeck(dishes: Dish[]) {
  const { wishlist, trash, searchQuery, categoryFilter } = useMenuStore();

  const deck = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return dishes.filter((dish) => {
      if (wishlist.includes(dish.id) || trash.includes(dish.id)) return false;

      if (query) {
        const haystack = [
          dish.name,
          dish.category,
          dish.shortDescription,
          dish.description,
          ...dish.ingredients,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      }

      if (categoryFilter !== "all" && dish.category !== categoryFilter) return false;
      return true;
    });
  }, [dishes, wishlist, trash, searchQuery, categoryFilter]);

  return deck;
}
