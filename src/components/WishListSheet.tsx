"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, animate, useMotionValue, useMotionValueEvent } from "framer-motion";
import type { Dish } from "@/types/menu";
import { buildOrderShareUrl, qrImageUrl } from "@/lib/orderShare";
import { getWishlistDishes, type WishlistDish, type OrderRecord } from "@/store/menuStore";
import { formatPrice } from "@/utils/formatPrice";
import { formatPrepTime } from "@/utils/prepTime";

interface WishListSheetProps {
  open: boolean;
  dishes: WishlistDish[];
  total: number;
  onClose: () => void;
  onRemove: (id: string) => void;
  onChangeQty: (id: string, qty: number) => void;
  onSelectDish: (dish: Dish) => void;
  shareId: string | null;
  onShareId: (id: string) => void;
  orderLive?: boolean;
  lockedItemIds?: string[];
  lockedQtyById?: Record<string, number>;
  /** Which screen to show when the sheet opens */
  initialView?: "list" | "order" | "history" | "record";
  orderRecords?: OrderRecord[];
  menuDishes?: Dish[];
  viewingRecordId?: string | null;
  onViewRecord?: (recordId: string) => void;
  onBackToHistory?: () => void;
  onShareIdForRecord?: (recordId: string, shareId: string) => void;
  onNewOrder?: () => void;
  /** Called when guest swipes to place the order. Throw to keep the wish list open. */
  onPlaceOrder?: () => void | Promise<void>;
  placeError?: string;
  serviceNote?: string;
}

const SWIPE_THRESHOLD = 0.72;
const THUMB_WIDTH = 112;
const POP_SPRING = { type: "spring" as const, stiffness: 300, damping: 13, mass: 0.45 };
const SETTLE_SPRING = { type: "spring" as const, stiffness: 420, damping: 26, mass: 0.58 };

function SwipeChevronHint({ visible }: { visible: boolean }) {
  return (
    <div
      className={`ios-swipe-chevron-hint pointer-events-none absolute inset-y-0 right-4 z-[1] flex items-center gap-0.5 ${visible ? "" : "ios-swipe-chevron-hint--hidden"}`}
      aria-hidden
    >
      <span className="ios-swipe-shimmer">›</span>
      <span className="ios-swipe-shimmer ios-swipe-shimmer--delay-1">›</span>
      <span className="ios-swipe-shimmer ios-swipe-shimmer--delay-2">›</span>
    </div>
  );
}

