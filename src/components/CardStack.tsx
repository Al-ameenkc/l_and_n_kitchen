"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import type { Dish } from "@/types/menu";
import { hapticCardSwipe } from "@/utils/haptics";
import { CardActionButtons } from "./CardActionButtons";
import { DishCard } from "./DishCard";

interface CardStackProps {
  deck: Dish[];
  onWish: (dish: Dish) => void;
  onTrash: (dish: Dish) => void;
  onCardTap: (dish: Dish) => void;
  onOpenWishlist: () => void;
  onOpenTrash: () => void;
  onCurrentChange?: (dish: Dish | null) => void;
}

const SWIPE_THRESHOLD = 64;
const SWIPE_VELOCITY = 280;
const PULSE_MS = 420;
const VISIBLE_BEHIND = 4;
const FLY_OFF_DISTANCE = 480;

export function CardStack({
  deck,
  onWish,
  onTrash,
  onCardTap,
  onOpenWishlist,
  onOpenTrash,
  onCurrentChange,
}: CardStackProps) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [wishPulse, setWishPulse] = useState(false);
  const [rejectPulse, setRejectPulse] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setIndex(0);
    setDragX(0);
  }, [deck]);

  const current = deck[index] ?? null;
  const behind = deck.slice(index + 1, index + 1 + VISIBLE_BEHIND);

  useEffect(() => {
    onCurrentChange?.(current);
  }, [current, onCurrentChange]);

  const advance = useCallback(() => {
    setIndex((i) => i + 1);
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
    onWish(current);
    advance();
  }, [current, onWish, advance]);

  const completeTrash = useCallback(() => {
    if (!current) return;
    onTrash(current);
    advance();
  }, [current, onTrash, advance]);

  const handleWish = useCallback(() => {
    if (!current) return;
    flashWish();
    hapticCardSwipe();
    completeWish();
  }, [current, completeWish, flashWish]);

  const handleTrash = useCallback(() => {
    if (!current) return;
    flashReject();
    hapticCardSwipe();
    completeTrash();
  }, [current, completeTrash, flashReject]);

  const handleSwipeWish = useCallback(() => {
    if (!current) return;
    flashWish();
    hapticCardSwipe();
    completeWish();
  }, [current, completeWish, flashWish]);

  const handleSwipeTrash = useCallback(() => {
    if (!current) return;
    flashReject();
    hapticCardSwipe();
    completeTrash();
  }, [current, completeTrash, flashReject]);

  return (
    <div className="relative flex h-full min-h-[min(56vh,440px)] max-h-[min(58vh,460px)] flex-1 overflow-visible px-0">
      <CardActionButtons
        onReject={handleTrash}
        onOpenWishlist={onOpenWishlist}
        onOpenTrash={onOpenTrash}
        disabled={!current}
        dragX={dragX}
        wishPulse={wishPulse}
        rejectPulse={rejectPulse}
      />

      <div className="relative mx-14 min-h-[min(56vh,440px)] max-h-[min(58vh,460px)] w-full flex-1 overflow-visible">
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
              .slice()
              .reverse()
              .map((dish, reverseIdx) => {
                const depth = behind.length - reverseIdx;
                const rotation = depth % 2 === 0 ? -4 : 4;
                const xOffset = depth % 2 === 0 ? -14 : 14;
                return (
                  <div
                    key={dish.id}
                    className="pointer-events-none absolute inset-0 origin-bottom"
                    style={{
                      transform: `translateX(${xOffset}px) rotate(${rotation}deg) scale(${1 - depth * 0.028}) translateY(${depth * 8}px)`,
                      zIndex: 10 + depth,
                    }}
                  >
                    <DishCard dish={dish} interactive={false} className="opacity-[0.94]" />
                  </div>
                );
              })}

            <AnimatePresence mode="popLayout">
              <SwipeableCard
                key={current.id}
                dish={current}
                onSwipeWish={handleSwipeWish}
                onSwipeTrash={handleSwipeTrash}
                onTap={() => onCardTap(current)}
                onDragXChange={setDragX}
                onDraggingChange={setIsDragging}
                elevated={isDragging}
              />
            </AnimatePresence>
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
  onDraggingChange,
  elevated,
}: {
  dish: Dish;
  onSwipeWish: () => void;
  onSwipeTrash: () => void;
  onTap: () => void;
  onDragXChange: (x: number) => void;
  onDraggingChange: (dragging: boolean) => void;
  elevated: boolean;
}) {
  const x = useMotionValue(0);
  const opacity = useMotionValue(1);
  const rotate = useTransform(x, [-300, 300], [-16, 16]);
  const didSwipe = useRef(false);
  const [isFlyingOff, setIsFlyingOff] = useState(false);

  useEffect(() => {
    const unsubscribe = x.on("change", (latest) => {
      onDragXChange(latest);
    });
    return unsubscribe;
  }, [x, onDragXChange]);

  const flyOff = useCallback(
    (direction: "wish" | "trash", onComplete: () => void) => {
      setIsFlyingOff(true);
      didSwipe.current = true;

      const currentX = x.get();
      const targetX =
        direction === "wish" ? currentX + FLY_OFF_DISTANCE : currentX - FLY_OFF_DISTANCE;

      Promise.all([
        animate(x, targetX, {
          duration: 0.36,
          ease: [0.32, 0.72, 0, 1],
        }),
        animate(opacity, 0, { duration: 0.3, ease: "easeOut" }),
      ]).then(() => {
        onComplete();
      });
    },
    [opacity, x]
  );

  return (
    <motion.div
      className="swipe-surface absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{
        x,
        rotate,
        opacity,
        zIndex: elevated || isFlyingOff ? 60 : 50,
        touchAction: "none",
      }}
      drag={isFlyingOff ? false : "x"}
      dragElastic={0.12}
      dragMomentum={false}
      onDragStart={() => {
        didSwipe.current = false;
        onDraggingChange(true);
      }}
      onDrag={(_, info) => {
        if (Math.abs(info.offset.x) > 6) {
          didSwipe.current = true;
        }
      }}
      onDragEnd={(_, info) => {
        if (isFlyingOff) return;

        onDraggingChange(false);

        if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > SWIPE_VELOCITY) {
          flyOff("wish", onSwipeWish);
          return;
        }
        if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY) {
          flyOff("trash", onSwipeTrash);
          return;
        }

        didSwipe.current = false;
        animate(x, 0, { type: "spring", stiffness: 380, damping: 34 });
        onDragXChange(0);
      }}
      onTap={() => {
        if (!didSwipe.current && !isFlyingOff) {
          onTap();
        }
      }}
    >
      <DishCard
        dish={dish}
        interactive={false}
        className="pointer-events-none relative z-50 select-none shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
      />
    </motion.div>
  );
}
