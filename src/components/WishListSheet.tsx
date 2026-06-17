"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, animate, useMotionValue, useMotionValueEvent } from "framer-motion";
import type { Dish } from "@/types/menu";
import { formatPrice } from "@/utils/formatPrice";
import { formatPrepTime } from "@/utils/prepTime";

interface WishListSheetProps {
  open: boolean;
  dishes: Dish[];
  total: number;
  onClose: () => void;
  onRemove: (id: string) => void;
  onSelectDish: (dish: Dish) => void;
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

function OrderSummaryTable({ dishes, total }: { dishes: Dish[]; total: number }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white text-black">
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
          L&amp;N Kitchen — Order summary
        </p>
        <p className="mt-1 text-center text-xs text-zinc-400">Show this table to your waiter</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-2 py-3 font-semibold">Dish</th>
              <th className="px-4 py-3 text-right font-semibold">Price</th>
            </tr>
          </thead>
          <tbody>
            {dishes.map((dish, index) => (
              <tr key={dish.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3 font-medium text-zinc-500">{index + 1}</td>
                <td className="px-2 py-3">
                  <p className="font-bold leading-tight">{dish.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{dish.category}</p>
                </td>
                <td className="px-4 py-3 text-right font-extrabold">{formatPrice(dish.price)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-50">
              <td colSpan={2} className="px-4 py-4 text-base font-extrabold">
                Total
              </td>
              <td className="px-4 py-4 text-right text-lg font-extrabold text-green-600">
                {formatPrice(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export function WishListSheet({
  open,
  dishes,
  total,
  onClose,
  onRemove,
  onSelectDish,
}: WishListSheetProps) {
  const [view, setView] = useState<"list" | "order">("list");

  useEffect(() => {
    if (!open) setView("list");
  }, [open]);

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
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85vh] max-w-[430px] flex-col rounded-t-[2rem] bg-[#111111]"
          >
            <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-zinc-800 px-5 py-4">
              {view === "order" ? (
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="flex items-center gap-1 text-sm font-semibold text-green-400"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Back
                </button>
              ) : (
                <div className="col-span-2">
                  <h2 className="text-lg font-extrabold text-white">My Wish List</h2>
                  <p className="text-xs font-normal text-zinc-500">
                    Tap a dish for details · swipe to order when ready
                  </p>
                </div>
              )}
              {view === "order" && (
                <h2 className="text-center text-lg font-extrabold text-white">Your order</h2>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`text-sm font-medium text-zinc-400 ${view === "list" ? "" : "justify-self-end"}`}
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {view === "order" ? (
                <OrderSummaryTable dishes={dishes} total={total} />
              ) : dishes.length === 0 ? (
                <p className="py-8 text-center text-sm font-normal text-zinc-500">
                  Swipe right on dishes to add them here.
                </p>
              ) : (
                <ul className="space-y-3">
                  {dishes.map((dish) => (
                    <li key={dish.id} className="flex items-center gap-3 rounded-2xl bg-white p-3">
                      <button
                        type="button"
                        onClick={() => onSelectDish(dish)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-200">
                          <Image
                            src={dish.image}
                            alt={dish.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-black">{dish.name}</p>
                          <p className="text-xs font-normal text-zinc-500">
                            {formatPrepTime(dish.prepTimeMin, dish.prepTimeMax)}
                          </p>
                          <p className="text-sm font-extrabold text-green-600">
                            {formatPrice(dish.price)}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(dish.id)}
                        className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-red-500"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {view === "list" && (
              <div className="overflow-visible border-t border-zinc-800 px-5 pt-4 pb-2">
                <div className="mb-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span className="text-sm font-semibold text-zinc-600">Total</span>
                  <span className="text-2xl font-extrabold text-black">{formatPrice(total)}</span>
                </div>
                <SwipeToOrderBar
                  disabled={dishes.length === 0}
                  onComplete={() => setView("order")}
                />
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
