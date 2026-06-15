"use client";

import Image from "next/image";
import type { Dish } from "@/types/menu";
import { formatPrice } from "@/utils/formatPrice";
import { formatPrepTime } from "@/utils/prepTime";

interface DishCardProps {
  dish: Dish;
  onTap?: () => void;
  className?: string;
  interactive?: boolean;
}

export function DishCard({ dish, onTap, className = "", interactive = true }: DishCardProps) {
  const cardClass = `flex h-full w-full flex-col overflow-hidden rounded-[2rem] border-2 border-white bg-white text-left shadow-[0_24px_60px_rgba(0,0,0,0.45)] ${className}`;

  const content = (
    <>
      <div className="relative h-[55%] w-full shrink-0 bg-white">
        <Image
          src={dish.image}
          alt={dish.name}
          fill
          className="object-cover"
          sizes="340px"
          priority
          unoptimized
          draggable={false}
        />
      </div>
      <div className="flex h-[45%] flex-col justify-center gap-2 rounded-b-[2rem] bg-white px-5 py-4">
        <p className="line-clamp-2 text-lg font-extrabold leading-tight text-zinc-900">{dish.name}</p>
        <p className="line-clamp-2 text-sm font-normal text-zinc-500">{dish.shortDescription}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-base font-extrabold text-zinc-900">{formatPrice(dish.price)}</p>
          <p className="text-xs font-medium text-zinc-500">
            {formatPrepTime(dish.prepTimeMin, dish.prepTimeMax)}
          </p>
        </div>
      </div>
    </>
  );

  if (!interactive) {
    return <div className={cardClass}>{content}</div>;
  }

  return (
    <button type="button" onClick={onTap} className={cardClass}>
      {content}
    </button>
  );
}
