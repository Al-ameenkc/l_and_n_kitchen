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

const ITEM_WIDTH = 76;
const ITEM_GAP = 20;
const ITEM_STRIDE = ITEM_WIDTH + ITEM_GAP;
const WHEEL_RADIUS = 340;
const LOOP_COPIES = 3;
const LERP = 0.28;
/** Pulls centered items up into the fixed selection ring */
const CENTER_Y_OFFSET = -7;

/** Fixed ring position from top of carousel wrapper */
const SLOT_TOP = 32;

function getLabel(category: string): string {
  return LABELS[category] ?? category;
}

function getArcOffset(distanceFromCenter: number): { y: number; scale: number; opacity: number } {
  const x = Math.max(-WHEEL_RADIUS + 2, Math.min(WHEEL_RADIUS - 2, distanceFromCenter));
  const arcY = WHEEL_RADIUS - Math.sqrt(WHEEL_RADIUS * WHEEL_RADIUS - x * x);
  const normalized = Math.abs(x) / WHEEL_RADIUS;
  const centerLift = Math.pow(1 - normalized, 1.4) * CENTER_Y_OFFSET;
  const y = arcY + centerLift;
  const scale = 0.76 + Math.pow(1 - normalized, 1.05) * 0.24;
  const opacity = 0.45 + Math.pow(1 - normalized, 1.3) * 0.55;
  return { y, scale: Math.max(0.72, scale), opacity: Math.max(0.38, opacity) };
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
  const isSnapping = useRef(false);
  const scrollIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef(0);
  const animateRef = useRef(0);

  const baseWidth = baseItems.length * ITEM_STRIDE;

  /** Keep scroll in the middle copy: [baseWidth, 2 * baseWidth). */
  const maintainInfiniteLoop = useCallback(() => {
    const container = scrollRef.current;
    if (!container || baseWidth === 0) return false;

    let jumped = false;

    if (container.scrollLeft < baseWidth) {
      isJumping.current = true;
      container.scrollLeft += baseWidth;
      jumped = true;
    } else if (container.scrollLeft >= baseWidth * 2) {
      isJumping.current = true;
      container.scrollLeft -= baseWidth;
      jumped = true;
    }

    if (jumped) {
      window.setTimeout(() => {
        isJumping.current = false;
      }, 150);
    }

    return jumped;
  }, [baseWidth]);

  const applyWheelTransforms = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;

    const nodes = container.querySelectorAll<HTMLElement>("[data-cat-item]");
    let closestId = baseItems[0];
    let closestDistance = Number.POSITIVE_INFINITY;

    nodes.forEach((node) => {
      const key = node.dataset.catKey ?? node.dataset.categoryId ?? "";
      const rect = node.getBoundingClientRect();
      const itemCenter = rect.left + rect.width / 2;
      const distance = itemCenter - centerX;
      const target = getArcOffset(distance);

      const prev = smoothStateRef.current.get(key) ?? target;

      const next = {
        y: lerp(prev.y, target.y, LERP),
        scale: lerp(prev.scale, target.scale, LERP),
        opacity: lerp(prev.opacity, target.opacity, LERP),
      };

      smoothStateRef.current.set(key, next);

      node.style.transform = `translate3d(0, ${next.y}px, 0) scale(${next.scale})`;
      node.style.opacity = `${next.opacity}`;

      const label = node.querySelector<HTMLElement>("[data-cat-label]");
      if (label) {
        const labelNorm = Math.abs(distance) / (ITEM_WIDTH * 1.1);
        if (labelNorm < 0.4) {
          label.style.opacity = "0";
        } else {
          label.style.opacity = `${Math.min(0.85, 0.3 + labelNorm * 0.55)}`;
        }
      }

      const absDist = Math.abs(distance);
      if (absDist < closestDistance) {
        closestDistance = absDist;
        closestId = node.dataset.categoryId ?? closestId;
      }
    });

    if (
      !isJumping.current &&
      !isSnapping.current &&
      closestDistance < ITEM_WIDTH / 2 &&
      closestId !== lastCentered.current
    ) {
      lastCentered.current = closestId;
      hapticCategorySnap();
      fromScrollRef.current = true;
      onChange(closestId);
    }
  }, [baseItems, onChange]);

  const snapToNearest = useCallback(() => {
    const container = scrollRef.current;
    if (!container || isJumping.current || isSnapping.current) return;

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

    if (!closestNode || closestDist < 2) return;

    const node = closestNode as HTMLElement;
    const rect = node.getBoundingClientRect();
    const delta = rect.left + rect.width / 2 - centerX;

    isSnapping.current = true;
    container.scrollBy({ left: delta, behavior: "smooth" });

    window.setTimeout(() => {
      isSnapping.current = false;
      maintainInfiniteLoop();
      applyWheelTransforms();
    }, 320);
  }, [applyWheelTransforms, maintainInfiniteLoop]);

  const scrollToCategory = useCallback(
    (categoryId: string, smooth = true) => {
      const container = scrollRef.current;
      if (!container || baseWidth === 0) return;

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

      isSnapping.current = smooth;
      container.scrollBy({ left: delta, behavior: smooth ? "smooth" : "auto" });
      window.setTimeout(() => {
        isSnapping.current = false;
        maintainInfiniteLoop();
        applyWheelTransforms();
      }, smooth ? 380 : 0);
    },
    [applyWheelTransforms, maintainInfiniteLoop, baseWidth]
  );

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || baseWidth === 0) return;

    const selectedIndex = Math.max(0, baseItems.indexOf(selected));
    container.scrollLeft = baseWidth + selectedIndex * ITEM_STRIDE;
    lastCentered.current = selected;

    requestAnimationFrame(applyWheelTransforms);
  }, [baseItems, baseWidth]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const tick = () => {
      maintainInfiniteLoop();
      applyWheelTransforms();
      animateRef.current = requestAnimationFrame(tick);
    };

    const scheduleSnap = () => {
      if (isJumping.current) return;
      if (scrollIdleRef.current) clearTimeout(scrollIdleRef.current);
      scrollIdleRef.current = setTimeout(snapToNearest, 160);
    };

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        maintainInfiniteLoop();
      });
      scheduleSnap();
    };

    const onScrollEnd = () => {
      if (!isJumping.current) {
        snapToNearest();
      }
    };

    animateRef.current = requestAnimationFrame(tick);
    container.addEventListener("scroll", onScroll, { passive: true });
    container.addEventListener("scrollend", onScrollEnd);

    return () => {
      container.removeEventListener("scroll", onScroll);
      container.removeEventListener("scrollend", onScrollEnd);
      if (scrollIdleRef.current) clearTimeout(scrollIdleRef.current);
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(animateRef.current);
    };
  }, [applyWheelTransforms, maintainInfiniteLoop, snapToNearest]);

  useEffect(() => {
    if (fromScrollRef.current) {
      fromScrollRef.current = false;
      return;
    }
    if (selected !== lastCentered.current) {
      lastCentered.current = selected;
      scrollToCategory(selected, true);
    }
  }, [selected, scrollToCategory]);

  return (
    <div className="relative z-30 shrink-0 overflow-visible pb-3 pt-2">
      <div
        className="pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 rounded-full border-2 border-white"
        style={{ top: SLOT_TOP, width: "3.75rem", height: "3.75rem" }}
      />
      <div
        className="pointer-events-none absolute left-1/2 z-40 -translate-x-1/2"
        style={{ top: SLOT_TOP + 60 + 30 }}
      >
        <div className="h-[3px] w-10 rounded-full bg-white" />
      </div>
      <div
        className="pointer-events-none absolute left-1/2 z-40 w-24 -translate-x-1/2 text-center text-[11px] font-bold leading-tight text-white"
        style={{ top: SLOT_TOP + 60 + 12 }}
      >
        {getLabel(selected)}
      </div>

      <div
        ref={scrollRef}
        className="carousel-wheel carousel-wheel-ios flex h-[192px] snap-x snap-mandatory items-start gap-5 overflow-x-auto overflow-y-visible px-[calc(50%-2.375rem)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                onChange(id);
                scrollToCategory(id, true);
              }}
              className="flex w-[4.75rem] shrink-0 snap-center snap-always flex-col items-center gap-2 will-change-transform"
              style={{ transformOrigin: "center top", scrollSnapStop: "always" }}
            >
              <div className="relative h-[3.65rem] w-[3.65rem] overflow-hidden rounded-full bg-white">
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
                className="text-center text-[10px] font-semibold leading-tight text-zinc-500"
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
