import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Dish } from "@/types/menu";
import type { LockedOrderItem, OrderItem, OrderStatus } from "@/lib/orders-db";

export type WishlistEntry = {
  id: string;
  qty: number;
};

export type WishlistDish = Dish & { qty: number };

export type OrderRecord = {
  id: string;
  items: OrderItem[];
  shareId: string | null;
  lockedItems: LockedOrderItem[];
  createdAt: string;
  liveOrderId?: string | null;
  status?: OrderStatus | null;
};

function newOrderRecordId(): string {
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface MenuStore {
  wishlist: WishlistEntry[];
  trash: string[];
  searchQuery: string;
  categoryFilter: string;
  detailDishId: string | null;
  wishlistOpen: boolean;
  trashOpen: boolean;
  /** Stable QR share id for this session */
  activeShareId: string | null;
  /** Live DB order after waiter assigns to admin */
  activeOrderId: string | null;
  customerToken: string | null;
  lockedItems: LockedOrderItem[];
  orderStatus: OrderStatus | null;
  orderSnapshotItems: OrderItem[];
  orderRecords: OrderRecord[];
  activeRecordId: string | null;
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
  setActiveShareId: (id: string | null) => void;
  setActiveOrder: (payload: {
    orderId: string;
    customerToken: string;
    lockedItems: LockedOrderItem[];
    items: OrderItem[];
    status: OrderStatus;
  }) => void;
  applyOrderSnapshot: (payload: {
    items: OrderItem[];
    lockedItems?: LockedOrderItem[];
    status?: OrderStatus;
  }) => void;
  /** Snapshot wish list into the local order, then clear wish list + trash back to the deck */
  placeOrderFromWishlist: (items: OrderItem[]) => void;
  addToLocalOrder: (item: OrderItem) => void;
  clearActiveOrder: () => void;
  /** Full guest reset after payment - fresh menu session */
  resetGuestSession: () => void;
  /** Back to wishlist browsing for a new order */
  startNewOrderSession: () => void;
  updateOrderRecordShareId: (recordId: string, shareId: string) => void;
  isItemLocked: (id: string) => boolean;
  lockedQtyFor: (id: string) => number;
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
    (set, get) => ({
      wishlist: [],
      trash: [],
      searchQuery: "",
      categoryFilter: "",
      detailDishId: null,
      wishlistOpen: false,
      trashOpen: false,
      activeShareId: null,
      activeOrderId: null,
      customerToken: null,
      lockedItems: [],
      orderStatus: null,
      orderSnapshotItems: [],
      orderRecords: [],
      activeRecordId: null,
      addToWishlist: (id) =>
        set((state) => ({
          wishlist: hasWishlistId(state.wishlist, id)
            ? state.wishlist
            : [...state.wishlist, { id, qty: 1 }],
          trash: state.trash.filter((t) => t !== id),
        })),
      addToTrash: (id) =>
        set((state) => {
          if (state.activeOrderId && state.lockedItems.some((item) => item.id === id)) {
            return state;
          }
          return {
            trash: state.trash.includes(id) ? state.trash : [...state.trash, id],
            wishlist: state.wishlist.filter((w) => w.id !== id),
          };
        }),
      removeFromWishlist: (id) =>
        set((state) => {
          if (state.activeOrderId && state.lockedItems.some((item) => item.id === id)) {
            return state;
          }
          return {
            wishlist: state.wishlist.filter((w) => w.id !== id),
          };
        }),
      setWishlistQty: (id, qty) =>
        set((state) => {
          const locked = state.lockedItems.find((item) => item.id === id);
          const minQty = state.activeOrderId && locked ? locked.qty : 1;
          const nextQty = Math.max(minQty, clampQty(qty));
          return {
            wishlist: state.wishlist.map((entry) =>
              entry.id === id ? { ...entry, qty: nextQty } : entry
            ),
          };
        }),
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
          // Keep locked / live order items even if temporarily missing from menu payload
          const keep = new Set([
            ...valid,
            ...state.lockedItems.map((item) => item.id),
            ...state.orderSnapshotItems.map((item) => item.id),
            ...state.orderRecords.flatMap((r) => r.items.map((item) => item.id)),
          ]);
          return {
            wishlist: state.wishlist.filter((entry) => keep.has(entry.id)),
            trash: state.trash.filter((id) => valid.has(id)),
            detailDishId:
              state.detailDishId && keep.has(state.detailDishId)
                ? state.detailDishId
                : null,
          };
        }),
      setActiveShareId: (id) =>
        set((state) => ({
          activeShareId: id,
          orderRecords: state.activeRecordId
            ? state.orderRecords.map((record) =>
                record.id === state.activeRecordId ? { ...record, shareId: id } : record
              )
            : state.orderRecords,
        })),
      updateOrderRecordShareId: (recordId, shareId) =>
        set((state) => ({
          orderRecords: state.orderRecords.map((record) =>
            record.id === recordId ? { ...record, shareId } : record
          ),
          activeShareId: state.activeRecordId === recordId ? shareId : state.activeShareId,
        })),
      setActiveOrder: ({ orderId, customerToken, lockedItems, items, status }) =>
        set((state) => {
          const recordId =
            state.activeRecordId ??
            state.orderRecords.find((r) => r.shareId && r.shareId === state.activeShareId)?.id ??
            state.orderRecords[state.orderRecords.length - 1]?.id;
          const orderRecords = recordId
            ? state.orderRecords.map((record) =>
                record.id === recordId
                  ? {
                      ...record,
                      items,
                      lockedItems,
                      liveOrderId: orderId,
                      status,
                    }
                  : record
              )
            : state.orderRecords;
          return {
            activeOrderId: orderId,
            customerToken,
            lockedItems,
            orderStatus: status,
            orderSnapshotItems: items,
            activeRecordId: recordId ?? state.activeRecordId,
            orderRecords,
          };
        }),
      applyOrderSnapshot: ({ items, lockedItems, status }) =>
        set((state) => {
          const recordId = state.activeRecordId;
          const orderRecords = recordId
            ? state.orderRecords.map((record) =>
                record.id === recordId
                  ? {
                      ...record,
                      items,
                      lockedItems: lockedItems ?? record.lockedItems,
                      status: status ?? record.status,
                    }
                  : record
              )
            : state.orderRecords;
          return {
            orderSnapshotItems: items,
            lockedItems: lockedItems ?? state.lockedItems,
            orderStatus: status ?? state.orderStatus,
            orderRecords,
          };
        }),
      placeOrderFromWishlist: (items) =>
        set((state) => {
          const id = newOrderRecordId();
          const locked = items.map((item) => ({ id: item.id, qty: item.qty }));
          const record: OrderRecord = {
            id,
            items,
            shareId: null,
            lockedItems: locked,
            createdAt: new Date().toISOString(),
          };
          return {
            orderRecords: [...state.orderRecords, record],
            activeRecordId: id,
            orderSnapshotItems: items,
            lockedItems: locked,
            activeShareId: null,
            wishlist: [],
            trash: [],
          };
        }),
      addToLocalOrder: (item) =>
        set((state) => {
          const existing = state.orderSnapshotItems.find((row) => row.id === item.id);
          const nextItems = existing
            ? state.orderSnapshotItems.map((row) =>
                row.id === item.id
                  ? { ...row, qty: Math.min(99, row.qty + Math.max(1, item.qty)) }
                  : row
              )
            : [...state.orderSnapshotItems, { ...item, qty: Math.max(1, item.qty) }];
          const nextLocked = state.lockedItems.some((row) => row.id === item.id)
            ? state.lockedItems.map((row) =>
                row.id === item.id
                  ? { ...row, qty: nextItems.find((i) => i.id === item.id)?.qty ?? row.qty }
                  : row
              )
            : [
                ...state.lockedItems,
                { id: item.id, qty: nextItems.find((i) => i.id === item.id)?.qty ?? 1 },
              ];
          const orderRecords = state.activeRecordId
            ? state.orderRecords.map((record) =>
                record.id === state.activeRecordId
                  ? { ...record, items: nextItems, lockedItems: nextLocked }
                  : record
              )
            : state.orderRecords;
          return {
            orderSnapshotItems: nextItems,
            lockedItems: nextLocked,
            orderRecords,
            trash: state.trash.filter((tid) => tid !== item.id),
            wishlist: state.wishlist.filter((entry) => entry.id !== item.id),
          };
        }),
      clearActiveOrder: () =>
        set({
          activeOrderId: null,
          customerToken: null,
          lockedItems: [],
          orderStatus: null,
          orderSnapshotItems: [],
        }),
      resetGuestSession: () =>
        set({
          wishlist: [],
          trash: [],
          activeShareId: null,
          activeOrderId: null,
          customerToken: null,
          lockedItems: [],
          orderStatus: null,
          orderSnapshotItems: [],
          orderRecords: [],
          activeRecordId: null,
          detailDishId: null,
          wishlistOpen: false,
          trashOpen: false,
          searchQuery: "",
        }),
      startNewOrderSession: () =>
        set({
          wishlist: [],
          trash: [],
          activeShareId: null,
          activeOrderId: null,
          customerToken: null,
          lockedItems: [],
          orderStatus: null,
          orderSnapshotItems: [],
          activeRecordId: null,
          detailDishId: null,
          wishlistOpen: false,
        }),
      isItemLocked: (id) => get().lockedItems.some((item) => item.id === id),
      lockedQtyFor: (id) => get().lockedItems.find((item) => item.id === id)?.qty ?? 0,
    }),
    {
      name: "ln-kitchen-menu",
      version: 4,
      partialize: (state) => ({
        wishlist: state.wishlist,
        trash: state.trash,
        activeShareId: state.activeShareId,
        activeOrderId: state.activeOrderId,
        customerToken: state.customerToken,
        lockedItems: state.lockedItems,
        orderStatus: state.orderStatus,
        orderSnapshotItems: state.orderSnapshotItems,
        orderRecords: state.orderRecords,
        activeRecordId: state.activeRecordId,
      }),
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as {
          wishlist?: unknown;
          trash?: string[];
          activeShareId?: string | null;
          activeOrderId?: string | null;
          customerToken?: string | null;
          lockedItems?: LockedOrderItem[];
          orderStatus?: OrderStatus | null;
          orderSnapshotItems?: OrderItem[];
          orderRecords?: OrderRecord[];
          activeRecordId?: string | null;
        };
        let orderRecords = Array.isArray(state.orderRecords) ? state.orderRecords : [];
        if (version < 4 && state.orderSnapshotItems?.length && !orderRecords.length) {
          orderRecords = [
            {
              id: newOrderRecordId(),
              items: state.orderSnapshotItems,
              shareId: state.activeShareId ?? null,
              lockedItems: state.lockedItems ?? [],
              createdAt: new Date().toISOString(),
              liveOrderId: state.activeOrderId ?? null,
              status: state.orderStatus ?? null,
            },
          ];
        }
        return {
          wishlist: normalizeWishlist(state.wishlist),
          trash: Array.isArray(state.trash) ? state.trash : [],
          activeShareId: state.activeShareId ?? null,
          activeOrderId: state.activeOrderId ?? null,
          customerToken: state.customerToken ?? null,
          lockedItems: Array.isArray(state.lockedItems) ? state.lockedItems : [],
          orderStatus: state.orderStatus ?? null,
          orderSnapshotItems: Array.isArray(state.orderSnapshotItems)
            ? state.orderSnapshotItems
            : [],
          orderRecords,
          activeRecordId: state.activeRecordId ?? null,
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
  wishlist: WishlistEntry[],
  snapshotItems: OrderItem[] = []
): WishlistDish[] {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const snapById = new Map(snapshotItems.map((item) => [item.id, item]));

  return wishlist
    .map((entry) => {
      const dish = byId.get(entry.id);
      if (dish) return { ...dish, qty: entry.qty };
      const snap = snapById.get(entry.id);
      if (!snap) return null;
      return {
        id: snap.id,
        name: snap.name,
        category: snap.category,
        price: snap.price,
        currency: "NGN" as const,
        shortDescription: "",
        description: "",
        ingredients: [],
        allergens: [],
        prepTimeMin: 0,
        prepTimeMax: 0,
        estimatedCalories: 0,
        bestComboWith: "",
        image: "/images/placeholders/grill.svg",
        qty: entry.qty,
      };
    })
    .filter((d): d is WishlistDish => Boolean(d));
}

export function getTrashDishes(dishes: Dish[], trash: string[]): Dish[] {
  return trash
    .map((id) => dishes.find((d) => d.id === id))
    .filter((d): d is Dish => Boolean(d));
}
