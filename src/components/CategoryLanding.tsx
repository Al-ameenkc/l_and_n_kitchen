"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import type { Dish } from "@/types/menu";
import { getCategoryPlaceholder } from "@/utils/dishImage";
import { hapticCategorySnap } from "@/utils/haptics";

interface CategoryLandingProps {
  categories: string[];
  categoryImages?: Record<string, string>;
  dishes: Dish[];
  showOrdersButton?: boolean;
  orderCount?: number;
  onOpenOrders?: () => void;
  onSelect: (category: string) => void;
}

export function CategoryLanding({
  categories,
  categoryImages = {},
  dishes,
  showOrdersButton = false,
  orderCount = 0,
  onOpenOrders,
  onSelect,
}: CategoryLandingProps) {
  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const dish of dishes) {
      if (dish.available === false) continue;
      counts[dish.category] = (counts[dish.category] ?? 0) + 1;
    }
    return counts;
  }, [dishes]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#111111]">
      <header className="shrink-0 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex h-11 items-center gap-2">
          <Image
            src="/images/ChatGPT_Image_Jun_15__2026__08_20_55_PM-removebg-preview.png"
            alt="L&N Kitchen"
            width={52}
            height={22}
            priority
            className="h-auto w-[16vw] max-w-[52px] min-w-[40px] shrink-0"
          />
          {showOrdersButton && onOpenOrders ? (
            <button
              type="button"
              onClick={onOpenOrders}
              className="relative ml-auto flex h-11 items-center gap-2 rounded-full bg-[#2a2a2a]/95 px-4 text-sm font-semibold text-white ring-1 ring-zinc-700/60"
            >
              My orders
              {orderCount > 0 ? (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-green-500 px-1 text-[10px] font-bold">
                  {orderCount > 99 ? "99+" : orderCount}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-white">What are you craving?</h1>
        <p className="mt-1 text-sm text-zinc-500">Pick a category to start browsing the menu.</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="grid grid-cols-3 gap-3">
          {categories.map((category, i) => {
            const count = countByCategory[category] ?? 0;
            return (
              <motion.button
                key={category}
                type="button"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i, 15) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  hapticCategorySnap();
                  onSelect(category);
                }}
                className="flex flex-col items-center gap-2 rounded-2xl bg-[#1c1c1c] p-2.5 pb-3 text-center ring-1 ring-zinc-800"
              >
                <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-white">
                  <div className="relative h-[78%] w-[78%]">
                    <Image
                      src={categoryImages[category] || getCategoryPlaceholder(category)}
                      alt=""
                      fill
                      className="object-contain"
                      sizes="100px"
                      unoptimized
                    />
                  </div>
                </div>
                <span className="line-clamp-2 text-xs font-bold leading-tight text-white">{category}</span>
                <span className="-mt-1 text-[10px] font-medium text-zinc-500">
                  {count} {count === 1 ? "dish" : "dishes"}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
