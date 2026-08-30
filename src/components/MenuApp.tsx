"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useDeck } from "@/hooks/useDeck";
import { useActiveOrderSync } from "@/hooks/useActiveOrderSync";
import {
  getWishlistDishes,
  getWishlistItemCount,
  getTrashDishes,
  useMenuStore,
} from "@/store/menuStore";
import type { Dish, MenuData } from "@/types/menu";
import { formatPrice } from "@/utils/formatPrice";
import { WishListBar } from "./CardActionButtons";
import { CardStack } from "./CardStack";
import { CurvedCategoryCarousel } from "./CurvedCategoryCarousel";
import { DishDetailView } from "./DishDetailView";
import { HeaderBar } from "./HeaderBar";
import { OnboardingWalkthrough } from "./OnboardingWalkthrough";
import { TrashSheet } from "./TrashSheet";
import { WishListSheet } from "./WishListSheet";

type SheetView = "list" | "order" | "history" | "record";

function AddToOrderConfirm({
  dish,
  onCancel,
  onConfirm,
}: {
  dish: Dish;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 backdrop-blur-sm sm:items-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-[#1a1a1a] shadow-[0_20px_60px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
      >
        <div className="flex gap-3 border-b border-zinc-800 p-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-zinc-800">
            <Image src={dish.image} alt="" fill className="object-cover" unoptimized />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
              Add to order?
            </p>
            <p className="mt-1 truncate text-base font-extrabold text-white">{dish.name}</p>
            <p className="mt-0.5 text-sm font-bold text-green-400">{formatPrice(dish.price)}</p>
          </div>
        </div>
        <div className="space-y-4 px-4 py-4">
          <p className="text-sm leading-relaxed text-zinc-300">
            Are you sure you want to add this to your order? Once added, you{" "}
            <span className="font-semibold text-white">cannot remove it yourself</span>. Ask a
            waiter if you need a change.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-full bg-zinc-800 py-3 text-sm font-bold text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 rounded-full bg-green-500 py-3 text-sm font-bold text-white"
            >
              Add to order
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

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
    setSearchQuery,
    setCategoryFilter,
    setDetailDishId,
    setWishlistOpen,
    setTrashOpen,
    syncWithMenuDishIds,
    setActiveShareId,
    updateOrderRecordShareId,
    placeOrderFromWishlist,
    addToLocalOrder,
    startNewOrderSession,
  } = useMenuStore();

  const [sheetView, setSheetView] = useState<SheetView>("list");
  const [viewingRecordId, setViewingRecordId] = useState<string | null>(null);
  const [pendingOrderDish, setPendingOrderDish] = useState<Dish | null>(null);
  const [deckRemountKey, setDeckRemountKey] = useState(0);

  const { addDishToOrder } = useActiveOrderSync(menuData.dishes);

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

  const commitWish = useCallback(
    (dish: Dish) => {
      addToWishlist(dish.id);
    },
    [addToWishlist]
  );

  const commitOrderAdd = useCallback(
    async (dish: Dish) => {
      if (activeOrderId) {
        await addDishToOrder(dish);
        return;
      }
      addToLocalOrder({
        id: dish.id,
        name: dish.name,
        category: dish.category,
        price: dish.price,
        qty: 1,
      });
    },
    [activeOrderId, addDishToOrder, addToLocalOrder]
  );

  const handleWish = useCallback(
    (dish: Dish) => {
      if (hasActiveOrderSession) {
        setPendingOrderDish(dish);
        return;
      }
      commitWish(dish);
    },
    [commitWish, hasActiveOrderSession]
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

  const handleOrderMore = useCallback(() => {
    setWishlistOpen(false);
    setSheetView("order");
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

  return (
    <div ref={rootRef} className="relative flex h-full flex-col overflow-hidden bg-[#111111]">
      <div className="relative z-40 shrink-0 overflow-visible">
        <HeaderBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          dishes={searchableDishes}
          showOrdersIcon={hasOrderHistory}
          orderCount={orderRecords.length}
          onOpenOrders={openOrdersHistory}
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

      <DishDetailView
        dish={detailDish}
        inWishlist={detailInWishlist}
        inOrder={detailInOrder}
        orderMode={hasActiveOrderSession}
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
        onOrderMore={hasActiveOrderSession ? handleOrderMore : undefined}
        onNewOrder={hasActiveOrderSession ? handleNewOrder : undefined}
        onPlaceOrder={handlePlaceOrder}
      />

      <TrashSheet
        open={trashOpen}
        dishes={trashDishes}
        onClose={() => setTrashOpen(false)}
        onRestoreToWishlist={restoreFromTrashToWishlist}
        onRestoreToDeck={restoreFromTrashToDeck}
        onSelectDish={(dish) => setDetailDishId(dish.id)}
      />

      <AnimatePresence>
        {pendingOrderDish ? (
          <AddToOrderConfirm
            key={pendingOrderDish.id}
            dish={pendingOrderDish}
            onCancel={() => {
              setPendingOrderDish(null);
              setDeckRemountKey((k) => k + 1);
            }}
            onConfirm={() => {
              void commitOrderAdd(pendingOrderDish);
              setPendingOrderDish(null);
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
