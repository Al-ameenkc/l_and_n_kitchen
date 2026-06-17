"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { getCategoryPlaceholder } from "@/utils/dishImage";
import { hapticCategorySnap } from "@/utils/haptics";

interface CurvedCategoryCarouselProps {
  categories: string[];
  categoryImages?: Record<string, string>;
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

const ITEM_STRIDE = 108;
const WHEEL_RADIUS = 320;
const CENTER_LIFT = -1.5;
const SLOT_TOP = 3;
const RING_SIZE = 80;
const CIRCLE_SIZE = 76;

function getLabel(category: string): string {
  return LABELS[category] ?? category;
}

/** Visual arc only — items scroll horizontally; Y/scale follow distance from center. */
function getArcStyle(distanceFromCenter: number): { y: number; scale: number; opacity: number } {
  const x = Math.max(-WHEEL_RADIUS + 2, Math.min(WHEEL_RADIUS - 2, distanceFromCenter));
  const arcY = WHEEL_RADIUS - Math.sqrt(WHEEL_RADIUS * WHEEL_RADIUS - x * x);
  const normalized = Math.abs(x) / WHEEL_RADIUS;
  const centerLift = Math.pow(1 - normalized, 1.35) * CENTER_LIFT;
  const y = arcY + centerLift;
  const scale = 0.78 + Math.pow(1 - normalized, 1.05) * 0.22;
  const opacity = 0.42 + Math.pow(1 - normalized, 1.2) * 0.58;
  return { y, scale: Math.max(0.74, scale), opacity: Math.max(0.4, opacity) };
}

export function CurvedCategoryCarousel({
  categories,
  categoryImages = {},
  selected,
  onChange,
}: CurvedCategoryCarouselProps) {
  const baseItems = useMemo(() => ["all", ...categories], [categories]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCentered = useRef(selected);
  const fromScrollRef = useRef(false);
  const isUserScrolling = useRef(false);
  const isAnimatingRef = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef(0);
  const arcLoopRef = useRef(0);

  const count = baseItems.length;

  const applyArc = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const centerX = el.getBoundingClientRect().left + el.clientWidth / 2;
    el.querySelectorAll<HTMLElement>("[data-cat-item]").forEach((node) => {
      const rect = node.getBoundingClientRect();
      const distance = rect.left + rect.width / 2 - centerX;
      const { y, scale, opacity } = getArcStyle(distance);

      node.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;
      node.style.opacity = `${opacity}`;

      const label = node.querySelector<HTMLElement>("[data-cat-label]");
      if (label) {
        const norm = Math.abs(distance) / 96;
        label.style.opacity = norm < 0.38 ? "0" : `${Math.min(0.85, 0.32 + norm * 0.5)}`;
      }
    });
  }, []);

  const stopArcLoop = useCallback(() => {
    cancelAnimationFrame(arcLoopRef.current);
    arcLoopRef.current = 0;
  }, []);

  const startArcLoop = useCallback(() => {
    stopArcLoop();
    const tick = () => {
      applyArc();
      if (isAnimatingRef.current) {
        arcLoopRef.current = requestAnimationFrame(tick);
      }
    };
    arcLoopRef.current = requestAnimationFrame(tick);
  }, [applyArc, stopArcLoop]);

  const indexFromScroll = useCallback(
    (scrollLeft: number) => {
      if (count <= 1) return 0;
      const raw = Math.round(scrollLeft / ITEM_STRIDE);
      return Math.max(0, Math.min(count - 1, raw));
    },
    [count]
  );

  const scrollToIndex = useCallback(
    (targetIndex: number, smooth = false) => {
      const el = scrollRef.current;
      if (!el || count === 0) return;

      const clamped = Math.max(0, Math.min(count - 1, targetIndex));
      const targetLeft = clamped * ITEM_STRIDE;

      if (smooth) {
        isAnimatingRef.current = true;
        isUserScrolling.current = true;
        el.classList.add("carousel-wheel--animating");
        startArcLoop();
        el.scrollTo({ left: targetLeft, behavior: "smooth" });
      } else {
        el.scrollLeft = targetLeft;
        applyArc();
      }
    },
    [applyArc, count, startArcLoop]
  );

