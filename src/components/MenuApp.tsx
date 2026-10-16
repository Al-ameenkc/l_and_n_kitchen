"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDeck } from "@/hooks/useDeck";
import { useActiveOrderSync } from "@/hooks/useActiveOrderSync";
import {
  getWishlistDishes,
  getWishlistItemCount,
  getTrashDishes,
  useMenuStore,
} from "@/store/menuStore";
import type { Dish, MenuData } from "@/types/menu";
import { WishListBar } from "./CardActionButtons";
import { CardStack } from "./CardStack";
import { CategoryLanding } from "./CategoryLanding";
import { DishDetailView } from "./DishDetailView";
import { HeaderBar } from "./HeaderBar";
import { OnboardingWalkthrough } from "./OnboardingWalkthrough";
import { TrashSheet } from "./TrashSheet";
import { WishListSheet } from "./WishListSheet";

type SheetView = "list" | "order" | "history" | "record";
type ScreenView = "categories" | "menu";

const PRUNE_INTERVAL_MS = 60 * 1000;

export function MenuApp({ menuData }: { menuData: MenuData }) {
  const {
    wishlist,
    trash,
    searchQuery,
    categoryFilter,
    detailDishId,
    wishlistOpen,
    trashOpen,
    activeShareId,
    activeOrderId,
    lockedItems,
    orderSnapshotItems,
    orderRecords,
    activeRecordId,
    addToWishlist,
    addToTrash,
    removeFromWishlist,
    setWishlistQty,
    restoreFromTrashToWishlist,
    restoreFromTrashToDeck,
    restoreAllTrashToDeck,
    setSearchQuery,
    setCategoryFilter,
    setDetailDishId,
    setWishlistOpen,
    setTrashOpen,
    syncWithMenuDishIds,
    setActiveShareId,
    updateOrderRecordShareId,
    placeOrderFromWishlist,
    startNewOrderSession,
    beginNewOrderWithDish,
    pruneExpiredOrders,
  } = useMenuStore();

  const [screen, setScreen] = useState<ScreenView>("categories");
  const [sheetView, setSheetView] = useState<SheetView>("list");
  const [viewingRecordId, setViewingRecordId] = useState<string | null>(null);
  const [deckRemountKey, setDeckRemountKey] = useState(0);

  useActiveOrderSync(menuData.dishes);

  const deck = useDeck(menuData.dishes);

  const hasActiveOrderSession = orderSnapshotItems.length > 0;
  const hasOrderHistory = orderRecords.length > 0;

  const searchableDishes = useMemo(() => {
    const wishIds = new Set(wishlist.map((entry) => entry.id));
    const orderIds = new Set(orderSnapshotItems.map((item) => item.id));
    return menuData.dishes.filter(
      (dish) =>
        dish.available !== false &&
        !wishIds.has(dish.id) &&
        !orderIds.has(dish.id) &&
        !trash.includes(dish.id)
    );
  }, [menuData.dishes, wishlist, trash, orderSnapshotItems]);

  const deckKey = searchQuery.trim()
    ? `search:${searchQuery.trim().toLowerCase()}`
    : `category:${categoryFilter}`;

  const wishlistDishes = useMemo(
    () => getWishlistDishes(menuData.dishes, wishlist, orderSnapshotItems),
    [menuData.dishes, wishlist, orderSnapshotItems]
  );
  const orderDishes = useMemo(() => {
    if (orderSnapshotItems.length) {
      return getWishlistDishes(
        menuData.dishes,
        orderSnapshotItems.map((item) => ({ id: item.id, qty: item.qty })),
        orderSnapshotItems
      );
    }
    return wishlistDishes;
  }, [menuData.dishes, orderSnapshotItems, wishlistDishes]);

  const sheetDishes = sheetView === "order" ? orderDishes : wishlistDishes;
  const sheetTotal = useMemo(
    () => sheetDishes.reduce((sum, d) => sum + d.price * d.qty, 0),
    [sheetDishes]
  );

  const trashDishes = useMemo(
    () => getTrashDishes(menuData.dishes, trash),
    [menuData.dishes, trash]
  );
  const wishlistCount = useMemo(() => getWishlistItemCount(wishlist), [wishlist]);
  const orderItemCount = useMemo(
    () => orderSnapshotItems.reduce((sum, item) => sum + item.qty, 0),
    [orderSnapshotItems]
  );

  const lockedItemIds = useMemo(
    () => lockedItems.map((item) => item.id),
    [lockedItems]
  );
  const lockedQtyById = useMemo(
    () => Object.fromEntries(lockedItems.map((item) => [item.id, item.qty])),
    [lockedItems]
  );

  const detailDish = useMemo(
    () => menuData.dishes.find((d) => d.id === detailDishId) ?? null,
    [menuData.dishes, detailDishId]
  );
  const detailInWishlist = useMemo(
    () => (detailDishId ? wishlist.some((entry) => entry.id === detailDishId) : false),
    [wishlist, detailDishId]
  );
  const detailInOrder = useMemo(
    () =>
      detailDishId
        ? orderSnapshotItems.some((item) => item.id === detailDishId)
        : false,
    [orderSnapshotItems, detailDishId]
  );

  const handleWish = useCallback(
    (dish: Dish) => {
      if (hasActiveOrderSession) {
        beginNewOrderWithDish(dish.id);
        setSheetView("list");
        setViewingRecordId(null);
        setWishlistOpen(false);
        setDeckRemountKey((k) => k + 1);
        return;
      }
      addToWishlist(dish.id);
    },
    [
      addToWishlist,
      beginNewOrderWithDish,
      hasActiveOrderSession,
      setWishlistOpen,
    ]
  );

  const handlePlaceOrder = useCallback(() => {
    const items = wishlistDishes.map((dish) => ({
      id: dish.id,
      name: dish.name,
      category: dish.category,
      price: dish.price,
      qty: dish.qty,
    }));
    if (!items.length) return;
    placeOrderFromWishlist(items);
    setSheetView("order");
  }, [placeOrderFromWishlist, wishlistDishes]);

  const handleTrash = useCallback((dish: Dish) => addToTrash(dish.id), [addToTrash]);

  const openWishlist = useCallback(() => {
    setSheetView("list");
    setViewingRecordId(null);
    setWishlistOpen(true);
  }, [setWishlistOpen]);

  const openOrdersHistory = useCallback(() => {
    setSheetView("history");
    setViewingRecordId(null);
    setWishlistOpen(true);
  }, [setWishlistOpen]);

  const openCurrentOrder = useCallback(() => {
    setSheetView("order");
    setViewingRecordId(null);
    setWishlistOpen(true);
  }, [setWishlistOpen]);

  const handleNewOrder = useCallback(() => {
    startNewOrderSession();
    setSheetView("list");
    setViewingRecordId(null);
    setDeckRemountKey((k) => k + 1);
  }, [startNewOrderSession]);

  const closeWishlist = useCallback(() => {
    setWishlistOpen(false);
    if (hasActiveOrderSession) {
      setSheetView("order");
    } else if (hasOrderHistory) {
      setSheetView("history");
    } else {
      setSheetView("list");
    }
    setViewingRecordId(null);
  }, [hasActiveOrderSession, hasOrderHistory, setWishlistOpen]);

  const handleViewRecord = useCallback((recordId: string) => {
    setViewingRecordId(recordId);
    setSheetView("record");
  }, []);

  const handleShareIdForRecord = useCallback(
    (recordId: string, shareId: string) => {
      updateOrderRecordShareId(recordId, shareId);
      if (activeRecordId === recordId) {
        setActiveShareId(shareId);
      }
    },
    [activeRecordId, setActiveShareId, updateOrderRecordShareId]
  );

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

  const rootRef = useRef<HTMLDivElement>(null);
  const dismissOnboardingRef = useRef<(() => void) | null>(null);
  const [storeHydrated, setStoreHydrated] = useState(
    () => useMenuStore.persist.hasHydrated()
  );

  useEffect(() => {
    if (storeHydrated) return;
    return useMenuStore.persist.onFinishHydration(() => setStoreHydrated(true));
  }, [storeHydrated]);

  useEffect(() => {
    if (!storeHydrated) return;
    pruneExpiredOrders();
    const timer = window.setInterval(pruneExpiredOrders, PRUNE_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") pruneExpiredOrders();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [storeHydrated, pruneExpiredOrders]);

  const openCategory = useCallback(
    (category: string) => {
      setSearchQuery("");
      setCategoryFilter(category);
      setScreen("menu");
      window.history.pushState({ lnScreen: "menu" }, "");
    },
    [setCategoryFilter, setSearchQuery]
  );

  const backToCategories = useCallback(() => {
    if (window.history.state?.lnScreen === "menu") {
      window.history.back();
    } else {
      setScreen("categories");
    }
  }, []);

  useEffect(() => {
    if (window.history.state?.lnScreen === "menu") {
      window.history.replaceState(null, "");
    }
    const onPopState = () => {
      if (window.history.state?.lnScreen !== "menu") {
        setScreen("categories");
        setDetailDishId(null);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setDetailDishId]);

  return (
    <div ref={rootRef} className="relative flex h-full flex-col overflow-hidden bg-[#111111]">
      {screen === "categories" ? (
        <CategoryLanding
          categories={menuData.categories}
          categoryImages={menuData.categoryImages}
          dishes={menuData.dishes}
          showOrdersButton={hasOrderHistory}
          orderCount={orderRecords.length}
          onOpenOrders={openOrdersHistory}
          onSelect={openCategory}
        />
      ) : (
      <>
      <div className="relative z-40 shrink-0 overflow-visible">
        <HeaderBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          dishes={searchableDishes}
          showOrdersIcon={hasOrderHistory}
          orderCount={orderRecords.length}
          onOpenOrders={openOrdersHistory}
          onBack={backToCategories}
        />
        <p className="truncate px-5 pt-1 text-lg font-extrabold text-white">
          {searchQuery.trim() ? "Search results" : categoryFilter}
        </p>
      </div>

      <main className="relative z-10 mt-3 flex min-h-0 flex-1 flex-col overflow-visible pb-[max(5.75rem,env(safe-area-inset-bottom))]">
        <CardStack
          key={`${deckKey}-${deckRemountKey}`}
          deck={deck}
          trashCount={trash.length}
          onWish={handleWish}
          onTrash={handleTrash}
          onCardTap={(dish) => setDetailDishId(dish.id)}
          onOpenWishlist={hasActiveOrderSession ? openCurrentOrder : openWishlist}
          onOpenTrash={() => setTrashOpen(true)}
          onDismissOnboarding={() => dismissOnboardingRef.current?.()}
        />
      </main>

      <OnboardingWalkthrough
        containerRef={rootRef}
        dismissRef={dismissOnboardingRef}
        ready={storeHydrated}
        skip={hasOrderHistory}
      />

      <WishListBar
        wishlistCount={wishlistCount}
        orderCount={orderItemCount}
        hasOrder={hasActiveOrderSession}
        onOpenWishlist={openWishlist}
        onOpenOrders={openCurrentOrder}
      />
      </>
      )}

      <DishDetailView
        dish={detailDish}
        inWishlist={detailInWishlist}
        inOrder={detailInOrder}
        orderMode={false}
        onClose={() => setDetailDishId(null)}
        onAddToWishlist={handleWish}
      />

      <WishListSheet
        open={wishlistOpen}
        dishes={sheetDishes}
        total={sheetTotal}
        onClose={closeWishlist}
        onRemove={removeFromWishlist}
        onChangeQty={setWishlistQty}
        onSelectDish={(dish) => setDetailDishId(dish.id)}
        shareId={activeShareId}
        onShareId={setActiveShareId}
        orderLive={Boolean(activeOrderId)}
        lockedItemIds={lockedItemIds}
        lockedQtyById={lockedQtyById}
        initialView={sheetView}
        orderRecords={orderRecords}
        menuDishes={menuData.dishes}
        viewingRecordId={viewingRecordId}
        onViewRecord={handleViewRecord}
        onBackToHistory={() => {
          setViewingRecordId(null);
          setSheetView("history");
        }}
        onShareIdForRecord={handleShareIdForRecord}
        onNewOrder={hasActiveOrderSession ? handleNewOrder : undefined}
        onPlaceOrder={handlePlaceOrder}
      />

      <TrashSheet
        open={trashOpen}
        dishes={trashDishes}
        onClose={() => setTrashOpen(false)}
        onRestoreToWishlist={restoreFromTrashToWishlist}
        onRestoreToDeck={restoreFromTrashToDeck}
        onRestoreAllToDeck={restoreAllTrashToDeck}
        onSelectDish={(dish) => setDetailDishId(dish.id)}
      />
    </div>
  );
}
