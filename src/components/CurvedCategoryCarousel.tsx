"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { getCategoryPlaceholder } from "@/utils/dishImage";
import { hapticCategorySnap } from "@/utils/haptics";

interface CurvedCategoryCarouselProps {
  categories: string[];
  selected: string;
  onChange: (category: string) => void;
}

const LABELS: Record<string, string> = {
  all: "All",
  Soups: "Soup",
  "English Dishes": "English",
  "Side Dishes": "Sides",
  Alacarte: "A la Carte",
  "Fresh Juice": "Fresh Juice",
};

const ITEM_WIDTH = 88;
const ITEM_GAP = 20;
const ITEM_STRIDE = ITEM_WIDTH + ITEM_GAP;
const WHEEL_RADIUS = 340;
const LOOP_COPIES = 3;
const LERP = 0.32;
const CENTER_Y_OFFSET = -7;
const SLOT_TOP = 28;
const RING_SIZE = 80;
const CIRCLE_SIZE = 76;

function getLabel(category: string): string {
  return LABELS[category] ?? category;
}

function getArcOffset(distanceFromCenter: number): { y: number; scale: number; opacity: number } {
  const x = Math.max(-WHEEL_RADIUS + 2, Math.min(WHEEL_RADIUS - 2, distanceFromCenter));
  const arcY = WHEEL_RADIUS - Math.sqrt(WHEEL_RADIUS * WHEEL_RADIUS - x * x);
  const normalized = Math.abs(x) / WHEEL_RADIUS;
  const centerLift = Math.pow(1 - normalized, 1.4) * CENTER_Y_OFFSET;
  const y = arcY + centerLift;
  const scale = 0.78 + Math.pow(1 - normalized, 1.05) * 0.22;
  const opacity = 0.45 + Math.pow(1 - normalized, 1.3) * 0.55;
  return { y, scale: Math.max(0.74, scale), opacity: Math.max(0.38, opacity) };
}

function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

type SmoothState = { y: number; scale: number; opacity: number };