  const onScrollSettled = useCallback(() => {
    isUserScrolling.current = false;
    isAnimatingRef.current = false;
    stopArcLoop();
    scrollRef.current?.classList.remove("carousel-wheel--animating");
    applyArc();

    const el = scrollRef.current;
    if (!el) return;

    const idx = indexFromScroll(el.scrollLeft);
    const id = baseItems[idx] ?? baseItems[0];

    if (id !== lastCentered.current) {
      lastCentered.current = id;
      hapticCategorySnap();
      fromScrollRef.current = true;
      onChange(id);
    }
  }, [applyArc, baseItems, indexFromScroll, onChange, stopArcLoop]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || count === 0) return;

    const idx = Math.max(0, baseItems.indexOf(selected));
    el.scrollLeft = idx * ITEM_STRIDE;
    lastCentered.current = selected;
    requestAnimationFrame(applyArc);
  }, [baseItems, count]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      if (!isAnimatingRef.current) isUserScrolling.current = true;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(applyArc);

      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(onScrollSettled, isAnimatingRef.current ? 80 : 120);
    };

    const onScrollEnd = () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      onScrollSettled();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", onScrollEnd);

    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", onScrollEnd);
      if (settleTimer.current) clearTimeout(settleTimer.current);
      cancelAnimationFrame(rafRef.current);
      stopArcLoop();
    };
  }, [applyArc, onScrollSettled, stopArcLoop]);

  useEffect(() => {
    if (fromScrollRef.current) {
      fromScrollRef.current = false;
      return;
    }
    if (selected !== lastCentered.current && !isUserScrolling.current) {
      const idx = baseItems.indexOf(selected);
      if (idx >= 0) scrollToIndex(idx, true);
    }
  }, [baseItems, scrollToIndex, selected]);

  const getCategoryImage = useCallback(
    (id: string) => {
      if (categoryImages[id]) return categoryImages[id];
      if (id === "all") return "/images/placeholders/grill.svg";
      return getCategoryPlaceholder(id);
    },
    [categoryImages]
  );

  const labelTop = SLOT_TOP + CIRCLE_SIZE + 12;
  const underlineTop = SLOT_TOP + CIRCLE_SIZE + 30;

  return (
    <div className="relative z-30 shrink-0 overflow-hidden pb-1 pt-1">
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
        className="pointer-events-none absolute left-1/2 z-40 w-28 -translate-x-1/2 text-center text-xs font-bold leading-tight text-white transition-opacity duration-200"
        style={{ top: labelTop }}
      >
        {getLabel(selected)}
      </div>

      <div
        ref={scrollRef}
        className="carousel-wheel carousel-wheel-ios flex h-[156px] snap-x snap-mandatory items-start gap-5 overflow-x-auto overflow-y-hidden px-[calc(50%-2.75rem)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch", paddingTop: SLOT_TOP, touchAction: "pan-x" }}
      >
        {baseItems.map((id) => {
          const imageSrc = getCategoryImage(id);

          return (
            <button
              key={id}
              type="button"
              data-cat-item
              data-category-id={id}
              onClick={() => {
                const idx = baseItems.indexOf(id);
                if (idx < 0 || id === lastCentered.current) return;
                fromScrollRef.current = true;
                scrollToIndex(idx, true);
              }}
              className="flex w-[5.5rem] shrink-0 snap-center snap-always flex-col items-center gap-1.5 will-change-transform"
              style={{ transformOrigin: "center top", scrollSnapStop: "always" }}
            >
              <div
                className="relative flex items-center justify-center overflow-hidden rounded-full bg-white shadow-sm"
                style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
              >
                <div className="relative h-[78%] w-[78%]">
                  <Image
                    src={imageSrc}
                    alt={getLabel(id)}
                    fill
                    className="object-contain"
                    sizes="60px"
                    unoptimized
                  />
                </div>
              </div>
              <span
                data-cat-label
                className="text-center text-[11px] font-semibold leading-tight text-zinc-500"
              >
                {getLabel(id)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