function SwipeToOrderBar({
  disabled,
  onComplete,
}: {
  disabled?: boolean;
  onComplete: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const maxOffsetRef = useRef(0);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const offset = useMotionValue(0);
  const touchPop = useMotionValue(1);
  const [showChevrons, setShowChevrons] = useState(true);

  useMotionValueEvent(offset, "change", (value) => {
    if (value > 1) {
      setShowChevrons(false);
    }
  });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, track.clientWidth - THUMB_WIDTH - 8);
    maxOffsetRef.current = next;
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const popOnTouch = useCallback(() => {
    touchPop.set(1);
    animate(touchPop, 1.14, POP_SPRING);
  }, [touchPop]);

  const settleTouch = useCallback(() => {
    animate(touchPop, 1, SETTLE_SPRING);
  }, [touchPop]);

  const snapTo = useCallback(
    (target: number, onDone?: () => void) => {
      const controls = animate(offset, target, {
        type: "spring",
        stiffness: 480,
        damping: 30,
        mass: 0.72,
      });
      if (onDone) controls.then(onDone);
      return controls;
    },
    [offset]
  );

  const finishDrag = useCallback(() => {
    const current = offset.get();
    const max = maxOffsetRef.current;
    const clamped = Math.min(current, max);
    if (clamped !== current) {
      offset.set(clamped);
    }
    const progress = max > 0 ? clamped / max : 0;

    if (progress >= SWIPE_THRESHOLD) {
      offset.set(0);
      touchPop.set(1);
      onComplete();
      return;
    }
    settleTouch();
    snapTo(0, () => setShowChevrons(true));
  }, [onComplete, offset, settleTouch, snapTo, touchPop]);

  useEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble || disabled) return;

    const onPointerDown = (e: PointerEvent) => {
      measure();
      popOnTouch();
      startX.current = e.clientX;
      startOffset.current = offset.get();
      bubble.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!bubble.hasPointerCapture(e.pointerId)) return;
      const delta = e.clientX - startX.current;
      const raw = startOffset.current + delta;
      const max = maxOffsetRef.current;
      let next = raw;
      if (raw > max) {
        next = max + (raw - max) * 0.28;
      } else {
        next = Math.max(0, raw);
      }
      offset.set(next);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!bubble.hasPointerCapture(e.pointerId)) return;
      bubble.releasePointerCapture(e.pointerId);
      finishDrag();
    };

    bubble.addEventListener("pointerdown", onPointerDown);
    bubble.addEventListener("pointermove", onPointerMove);
    bubble.addEventListener("pointerup", onPointerUp);
    bubble.addEventListener("pointercancel", onPointerUp);

    return () => {
      bubble.removeEventListener("pointerdown", onPointerDown);
      bubble.removeEventListener("pointermove", onPointerMove);
      bubble.removeEventListener("pointerup", onPointerUp);
      bubble.removeEventListener("pointercancel", onPointerUp);
    };
  }, [disabled, finishDrag, measure, offset, popOnTouch]);

  return (
    <div className="ios-swipe-order-host py-2">
      <div
        ref={trackRef}
        className={`ios-glass-track relative h-14 overflow-visible rounded-full ${disabled ? "opacity-40" : ""}`}
      >
        {!disabled && <SwipeChevronHint visible={showChevrons} />}

        <motion.div
          ref={bubbleRef}
          className={`ios-liquid-bubble absolute left-1 z-[2] touch-none select-none rounded-full ${disabled ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"}`}
          style={{
            width: THUMB_WIDTH,
            x: offset,
            scale: touchPop,
            transformOrigin: "center center",
          }}
        >
          <div className="ios-liquid-bubble__label">
            <span className="ios-swipe-shimmer shrink-0">Order</span>
            <span className="ios-swipe-shimmer ios-swipe-shimmer--delay-1 shrink-0 text-base leading-none">
              →
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function OrderSummaryTable({
  dishes,
  total,
  shareId,
  onShareId,
  orderLive,
  orderLabel,
}: {
  dishes: WishlistDish[];
  total: number;
  shareId: string | null;
  onShareId: (id: string) => void;
  orderLive: boolean;
  orderLabel?: string;
}) {
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState("");
  const itemsKey = useMemo(
    () => dishes.map((d) => `${d.id}:${d.qty}`).join("|"),
    [dishes]
  );

  useEffect(() => {
    if (!dishes.length) {
      setShareUrl("");
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setShareError("");
      try {
        if (shareId) {
          // Keep the same QR after first create; update payload until order is assigned
          if (!orderLive) {
            await fetch(`/api/order-shares/${encodeURIComponent(shareId)}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: dishes.map((d) => ({ id: d.id, qty: d.qty })),
              }),
            });
          }
          if (!cancelled) {
            setShareUrl(buildOrderShareUrl(window.location.origin, shareId));
          }
          return;
        }

        const res = await fetch("/api/order-shares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: dishes.map((d) => ({ id: d.id, qty: d.qty })),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.id) {
          throw new Error(data.error ?? "Could not create QR link");
        }
        if (!cancelled) {
          onShareId(data.id as string);
          setShareUrl(buildOrderShareUrl(window.location.origin, data.id as string));
        }
      } catch (e) {
        if (!cancelled) {
          setShareUrl("");
          setShareError(e instanceof Error ? e.message : "Could not create QR link");
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, shareId, orderLive]);

  const qrSrc = useMemo(
    () => (shareUrl ? qrImageUrl(shareUrl, 220) : ""),
    [shareUrl]
  );

  return (
    <div className="overflow-hidden rounded-2xl bg-white text-black shadow-sm ring-1 ring-zinc-200/80">
      <div className="flex flex-col items-center gap-3 px-4 pb-3 pt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          {orderLabel ?? (orderLive ? "Live order" : "Your order")}
        </p>
        {qrSrc ? (
          <div className="rounded-2xl bg-white p-2 shadow-inner ring-1 ring-zinc-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt="Scan for waiter"
              width={168}
              height={168}
              className="h-[168px] w-[168px]"
            />
          </div>
        ) : (
          <div className="flex h-[168px] w-[168px] items-center justify-center rounded-2xl bg-zinc-100 text-center text-xs font-medium text-zinc-500">
            {shareError ? "QR unavailable" : "Preparing QR…"}
          </div>
        )}
        <p className="text-center text-[11px] text-zinc-500">
          {orderLive ? "Kitchen is updating this order live" : "Show QR to your waiter"}
        </p>
        {shareError ? <p className="text-center text-[10px] text-red-500">{shareError}</p> : null}
      </div>

      <div className="border-t border-zinc-100 px-3 py-2">
        <ul className="divide-y divide-zinc-100">
          {dishes.map((dish, index) => (
            <li key={dish.id} className="flex items-center justify-between gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-zinc-900">
                  {index + 1}. {dish.name}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {dish.category} · Qty {dish.qty}
                </p>
              </div>
              <p className="shrink-0 text-sm font-extrabold text-green-600">
                {formatPrice(dish.price * dish.qty)}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-1 flex items-center justify-between border-t border-zinc-200 pt-3 pb-1">
          <span className="text-sm font-bold text-zinc-700">Total</span>
          <span className="text-lg font-extrabold text-green-600">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
}

function QtyStepper({
  qty,
  minQty = 1,
  onChange,
}: {
  qty: number;
  minQty?: number;
  onChange: (qty: number) => void;
}) {
  const floor = Math.max(1, minQty);
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-zinc-100 p-0.5">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(qty - 1)}
        disabled={qty <= floor}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-zinc-700 disabled:opacity-40"
      >
        −
      </button>
      <input
        type="number"
        min={floor}
        max={99}
        value={qty}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-7 bg-transparent text-center text-xs font-extrabold text-black outline-none"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(qty + 1)}
        disabled={qty >= 99}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-zinc-700 disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

export function WishListSheet({
  open,
  dishes,
  total,
  onClose,
  onRemove,
  onChangeQty,
  onSelectDish,
  shareId,
  onShareId,
  orderLive = false,
  lockedItemIds = [],
  lockedQtyById = {},
  initialView = "list",
  orderRecords = [],
  menuDishes = [],
  viewingRecordId = null,
  onViewRecord,
  onBackToHistory,
  onShareIdForRecord,
  onNewOrder,
  onPlaceOrder,
  placeError,
  serviceNote,
}: WishListSheetProps) {
  const [view, setView] = useState<"list" | "order" | "history" | "record">(initialView);
  const lockedSet = useMemo(() => new Set(lockedItemIds), [lockedItemIds]);

  const viewingRecord = useMemo(
    () => orderRecords.find((r) => r.id === viewingRecordId) ?? null,
    [orderRecords, viewingRecordId]
  );

  useEffect(() => {
    if (open) setView(initialView);
  }, [open, initialView]);

  const recordDishes = useMemo(() => {
    if (!viewingRecord) return [];
    return getWishlistDishes(
      menuDishes,
      viewingRecord.items.map((item) => ({ id: item.id, qty: item.qty })),
      viewingRecord.items
    );
  }, [viewingRecord, menuDishes]);

  const recordTotal = useMemo(
    () => recordDishes.reduce((sum, d) => sum + d.price * d.qty, 0),
    [recordDishes]
  );

  const isCurrentOrderView = view === "order";
  const isHistoryView = view === "history";
  const isRecordView = view === "record";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close wish list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88vh] max-w-[430px] flex-col rounded-t-[2rem] bg-[#111111] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          >
            <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-zinc-800 px-4 py-3">
              {isRecordView ? (
                <button
                  type="button"
                  onClick={() => {
                    onBackToHistory?.();
                    setView("history");
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-green-400"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Back
                </button>
              ) : isHistoryView ? (
                <div className="w-12" />
              ) : view === "order" ? (
                initialView === "order" && !isHistoryView ? (
                  <div className="w-12" />
                ) : (
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className="flex items-center gap-1 text-xs font-semibold text-green-400"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back
                  </button>
                )
              ) : (
                <div className="col-span-2">
                  <h2 className="text-base font-extrabold text-white">My Wish List</h2>
                  <p className="text-[11px] font-normal text-zinc-500">
                    {orderLive
                      ? "Add more anytime · ask waiter to remove locked dishes"
                      : "Set quantities · swipe to order when ready"}
                  </p>
                </div>
              )}
              {isHistoryView && (
                <h2 className="text-center text-base font-extrabold text-white">My Orders</h2>
              )}
              {isCurrentOrderView && (
                <h2 className="text-center text-base font-extrabold text-white">
                  {orderLive ? "My Orders" : "Your order"}
                </h2>
              )}
              {isRecordView && (
                <h2 className="text-center text-base font-extrabold text-white">Order details</h2>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`text-xs font-medium text-zinc-400 ${view === "list" ? "" : "justify-self-end"}`}
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2.5">
              {isHistoryView ? (
                <ul className="space-y-2 pb-2">
                  {[...orderRecords].reverse().map((record, index) => {
                    const itemCount = record.items.reduce((s, i) => s + i.qty, 0);
                    const total = record.items.reduce(
                      (s, i) => s + i.price * i.qty,
                      0
                    );
                    const when = new Date(record.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <li key={record.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onViewRecord?.(record.id);
                            setView("record");
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-3 text-left"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-black">
                              Order {orderRecords.length - index}
                            </p>
                            <p className="mt-0.5 text-[11px] text-zinc-500">
                              {itemCount} dish{itemCount === 1 ? "" : "es"} · {when}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-extrabold text-green-600">
                              {formatPrice(total)}
                            </p>
                            <p className="text-[10px] font-semibold text-zinc-400">View →</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : isRecordView && viewingRecord ? (
                <div className="space-y-3 pb-2">
                  <OrderSummaryTable
                    dishes={recordDishes}
                    total={recordTotal}
                    shareId={viewingRecord.shareId}
                    onShareId={(id) => onShareIdForRecord?.(viewingRecord.id, id)}
                    orderLive={Boolean(viewingRecord.liveOrderId)}
                    orderLabel={`Order ${orderRecords.findIndex((r) => r.id === viewingRecord.id) + 1}`}
                  />
                </div>
              ) : isCurrentOrderView ? (
                <div className="space-y-2.5">
                  {serviceNote ? (
                    <p className="rounded-xl bg-green-500/15 px-3 py-2 text-center text-xs font-semibold text-green-300">
                      {serviceNote}
                    </p>
                  ) : null}
                  <OrderSummaryTable
                    dishes={dishes}
                    total={total}
                    shareId={shareId}
                    onShareId={onShareId}
                    orderLive={orderLive}
                  />
                  {onNewOrder ? (
                    <div className="pb-2">
                      <button
                        type="button"
                        onClick={onNewOrder}
                        className="w-full rounded-xl border border-zinc-600 bg-zinc-800/80 px-3 py-2.5 text-xs font-bold text-zinc-200"
                      >
                        New order
                      </button>
                    </div>
                  ) : null}
                  {orderLive ? (
                    <p className="px-1 text-center text-[10px] leading-snug text-zinc-500">
                      Need more dishes? Ask your waiter to add them. To change or remove items, ask your waiter.
                    </p>
                  ) : null}
                </div>
              ) : dishes.length === 0 ? (
                <p className="py-8 text-center text-xs font-normal text-zinc-500">
                  Swipe right on dishes to add them here.
                </p>
              ) : (
                <ul className="space-y-2">
                  {dishes.map((dish) => {
                    const locked = lockedSet.has(dish.id);
                    const minQty = lockedQtyById[dish.id] ?? 1;
                    return (
                      <li key={dish.id} className="flex items-center gap-2.5 rounded-xl bg-white p-2.5">
                        <button
                          type="button"
                          onClick={() => onSelectDish(dish)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                        >
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-200">
                            <Image
                              src={dish.image}
                              alt={dish.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold text-black">{dish.name}</p>
                            <p className="text-[10px] font-normal text-zinc-500">
                              {formatPrepTime(dish.prepTimeMin, dish.prepTimeMax)}
                              {locked ? " · locked" : ""}
                            </p>
                            <p className="text-xs font-extrabold text-green-600">
                              {formatPrice(dish.price)}
                              {dish.qty > 1 ? (
                                <span className="font-semibold text-zinc-500">
                                  {" "}
                                  × {dish.qty}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </button>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {locked ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-700">
                              Ask waiter
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onRemove(dish.id)}
                              className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold text-red-500"
                            >
                              Remove
                            </button>
                          )}
                          <QtyStepper
                            qty={dish.qty}
                            minQty={locked ? minQty : 1}
                            onChange={(qty) => onChangeQty(dish.id, qty)}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {view === "list" && (
              <div className="overflow-visible border-t border-zinc-800 px-4 pt-3 pb-4">
                {placeError ? (
                  <p className="mb-2 text-center text-xs font-semibold text-red-400">{placeError}</p>
                ) : null}
                <div className="mb-2.5 flex items-center justify-between rounded-xl bg-white px-3 py-2.5">
                  <span className="text-xs font-semibold text-zinc-600">Total</span>
                  <span className="text-lg font-extrabold text-black">{formatPrice(total)}</span>
                </div>
                <SwipeToOrderBar
                  disabled={dishes.length === 0}
                  onComplete={() => {
                    void Promise.resolve(onPlaceOrder?.())
                      .then(() => setView("order"))
                      .catch(() => undefined);
                  }}
                />
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
