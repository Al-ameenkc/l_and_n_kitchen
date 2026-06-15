"use client";

import { useCallback, useMemo } from "react";
import { menuData } from "@/data/menu";
import { useDeck } from "@/hooks/useDeck";
import {
  getWishlistDishes,
  getWishlistTotal,
  getTrashDishes,
  useMenuStore,
} from "@/store/menuStore";
import type { Dish } from "@/types/menu";
import { WishListBar } from "./CardActionButtons";
import { CardStack } from "./CardStack";
import { CurvedCategoryCarousel } from "./CurvedCategoryCarousel";
import { DishDetailView } from "./DishDetailView";
import { HeaderBar } from "./HeaderBar";
import { TrashSheet } from "./TrashSheet";
import { WishListSheet } from "./WishListSheet";

export function MenuApp() {
  const {
    wishlist,
    trash,
    searchQuery,
    categoryFilter,
    detailDishId,
    wishlistOpen,
    trashOpen,
    addToWishlist,
    addToTrash,
    removeFromWishlist,
    restoreFromTrashToWishlist,
    restoreFromTrashToDeck,
    setSearchQuery,
    setCategoryFilter,
    setDetailDishId,
    setWishlistOpen,
    setTrashOpen,
  } = useMenuStore();

  const deck = useDeck(menuData.dishes);

  const wishlistDishes = useMemo(
    () => getWishlistDishes(menuData.dishes, wishlist),
    [wishlist]
  );
  const trashDishes = useMemo(() => getTrashDishes(menuData.dishes, trash), [trash]);
  const wishlistTotal = useMemo(
    () => getWishlistTotal(menuData.dishes, wishlist),
    [wishlist]
  );

  const detailDish = useMemo(
    () => menuData.dishes.find((d) => d.id === detailDishId) ?? null,
    [detailDishId]
  );

  const handleWish = useCallback((dish: Dish) => addToWishlist(dish.id), [addToWishlist]);
  const handleTrash = useCallback((dish: Dish) => addToTrash(dish.id), [addToTrash]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#111111]">
      <div className="relative z-30 shrink-0 overflow-visible">
        <HeaderBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <CurvedCategoryCarousel
          categories={menuData.categories}
          selected={categoryFilter}
          onChange={setCategoryFilter}
        />
      </div>

      <main className="relative z-10 -mt-10 flex min-h-0 flex-1 flex-col overflow-visible pb-20 pt-0">
        <CardStack
          deck={deck}
          onWish={handleWish}
          onTrash={handleTrash}
          onCardTap={(dish) => setDetailDishId(dish.id)}
          onOpenWishlist={() => setWishlistOpen(true)}
          onOpenTrash={() => setTrashOpen(true)}
        />
      </main>

      <WishListBar count={wishlist.length} onOpen={() => setWishlistOpen(true)} />

      <DishDetailView dish={detailDish} onClose={() => setDetailDishId(null)} />

      <WishListSheet
        open={wishlistOpen}
        dishes={wishlistDishes}
        total={wishlistTotal}
        onClose={() => setWishlistOpen(false)}
        onRemove={removeFromWishlist}
      />

      <TrashSheet
        open={trashOpen}
        dishes={trashDishes}
        onClose={() => setTrashOpen(false)}
        onRestoreToWishlist={restoreFromTrashToWishlist}
        onRestoreToDeck={restoreFromTrashToDeck}
      />
    </div>
  );
}
