"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dish } from "@/types/menu";
import { hapticCardSwipe, hapticCategorySnap } from "@/utils/haptics";
import { CardActionButtons } from "./CardActionButtons";
import { DishCard } from "./DishCard";

interface CardStackProps {
  deck: Dish[];
  trashCount?: number;
  onWish: (dish: Dish) => void;
  onTrash: (dish: Dish) => void;
  onCardTap: (dish: Dish) => void;
  onOpenWishlist: () => void;
  onOpenTrash: () => void;
  onDismissOnboarding?: () => void;
  onCurrentChange?: (dish: Dish | null) => void;
}

const SWIPE_THRESHOLD = 72;
const FLY_OFF = 420;
const PULSE_MS = 320;
const VISIBLE_BEHIND = 2;
const AXIS_LOCK_PX = 6;
const WHEEL_STEP_DEG = 30;
const WHEEL_STEP_RAD = (WHEEL_STEP_DEG * Math.PI) / 180;
const WHEEL_GAP_PX = -20;
const SNAP_MS = 380;
const MOMENTUM_MS = 300;
const RUBBER_BAND = 0.3;
const WHEEL_DELTA_STEP = 40;
const HINT_DELAY_MS = 900;
const HINT_MOVE_MS = 650;
const HINT_PAUSE_MS = 450;

let scrollHintPlayed = false;

// Radius where adjacent cards' facing edges sit exactly WHEEL_GAP_PX apart.
function wheelRadius(height: number) {
  return ((height / 2) * (1 + Math.cos(WHEEL_STEP_RAD)) + WHEEL_GAP_PX) / Math.sin(WHEEL_STEP_RAD);
}

function dragPerItem(height: number) {
  return wheelRadius(height) * Math.sin(WHEEL_STEP_RAD);
}

function wheelItemStyle(rel: number, height: number) {
  const angle = Math.max(-90, Math.min(90, rel * WHEEL_STEP_DEG));
  const rad = (angle * Math.PI) / 180;
  const radius = wheelRadius(height);
  return {
    transform: `perspective(1200px) translate3d(0, ${radius * Math.sin(rad)}px, ${radius * (Math.cos(rad) - 1)}px) rotateX(${-angle}deg)`,
    opacity: Math.max(0, Math.cos(rad) * 1.15 - 0.15),
    zIndex: 100 - Math.round(Math.abs(rel) * 10),
  };
}

