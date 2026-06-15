"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { Dish } from "@/types/menu";
import { formatPrice } from "@/utils/formatPrice";
import { formatPrepTime } from "@/utils/prepTime";

interface DishDetailViewProps {
  dish: Dish | null;
  onClose: () => void;
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="text-base font-extrabold text-black">{title}</h3>
      <div className="mt-2 text-sm font-normal leading-relaxed text-zinc-600">{children}</div>
    </section>
  );
}

export function DishDetailView({ dish, onClose }: DishDetailViewProps) {
  return (
    <AnimatePresence>
      {dish && (
        <motion.div
          key={dish.id}
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="fixed inset-0 z-[60] mx-auto flex max-w-[430px] flex-col bg-[#111111]"
        >
          <div className="relative h-[42vh] shrink-0 bg-zinc-900">
            <Image src={dish.image} alt={dish.name} fill className="object-cover" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-black/20" />
            <button
              type="button"
              onClick={onClose}
              className="absolute left-5 top-12 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm font-medium text-white backdrop-blur-md"
            >
              Back
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-10 pt-4">
            <div className="mb-5">
              <p className="text-xs font-medium uppercase tracking-widest text-green-400">
                {dish.category}
              </p>
              <h2 className="mt-1 text-3xl font-extrabold leading-tight text-white">{dish.name}</h2>
              <p className="mt-2 text-sm font-normal text-zinc-400">{dish.shortDescription}</p>
              <p className="mt-3 text-2xl font-extrabold text-white">{formatPrice(dish.price)}</p>
            </div>

            <div className="space-y-3">
              <DetailCard title="Preparation Time">
                <p className="font-semibold text-zinc-800">
                  {formatPrepTime(dish.prepTimeMin, dish.prepTimeMax)}
                </p>
                <p className="mt-1 text-zinc-500">
                  Estimated window from order to table. Busy periods may add a few extra minutes.
                </p>
              </DetailCard>

              <DetailCard title="Key Ingredients">
                <ul className="list-disc space-y-1 pl-5">
                  {dish.ingredients.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </DetailCard>

              <DetailCard title="Allergy Warnings">
                <ul className="list-disc space-y-1 pl-5">
                  {dish.allergens.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-zinc-500">
                  These are indicative hints only. Always confirm allergens with L&amp;N Kitchen staff.
                </p>
              </DetailCard>

              <DetailCard title="Estimated Calories">
                <p className="text-2xl font-extrabold text-zinc-900">
                  {dish.estimatedCalories > 0 ? `${dish.estimatedCalories} kcal` : "N/A"}
                </p>
                <p className="mt-1 text-zinc-500">
                  Approximate per serving based on typical preparation at the restaurant.
                </p>
              </DetailCard>

              <DetailCard title="Best Combo With…">
                <p className="text-base font-semibold text-zinc-800">{dish.bestComboWith}</p>
                <p className="mt-1 text-zinc-500">
                  A pairing suggestion to balance flavor, texture, and the full L&amp;N experience.
                </p>
              </DetailCard>

              <DetailCard title="About This Dish">
                <p>{dish.description}</p>
              </DetailCard>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
