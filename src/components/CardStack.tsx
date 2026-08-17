"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dish } from "@/types/menu";
import { hapticCardSwipe } from "@/utils/haptics";
import { CardActionButtons } from "./CardActionButtons";
import { DishCard } from "./DishCard";
import { markSwipeHintSeen } from "./SwipeHintOverlay";

interface CardStackProps {
  deck: Dish[];
  trashCount?: number;
  onWish: (dish: Dish) => void;
  onTrash: (dish: Dish) => void;
  onCardTap: (dish: Dish) => void;
  onOpenWishlist: () => void;
  onOpenTrash: () => void;
  onCurrentChange?: (dish: Dish | null) => void;
}

const SWIPE_THRESHOLD = 72;
const FLY_OFF = 420;
const PULSE_MS = 320;
const VISIBLE_BEHIND = 2;

function behindCardStyle(depth: number, dragX: number) {
  const dragProgress = Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD);

  if (depth === 1) {
    return {
      transform: `translateX(0px) scale(${0.97 + dragProgress * 0.03}) translateY(${6 * (1 - dragProgress)}px)`,
      opacity: 0.92 + dragProgress * 0.08,
    };
  }

  return {
    transform: `translateX(${depth % 2 === 0 ? -10 : 10}px) scale(${1 - depth * 0.03}) translateY(${depth * 6}px)`,
    opacity: 0.9,
  };
}

export function CardStack({
  deck,
  trashCount = 0,
  onWish,
  onTrash,
  onCardTap,
  onOpenWishlist,
  onOpenTrash,
  onCurrentChange,
}: CardStackProps) {
  const [dragX, setDragX] = useState(0);
  const [wishPulse, setWishPulse] = useState(false);
  const [rejectPulse, setRejectPulse] = useState(false);

  useEffect(() => {
    setDragX(0);
  }, [deck]);

  // Swiped cards are removed from the deck, so the next card always shifts into index 0.
  const current = deck[0] ?? null;
  const behind = deck.slice(1, 1 + VISIBLE_BEHIND);

  useEffect(() => {
    onCurrentChange?.(current);
  }, [current, onCurrentChange]);

  const advance = useCallback(() => {
    setDragX(0);
  }, []);

  const flashWish = useCallback(() => {
    setWishPulse(true);
    window.setTimeout(() => setWishPulse(false), PULSE_MS);
  }, []);

  const flashReject = useCallback(() => {
    setRejectPulse(true);
    window.setTimeout(() => setRejectPulse(false), PULSE_MS);
  }, []);

  const completeWish = useCallback(() => {
    if (!current) return;
    markSwipeHintSeen();
    onWish(current);
    advance();
  }, [current, onWish, advance]);

  const completeTrash = useCallback(() => {
    if (!current) return;
    markSwipeHintSeen();
    onTrash(current);
    advance();
  }, [current, onTrash, advance]);

  return (
    <div className="relative flex h-full min-h-[min(50vh,400px)] max-h-[min(52vh,420px)] flex-1 overflow-visible px-0">
      <CardActionButtons
        onOpenTrash={onOpenTrash}
        onOpenWishlist={onOpenWishlist}
        trashCount={trashCount}
        disabled={!current}
        dragX={dragX}
        wishPulse={wishPulse}
        rejectPulse={rejectPulse}
      />

      <div className="relative mx-14 min-h-[min(50vh,400px)] max-h-[min(52vh,420px)] w-full flex-1 overflow-visible">
        {!current ? (
          <div className="flex h-full flex-col items-center justify-center rounded-[2rem] border border-dashed border-zinc-700 px-6 text-center">
            <p className="text-lg font-bold text-white">No more dishes here</p>
            <p className="mt-2 text-sm font-normal text-zinc-500">
              Scroll categories or clear your search to discover more.
            </p>
          </div>
        ) : (
          <>
            {behind
              .map((dish, idx) => ({ dish, depth: idx + 1 }))
              .sort((a, b) => b.depth - a.depth)
              .map(({ dish, depth }) => {
                const style = behindCardStyle(depth, dragX);
                return (
                  <div
                    key={dish.id}
                    className="pointer-events-none absolute inset-0 transition-[transform,opacity] duration-75 ease-out"
                    style={{
                      ...style,
                      zIndex: 10 + (VISIBLE_BEHIND + 1 - depth),
                    }}
                  >
                    <DishCard dish={dish} interactive={false} />
                  </div>
                );
              })}

            <SwipeableCard
              key={current.id}
              dish={current}
              onSwipeWish={() => {
                flashWish();
                hapticCardSwipe();
                completeWish();
              }}
              onSwipeTrash={() => {
                flashReject();
                hapticCardSwipe();
                completeTrash();
              }}
              onTap={() => onCardTap(current)}
              onDragXChange={setDragX}
            />
          </>
        )}
      </div>
    </div>
  );
}

function SwipeableCard({
  dish,
  onSwipeWish,
  onSwipeTrash,
  onTap,
  onDragXChange,
}: {
  dish: Dish;
  onSwipeWish: () => void;
  onSwipeTrash: () => void;
  onTap: () => void;
  onDragXChange: (x: number) => void;
}) {
  const [x, setX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const xRef = useRef(0);
  const startPointer = useRef(0);
  const startX = useRef(0);
  const moved = useRef(false);
  const locked = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const setPosition = useCallback(
    (next: number) => {
      xRef.current = next;
      setX(next);
      onDragXChange(next);
    },
    [onDragXChange]
  );

  useEffect(() => {
    onDragXChange(0);
  }, [dish.id, onDragXChange]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const flyOff = (direction: "wish" | "trash", done: () => void) => {
      locked.current = true;
      setIsAnimating(true);
      setIsDragging(false);
      const target = direction === "wish" ? FLY_OFF : -FLY_OFF;
      setPosition(target);
      window.setTimeout(done, 200);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (locked.current) return;
      setIsDragging(true);
      setIsAnimating(false);
      moved.current = false;
      startPointer.current = e.clientX;
      startX.current = xRef.current;
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!el.hasPointerCapture(e.pointerId) || locked.current) return;
      const delta = e.clientX - startPointer.current;
      if (Math.abs(delta) > 4) moved.current = true;
      setPosition(startX.current + delta);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      el.releasePointerCapture(e.pointerId);
      setIsDragging(false);

      if (locked.current) return;

      const delta = e.clientX - startPointer.current;
      const finalX = startX.current + delta;

      if (finalX > SWIPE_THRESHOLD) {
        flyOff("wish", onSwipeWish);
        return;
      }
      if (finalX < -SWIPE_THRESHOLD) {
        flyOff("trash", onSwipeTrash);
        return;
      }

      if (!moved.current) {
        onTap();
      }

      setIsAnimating(true);
      setPosition(0);
      window.setTimeout(() => setIsAnimating(false), 180);
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, [onSwipeTrash, onSwipeWish, onTap, setPosition]);

  return (
    <div
      ref={cardRef}
      className="swipe-surface absolute inset-0 z-50 touch-none select-none"
      style={{
        transform: `translate3d(${x}px, 0, 0) rotate(${x * 0.035}deg)`,
        transition: isDragging || !isAnimating ? "none" : "transform 0.18s ease-out, opacity 0.18s ease-out",
        opacity: Math.abs(x) > FLY_OFF * 0.75 ? 0 : 1,
      }}
    >
      <DishCard dish={dish} interactive={false} className="shadow-[0_24px_60px_rgba(0,0,0,0.5)]" />
    </div>
  );
}