export function CurvedCategoryCarousel({
  categories,
  selected,
  onChange,
}: CurvedCategoryCarouselProps) {
  const baseItems = useMemo(() => ["all", ...categories], [categories]);

  const loopItems = useMemo(
    () =>
      Array.from({ length: LOOP_COPIES }, (_, copy) =>
        baseItems.map((id) => ({ id, key: `${id}::${copy}` }))
      ).flat(),
    [baseItems]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const smoothStateRef = useRef<Map<string, SmoothState>>(new Map());
  const lastCentered = useRef(selected);
  const fromScrollRef = useRef(false);
  const isJumping = useRef(false);
  const isUserScrolling = useRef(false);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef(0);

  const baseWidth = baseItems.length * ITEM_STRIDE;

  const maintainInfiniteLoop = useCallback(() => {
    const container = scrollRef.current;
    if (!container || baseWidth === 0) return;

    if (container.scrollLeft < baseWidth) {
      isJumping.current = true;
      container.scrollLeft += baseWidth;
    } else if (container.scrollLeft >= baseWidth * 2) {
      isJumping.current = true;
      container.scrollLeft -= baseWidth;
    }

    window.setTimeout(() => {
      isJumping.current = false;
    }, 80);
  }, [baseWidth]);

  const getClosestCategory = useCallback((): { id: string; distance: number } => {
    const container = scrollRef.current;
    if (!container) return { id: baseItems[0], distance: 0 };

    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;
    const nodes = container.querySelectorAll<HTMLElement>("[data-cat-item]");

    let closestId = baseItems[0];
    let closestDistance = Number.POSITIVE_INFINITY;

    nodes.forEach((node) => {
      const rect = node.getBoundingClientRect();
      const dist = Math.abs(rect.left + rect.width / 2 - centerX);
      if (dist < closestDistance) {
        closestDistance = dist;
        closestId = node.dataset.categoryId ?? closestId;
      }
    });

    return { id: closestId, distance: closestDistance };
  }, [baseItems]);

  const applyWheelTransforms = useCallback(
    (instant = false) => {
      const container = scrollRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;
      const nodes = container.querySelectorAll<HTMLElement>("[data-cat-item]");
      const blend = instant || isUserScrolling.current ? 1 : LERP;

      nodes.forEach((node) => {
        const key = node.dataset.catKey ?? node.dataset.categoryId ?? "";
        const rect = node.getBoundingClientRect();
        const distance = rect.left + rect.width / 2 - centerX;
        const target = getArcOffset(distance);
        const prev = smoothStateRef.current.get(key) ?? target;

        const next = {
          y: lerp(prev.y, target.y, blend),
          scale: lerp(prev.scale, target.scale, blend),
          opacity: lerp(prev.opacity, target.opacity, blend),
        };

        smoothStateRef.current.set(key, next);
        node.style.transform = `translate3d(0, ${next.y}px, 0) scale(${next.scale})`;
        node.style.opacity = `${next.opacity}`;

        const label = node.querySelector<HTMLElement>("[data-cat-label]");
        if (label) {
          const labelNorm = Math.abs(distance) / (ITEM_WIDTH * 1.05);
          label.style.opacity = labelNorm < 0.38 ? "0" : `${Math.min(0.85, 0.3 + labelNorm * 0.55)}`;
        }
      });
    },
    []
  );

  const alignToNearest = useCallback(
    (smooth = false) => {
      const container = scrollRef.current;
      if (!container || isJumping.current) return;

      const containerRect = container.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;
      const nodes = Array.from(container.querySelectorAll<HTMLElement>("[data-cat-item]"));

      let closestNode: HTMLElement | null = null;
      let closestDist = Number.POSITIVE_INFINITY;

      nodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const dist = Math.abs(rect.left + rect.width / 2 - centerX);
        if (dist < closestDist) {
          closestDist = dist;
          closestNode = node;
        }
      });

      if (!closestNode || closestDist < 3) return;

      const node = closestNode as HTMLElement;
      const rect = node.getBoundingClientRect();
      const delta = rect.left + rect.width / 2 - centerX;

      if (smooth) {
        container.scrollBy({ left: delta, behavior: "smooth" });
      } else {
        container.scrollLeft += delta;
      }
    },
    []
  );

  const handleScrollSettled = useCallback(() => {
    isUserScrolling.current = false;
    maintainInfiniteLoop();
    alignToNearest(false);
    applyWheelTransforms(true);

    const { id } = getClosestCategory();
    if (id !== lastCentered.current) {
      lastCentered.current = id;
      hapticCategorySnap();
      fromScrollRef.current = true;
      onChange(id);
    }
  }, [alignToNearest, applyWheelTransforms, getClosestCategory, maintainInfiniteLoop, onChange]);

  const scrollToCategory = useCallback(
    (categoryId: string) => {
      const container = scrollRef.current;
      if (!container || baseWidth === 0 || isUserScrolling.current) return;

      const nodes = Array.from(
        container.querySelectorAll<HTMLElement>("[data-cat-item]")
      ).filter((node) => node.dataset.categoryId === categoryId);

      if (nodes.length === 0) return;

      const containerRect = container.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;

      const target = nodes.reduce((best, node) => {
        const rect = node.getBoundingClientRect();
        const dist = Math.abs(rect.left + rect.width / 2 - centerX);
        return dist < best.dist ? { node, dist } : best;
      }, { node: nodes[0], dist: Number.POSITIVE_INFINITY }).node;

      const targetRect = target.getBoundingClientRect();
      const delta = targetRect.left + targetRect.width / 2 - centerX;

      container.scrollLeft += delta;
      maintainInfiniteLoop();
      applyWheelTransforms(true);
      lastCentered.current = categoryId;
    },
    [applyWheelTransforms, baseWidth, maintainInfiniteLoop]
  );

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || baseWidth === 0) return;

    const selectedIndex = Math.max(0, baseItems.indexOf(selected));
    container.scrollLeft = baseWidth + selectedIndex * ITEM_STRIDE;
    lastCentered.current = selected;
    requestAnimationFrame(() => applyWheelTransforms(true));
  }, [baseItems, baseWidth]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onScroll = () => {
      isUserScrolling.current = true;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => applyWheelTransforms(true));

      if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
      scrollEndTimer.current = setTimeout(handleScrollSettled, 140);
    };

    const onScrollEnd = () => {
      if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
      handleScrollSettled();
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    container.addEventListener("scrollend", onScrollEnd);

    return () => {
      container.removeEventListener("scroll", onScroll);
      container.removeEventListener("scrollend", onScrollEnd);
      if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [applyWheelTransforms, handleScrollSettled]);

  useEffect(() => {
    if (fromScrollRef.current) {
      fromScrollRef.current = false;
      return;
    }
    if (selected !== lastCentered.current && !isUserScrolling.current) {
      lastCentered.current = selected;
      scrollToCategory(selected);
    }
  }, [selected, scrollToCategory]);

  const labelTop = SLOT_TOP + CIRCLE_SIZE + 14;
  const underlineTop = SLOT_TOP + CIRCLE_SIZE + 32;

  return (
    <div className="relative z-30 shrink-0 overflow-visible pb-3 pt-2">
      <div
        className="pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 rounded-full border-2 border-white"
        style={{ top: SLOT_TOP, width: RING_SIZE, height: RING_SIZE }}
      />
      <div
        className="pointer-events-none absolute left-1/2 z-40 -translate-x-1/2"
        style={{ top: underlineTop }}
      >
        <div className="h-[3px] w-10 rounded-full bg-white" />
      </div>
      <div
        className="pointer-events-none absolute left-1/2 z-40 w-28 -translate-x-1/2 text-center text-xs font-bold leading-tight text-white"
        style={{ top: labelTop }}
      >
        {getLabel(selected)}
      </div>

      <div
        ref={scrollRef}
        className="carousel-wheel carousel-wheel-ios flex h-[210px] snap-x snap-mandatory items-start gap-5 overflow-x-auto overflow-y-visible px-[calc(50%-2.75rem)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch", paddingTop: SLOT_TOP }}
      >
        {loopItems.map(({ id, key }) => {
          const imageSrc =
            id === "all" ? "/images/placeholders/grill.svg" : getCategoryPlaceholder(id);

          return (
            <button
              key={key}
              type="button"
              data-cat-item
              data-cat-key={key}
              data-category-id={id}
              onClick={() => {
                lastCentered.current = id;
                fromScrollRef.current = true;
                onChange(id);
                scrollToCategory(id);
              }}
              className="flex w-[5.5rem] shrink-0 snap-center snap-always flex-col items-center gap-1.5 will-change-transform"
              style={{ transformOrigin: "center top", scrollSnapStop: "always" }}
            >
              <div
                className="relative overflow-hidden rounded-full bg-white"
                style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
              >
                <Image
                  src={imageSrc}
                  alt={getLabel(id)}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <span
                data-cat-label
                className="text-center text-[11px] font-semibold leading-tight text-zinc-500"
              >
                {getLabel(id)}
              </span>
              <span className="invisible h-[3px] w-10 rounded-full" aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}
