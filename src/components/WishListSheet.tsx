"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
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

export function WishListSheet({
  open,
  dishes,
  total,
  onClose,
  onRemove,
  onSelectDish,
}: WishListSheetProps) {
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
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-white">My Wish List</h2>
                <p className="text-xs font-normal text-zinc-500">
                  Tap a dish for details · show this list to staff when ordering
                </p>
              </div>
              <button type="button" onClick={onClose} className="text-sm font-medium text-zinc-400">
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {dishes.length === 0 ? (
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

            <div className="border-t border-zinc-800 px-5 py-4">
              <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                <span className="text-sm font-medium text-zinc-600">Estimated total</span>
                <span className="text-2xl font-extrabold text-black">{formatPrice(total)}</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