function behindCardStyle(depth: number, dragX: number) {
  const dragProgress = Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD);
  const tilt = depth % 2 === 0 ? -5.5 : 5.5;

  if (depth === 1) {
    return {
      transform: `translateX(${8 * (1 - dragProgress)}px) rotate(${tilt * (1 - dragProgress * 0.55)}deg) scale(${0.94 + dragProgress * 0.06}) translateY(${10 * (1 - dragProgress)}px)`,
      opacity: 0.88 + dragProgress * 0.12,
    };
  }

  return {
    transform: `translateX(${depth % 2 === 0 ? -16 : 16}px) rotate(${tilt}deg) scale(${1 - depth * 0.045}) translateY(${depth * 10}px)`,
    opacity: 0.82,
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
  onDismissOnboarding,
  onCurrentChange,
}: CardStackProps) {
  const [dragX, setDragX] = useState(0);
  const [wishPulse, setWishPulse] = useState(false);
  const [rejectPulse, setRejectPulse] = useState(false);
  const [index, setIndex] = useState(0);
  const [wheelOffset, setWheelOffset] = useState(0);
  const [wheelMode, setWheelMode] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [cardHeight, setCardHeight] = useState(400);
  const areaRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const snappingRef = useRef(false);
  const lastTickRef = useRef(0);
  const wheelAccumRef = useRef(0);

  const maxIndex = Math.max(0, deck.length - 1);
  // Swiped cards are removed from the deck, so the next card shifts into the same index.
  const safeIndex = Math.min(index, maxIndex);
  indexRef.current = safeIndex;

  useEffect(() => {
    setDragX(0);
  }, [deck]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.height > 0) setCardHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const current = deck[safeIndex] ?? null;
  const behind = deck.slice(safeIndex + 1, safeIndex + 1 + VISIBLE_BEHIND);
  const wheelPos = safeIndex + wheelOffset;
  const [transitionMs, setTransitionMs] = useState(SNAP_MS);

  const hasMultiple = deck.length > 1;

  useEffect(() => {
    if (scrollHintPlayed || !hasMultiple) return;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    at(HINT_DELAY_MS, () => {
      scrollHintPlayed = true;
      snappingRef.current = true;
      setTransitionMs(HINT_MOVE_MS);
      setWheelMode(true);
      setSnapping(true);
      setWheelOffset(0);
    });
    at(HINT_DELAY_MS + 40, () => setWheelOffset(1));
    at(HINT_DELAY_MS + 40 + HINT_MOVE_MS + HINT_PAUSE_MS, () => setWheelOffset(0));
    at(HINT_DELAY_MS + 40 + HINT_MOVE_MS * 2 + HINT_PAUSE_MS, () => {
      setWheelOffset(0);
      setSnapping(false);
      setWheelMode(false);
      setTransitionMs(SNAP_MS);
      snappingRef.current = false;
    });

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      if (snappingRef.current) {
        setWheelOffset(0);
        setSnapping(false);
        setWheelMode(false);
        setTransitionMs(SNAP_MS);
        snappingRef.current = false;
      }
    };
  }, [hasMultiple]);

  const snapTo = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(maxIndex, target));
      snappingRef.current = true;
      setWheelMode(true);
      setSnapping(true);
      setWheelOffset(clamped - indexRef.current);
      if (clamped !== lastTickRef.current) {
        lastTickRef.current = clamped;
        hapticCategorySnap();
      }
      window.setTimeout(() => {
        setIndex(clamped);
        setWheelOffset(0);
        setSnapping(false);
        setWheelMode(false);
        snappingRef.current = false;
      }, SNAP_MS);
    },
    [maxIndex]
  );

  const handleVerticalStart = useCallback(() => {
    lastTickRef.current = indexRef.current;
    setSnapping(false);
    setWheelMode(true);
  }, []);

  const handleVerticalMove = useCallback(
    (dy: number) => {
      const raw = indexRef.current - dy / dragPerItem(cardHeight);
      let pos = raw;
      if (raw < 0) pos = raw * RUBBER_BAND;
      else if (raw > maxIndex) pos = maxIndex + (raw - maxIndex) * RUBBER_BAND;
      setWheelOffset(pos - indexRef.current);
      const nearest = Math.max(0, Math.min(maxIndex, Math.round(pos)));
      if (nearest !== lastTickRef.current) {
        lastTickRef.current = nearest;
        hapticCategorySnap();
      }
    },
    [cardHeight, maxIndex]
  );

  const handleVerticalEnd = useCallback(
    (dy: number, velocityY: number) => {
      const start = indexRef.current;
      const projected = start - (dy + velocityY * MOMENTUM_MS) / dragPerItem(cardHeight);
      let target = Math.round(projected);
      if (target === start && Math.abs(projected - start) > 0.2) {
        target = start + Math.sign(projected - start);
      }
      snapTo(target);
    },
    [cardHeight, snapTo]
  );

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      if (snappingRef.current) return;
      wheelAccumRef.current += e.deltaY;
      if (Math.abs(wheelAccumRef.current) < WHEEL_DELTA_STEP) return;
      const step = Math.sign(wheelAccumRef.current);
      wheelAccumRef.current = 0;
      snapTo(indexRef.current + step);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [snapTo]);

  const wheelItems = wheelMode
    ? deck
        .map((dish, i) => ({ dish, rel: i - wheelPos }))
        .filter(({ rel }) => Math.abs(rel) <= 2.5)
    : [];

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
    onDismissOnboarding?.();
    onWish(current);
    advance();
  }, [current, onDismissOnboarding, onWish, advance]);

  const completeTrash = useCallback(() => {
    if (!current) return;
    onDismissOnboarding?.();
    onTrash(current);
    advance();
  }, [current, onDismissOnboarding, onTrash, advance]);

  return (
    <div className="relative flex h-full min-h-[min(60vh,520px)] max-h-[min(66vh,580px)] flex-1 overflow-visible px-0" data-walkthrough="deck">
      <CardActionButtons
        onOpenTrash={onOpenTrash}
        onOpenWishlist={onOpenWishlist}
        trashCount={trashCount}
        disabled={!current}
        dragX={dragX}
        wishPulse={wishPulse}
        rejectPulse={rejectPulse}
      />

      <div
        ref={areaRef}
        className="relative mx-14 min-h-[min(60vh,520px)] max-h-[min(66vh,580px)] w-full flex-1 overflow-visible"
      >
        {wheelMode && (
          <div
            className="pointer-events-none absolute inset-x-0 -top-[30%] -bottom-[30%] z-40"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
            }}
          >
            <div
              className="absolute inset-x-0 top-[18.75%] bottom-[18.75%]"
              style={{ transformStyle: "flat" }}
            >
              {wheelItems.map(({ dish, rel }) => (
                <div
                  key={dish.id}
                  className="absolute inset-0"
                  style={{
                    ...wheelItemStyle(rel, cardHeight),
                    transition: snapping
                      ? `transform ${transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${transitionMs}ms ease-out`
                      : "none",
                    backfaceVisibility: "hidden",
                  }}
                >
                  <DishCard
                    dish={dish}
                    interactive={false}
                    className={Math.abs(rel) < 0.5 ? "shadow-[0_24px_60px_rgba(0,0,0,0.5)]" : undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

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
                      ...(wheelMode ? { opacity: 0 } : null),
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
              hidden={wheelMode}
              blocked={snapping}
              onVerticalStart={handleVerticalStart}
              onVerticalMove={handleVerticalMove}
              onVerticalEnd={handleVerticalEnd}
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
  hidden,
  blocked,
  onVerticalStart,
  onVerticalMove,
  onVerticalEnd,
}: {
  dish: Dish;
  onSwipeWish: () => void;
  onSwipeTrash: () => void;
  onTap: () => void;
  onDragXChange: (x: number) => void;
  hidden: boolean;
  blocked: boolean;
  onVerticalStart: () => void;
  onVerticalMove: (dy: number) => void;
  onVerticalEnd: (dy: number, velocityY: number) => void;
}) {
  const [x, setX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const xRef = useRef(0);
  const startPointer = useRef(0);
  const startPointerY = useRef(0);
  const startX = useRef(0);
  const moved = useRef(false);
  const locked = useRef(false);
  const axis = useRef<"x" | "y" | null>(null);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const velocityY = useRef(0);
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
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
      if (locked.current || blockedRef.current) return;
      setIsDragging(true);
      setIsAnimating(false);
      moved.current = false;
      axis.current = null;
      startPointer.current = e.clientX;
      startPointerY.current = e.clientY;
      lastY.current = e.clientY;
      lastT.current = e.timeStamp;
      velocityY.current = 0;
      startX.current = xRef.current;
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!el.hasPointerCapture(e.pointerId) || locked.current) return;
      const delta = e.clientX - startPointer.current;
      const deltaY = e.clientY - startPointerY.current;

      if (!axis.current) {
        if (Math.max(Math.abs(delta), Math.abs(deltaY)) < AXIS_LOCK_PX) return;
        moved.current = true;
        axis.current = Math.abs(delta) >= Math.abs(deltaY) ? "x" : "y";
        if (axis.current === "y") onVerticalStart();
      }

      if (axis.current === "y") {
        const dt = e.timeStamp - lastT.current;
        if (dt > 0) {
          const instant = (e.clientY - lastY.current) / dt;
          velocityY.current = velocityY.current * 0.6 + instant * 0.4;
        }
        lastY.current = e.clientY;
        lastT.current = e.timeStamp;
        onVerticalMove(deltaY);
        return;
      }

      setPosition(startX.current + delta);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      el.releasePointerCapture(e.pointerId);
      setIsDragging(false);

      if (locked.current) return;

      if (axis.current === "y") {
        axis.current = null;
        const stale = e.timeStamp - lastT.current > 80;
        onVerticalEnd(e.clientY - startPointerY.current, stale ? 0 : velocityY.current);
        return;
      }
      axis.current = null;

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
  }, [onSwipeTrash, onSwipeWish, onTap, setPosition, onVerticalStart, onVerticalMove, onVerticalEnd]);

  return (
    <div
      ref={cardRef}
      className="swipe-surface absolute inset-0 z-50 touch-none select-none"
      style={{
        transform: `translate3d(${x}px, 0, 0) rotate(${x * 0.035}deg)`,
        transition: isDragging || !isAnimating ? "none" : "transform 0.18s ease-out, opacity 0.18s ease-out",
        opacity: hidden || Math.abs(x) > FLY_OFF * 0.75 ? 0 : 1,
      }}
    >
      <DishCard dish={dish} interactive={false} className="shadow-[0_24px_60px_rgba(0,0,0,0.5)]" />
    </div>
  );
}
