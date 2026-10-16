"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { Dish } from "@/types/menu";
import { formatPrice } from "@/utils/formatPrice";

interface TrashSheetProps {
  open: boolean;
  dishes: Dish[];
  onClose: () => void;
  onRestoreToWishlist: (id: string) => void;
  onRestoreToDeck: (id: string) => void;
  onRestoreAllToDeck: () => void;
  onSelectDish: (dish: Dish) => void;
}

export function TrashSheet({
  open,
  dishes,
  onClose,
  onRestoreToWishlist,
  onRestoreToDeck,
  onRestoreAllToDeck,
  onSelectDish,
}: TrashSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close dismissed list"
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
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div>
                <h2 className="text-base font-extrabold text-white">Not Preferred</h2>
                <p className="text-[11px] font-normal text-zinc-500">
                  Tap a dish for details · swipe left on cards to dismiss
                </p>
              </div>
              <div className="flex items-center gap-3">
                {dishes.length > 0 ? (
                  <button
                    type="button"
                    onClick={onRestoreAllToDeck}
                    className="text-xs font-bold text-green-400"
                  >
                    Remove all
                  </button>
                ) : null}
                <button type="button" onClick={onClose} className="text-xs font-medium text-zinc-400">
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2.5">
              {dishes.length === 0 ? (
                <p className="py-8 text-center text-xs font-normal text-zinc-500">
                  Swipe left on dishes to dismiss them.
                </p>
              ) : (
                <ul className="space-y-2">
                  {dishes.map((dish) => (
                    <li key={dish.id} className="rounded-xl bg-white p-2.5">
                      <button
                        type="button"
                        onClick={() => onSelectDish(dish)}
                        className="flex w-full items-center gap-2.5 text-left"
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
                          <p className="text-xs font-normal text-zinc-500">{formatPrice(dish.price)}</p>
                        </div>
                      </button>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => onRestoreToDeck(dish.id)}
                          className="rounded-lg bg-zinc-100 px-2.5 py-2 text-xs font-bold text-zinc-700 active:bg-zinc-200"
                        >
                          To Deck
                        </button>
                        <button
                          type="button"
                          onClick={() => onRestoreToWishlist(dish.id)}
                          className="rounded-lg bg-green-50 px-2.5 py-2 text-xs font-bold text-green-700 active:bg-green-100"
                        >
                          To Wish
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
