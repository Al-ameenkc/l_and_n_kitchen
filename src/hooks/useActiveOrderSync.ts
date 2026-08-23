"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  isOrderPaid,
  type LockedOrderItem,
  type OrderItem,
  type OrderStatus,
} from "@/lib/orders-db";
import { useMenuStore } from "@/store/menuStore";

type LiveOrderPayload = {
  id: string;
  items: OrderItem[];
  locked_items?: LockedOrderItem[];
  status: OrderStatus;
  customer_token?: string | null;
};

type MenuDish = { id: string; name: string; category: string; price: number };

async function fetchShare(shareId: string) {
  const res = await fetch(`/api/order-shares/${encodeURIComponent(shareId)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<{
    order?: LiveOrderPayload & { customer_token?: string | null };
    customer_token?: string | null;
    order_id?: string | null;
    items?: { id: string; qty: number }[];
    locked_items?: LockedOrderItem[];
    status?: OrderStatus;
  }>;
}

async function fetchOrder(orderId: string, token: string) {
  const res = await fetch(
    `/api/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(token)}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  return res.json() as Promise<LiveOrderPayload>;
}

/**
 * Polls the live admin order once the waiter assigns it.
 * Wishlist stays independent — order adds go only to the order.
 */
export function useActiveOrderSync(allDishes: MenuDish[]) {
  const {
    activeShareId,
    activeOrderId,
    customerToken,
    lockedItems,
    setActiveOrder,
    applyOrderSnapshot,
    resetGuestSession,
  } = useMenuStore();

  const dishesRef = useRef(allDishes);
  dishesRef.current = allDishes;

  const ingestOrder = useCallback(
    (order: LiveOrderPayload, token?: string | null) => {
      if (isOrderPaid(order.status)) {
        resetGuestSession();
        return;
      }
      const nextToken = token || customerToken;
      if (!nextToken) return;
      setActiveOrder({
        orderId: order.id,
        customerToken: nextToken,
        lockedItems: order.locked_items ?? lockedItems,
        items: order.items,
        status: order.status,
      });
    },
    [customerToken, lockedItems, resetGuestSession, setActiveOrder]
  );

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (activeOrderId && customerToken) {
        const order = await fetchOrder(activeOrderId, customerToken);
        if (cancelled || !order) return;
        if (isOrderPaid(order.status)) {
          resetGuestSession();
          return;
        }
        applyOrderSnapshot({
          items: order.items,
          lockedItems: order.locked_items,
          status: order.status,
        });
        return;
      }

      if (!activeShareId) return;
      const share = await fetchShare(activeShareId);
      if (cancelled || !share) return;

      const shareStatus = share.order?.status ?? share.status;
      if (isOrderPaid(shareStatus)) {
        resetGuestSession();
        return;
      }

      if (share.order?.id && (share.customer_token || share.order.customer_token)) {
        ingestOrder(share.order, share.customer_token || share.order.customer_token);
        return;
      }

      if (share.order_id && share.customer_token) {
        const order = await fetchOrder(share.order_id, share.customer_token);
        if (!cancelled && order) {
          ingestOrder(order, share.customer_token);
        }
      }
    };

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    activeOrderId,
    activeShareId,
    applyOrderSnapshot,
    customerToken,
    ingestOrder,
    resetGuestSession,
  ]);

  const addDishToOrder = useCallback(
    async (dish: MenuDish, qty = 1) => {
      const { activeOrderId: orderId, customerToken: token } = useMenuStore.getState();
      if (!orderId || !token) return false;

      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-order-token": token,
        },
        body: JSON.stringify({
          action: "add",
          token,
          item: {
            id: dish.id,
            name: dish.name,
            category: dish.category,
            price: dish.price,
            qty,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) return false;

      applyOrderSnapshot({
        items: data.items,
        lockedItems: data.locked_items,
        status: data.status,
      });
      return true;
    },
    [applyOrderSnapshot]
  );

  return { addDishToOrder };
}
