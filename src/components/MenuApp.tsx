"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useDeck } from "@/hooks/useDeck";
import {
  getWishlistDishes,
  getWishlistItemCount,
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
    setWishlistQty,
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

  const searchableDishes = useMemo(() => {
    const wishIds = new Set(wishlist.map((entry) => entry.id));
    return menuData.dishes.filter(
      (dish) => !wishIds.has(dish.id) && !trash.includes(dish.id)
    );
  }, [menuData.dishes, wishlist, trash]);

  const deckKey = searchQuery.trim()
    ? `search:${searchQuery.trim().toLowerCase()}`
    : `category:${categoryFilter}`;

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
  const wishlistCount = useMemo(() => getWishlistItemCount(wishlist), [wishlist]);

  const detailDish = useMemo(
    () => menuData.dishes.find((d) => d.id === detailDishId) ?? null,
    [menuData.dishes, detailDishId]
  );
  const detailInWishlist = useMemo(
    () => (detailDishId ? wishlist.some((entry) => entry.id === detailDishId) : false),
    [wishlist, detailDishId]
  );

  const handleWish = useCallback((dish: Dish) => addToWishlist(dish.id), [addToWishlist]);
  const handleTrash = useCallback((dish: Dish) => addToTrash(dish.id), [addToTrash]);

  useEffect(() => {
    syncWithMenuDishIds(menuData.dishes.map((d) => d.id));
  }, [menuData.dishes, syncWithMenuDishIds]);

  useEffect(() => {
    const first = menuData.categories[0];
    if (!first) return;
    if (!categoryFilter || !menuData.categories.includes(categoryFilter)) {
      setCategoryFilter(first);
    }
  }, [menuData.categories, categoryFilter, setCategoryFilter]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#111111]">
      <div className="relative z-40 shrink-0 overflow-visible">
        <HeaderBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          dishes={searchableDishes}
        />
        <div className="relative z-10">
          <CurvedCategoryCarousel
            categories={menuData.categories}
            categoryImages={menuData.categoryImages}
            selected={categoryFilter}
            onChange={setCategoryFilter}
          />
        </div>
      </div>

      <main className="relative z-10 -mt-3 flex min-h-0 flex-1 flex-col overflow-visible pb-[max(5.75rem,env(safe-area-inset-bottom))] pt-1">
        <CardStack
          key={deckKey}
          deck={deck}
          trashCount={trash.length}
          onWish={handleWish}
          onTrash={handleTrash}
          onCardTap={(dish) => setDetailDishId(dish.id)}
          onOpenWishlist={() => setWishlistOpen(true)}
          onOpenTrash={() => setTrashOpen(true)}
        />
      </main>

      <SwipeHintOverlay />

      <WishListBar count={wishlistCount} onOpen={() => setWishlistOpen(true)} />

      <DishDetailView
        dish={detailDish}
        inWishlist={detailInWishlist}
        onClose={() => setDetailDishId(null)}
        onAddToWishlist={handleWish}
      />

      <WishListSheet
        open={wishlistOpen}
        dishes={wishlistDishes}
        total={wishlistTotal}
        onClose={() => setWishlistOpen(false)}
        onRemove={removeFromWishlist}
        onChangeQty={setWishlistQty}
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
