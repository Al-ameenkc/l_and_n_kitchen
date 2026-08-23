import { useMemo } from "react";
import type { Dish } from "@/types/menu";
import { useMenuStore } from "@/store/menuStore";
import { searchDishes } from "@/utils/searchDishes";

export function useDeck(dishes: Dish[]) {
  const { wishlist, trash, searchQuery, categoryFilter, orderSnapshotItems } =
    useMenuStore();

  const deck = useMemo(() => {
    const query = searchQuery.trim();
    const wishIds = new Set(wishlist.map((entry) => entry.id));
    const orderIds = new Set(orderSnapshotItems.map((item) => item.id));

    const available = dishes.filter(
      (dish) =>
        dish.available !== false &&
        !wishIds.has(dish.id) &&
        !orderIds.has(dish.id) &&
        !trash.includes(dish.id)
    );

    if (query) {
      return searchDishes(available, query);
    }

    return available.filter((dish) => dish.category === categoryFilter);
  }, [dishes, wishlist, trash, searchQuery, categoryFilter, orderSnapshotItems]);

  return deck;
}
