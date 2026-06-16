"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useDeck } from "@/hooks/useDeck";
import {
  getWishlistDishes,
  getWishlistTotal,
  getTrashDishes,
  useMenuStore,
} from "@/store/menuStore";
import type { Dish, MenuData } from "@/types/menu";
import { WishListBar } from "./CardActionButtons";
import { CardStack } from "./CardStack";
import { CurvedCategoryCarousel } from "./CurvedCategoryCarousel";
import { DishDetailView } from "./DishDetailView";
import { HeaderBar } from "./HeaderBar";
import { SwipeHintOverlay } from "./SwipeHintOverlay";
import { TrashSheet } from "./TrashSheet";
import { WishListSheet } from "./WishListSheet";

export function MenuApp({ menuData }: { menuData: MenuData }) {
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
    syncWithMenuDishIds,
  } = useMenuStore();

  const deck = useDeck(menuData.dishes);

  const wishlistDishes = useMemo(
    () => getWishlistDishes(menuData.dishes, wishlist),
    [menuData.dishes, wishlist]
  );
  const trashDishes = useMemo(
    () => getTrashDishes(menuData.dishes, trash),
    [menuData.dishes, trash]
  );
  const wishlistTotal = useMemo(
    () => getWishlistTotal(menuData.dishes, wishlist),
    [menuData.dishes, wishlist]
  );

  const detailDish = useMemo(
    () => menuData.dishes.find((d) => d.id === detailDishId) ?? null,
    [menuData.dishes, detailDishId]
  );

  const handleWish = useCallback((dish: Dish) => addToWishlist(dish.id), [addToWishlist]);
  const handleTrash = useCallback((dish: Dish) => addToTrash(dish.id), [addToTrash]);

  useEffect(() => {
    syncWithMenuDishIds(menuData.dishes.map((d) => d.id));
  }, [menuData.dishes, syncWithMenuDishIds]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#111111]">
      <div className="relative z-30 shrink-0 overflow-visible">
        <HeaderBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <CurvedCategoryCarousel
          categories={menuData.categories}
          categoryImages={menuData.categoryImages}
          selected={categoryFilter}
          onChange={setCategoryFilter}
        />
      </div>

      <main className="relative z-10 -mt-3 flex min-h-0 flex-1 flex-col overflow-visible pb-[max(5.75rem,env(safe-area-inset-bottom))] pt-1">
        <CardStack
          deck={deck}
          onWish={handleWish}
          onTrash={handleTrash}
          onCardTap={(dish) => setDetailDishId(dish.id)}
          onOpenWishlist={() => setWishlistOpen(true)}
          onOpenTrash={() => setTrashOpen(true)}
        />
      </main>

      <SwipeHintOverlay active={deck.length > 0} />

      <WishListBar count={wishlistDishes.length} onOpen={() => setWishlistOpen(true)} />

      <DishDetailView dish={detailDish} onClose={() => setDetailDishId(null)} />

      <WishListSheet
        open={wishlistOpen}
        dishes={wishlistDishes}
        total={wishlistTotal}
        onClose={() => setWishlistOpen(false)}
        onRemove={removeFromWishlist}
        onSelectDish={(dish) => setDetailDishId(dish.id)}
      />

      <TrashSheet
        open={trashOpen}
        dishes={trashDishes}
        onClose={() => setTrashOpen(false)}
        onRestoreToWishlist={restoreFromTrashToWishlist}
        onRestoreToDeck={restoreFromTrashToDeck}
        onSelectDish={(dish) => setDetailDishId(dish.id)}
      />
    </div>
  );
}
