"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMenuData } from "@/hooks/useMenuData";
import { parseOrderIdsParam, resolveOrderDishes } from "@/lib/orderShare";
import { formatPrice } from "@/utils/formatPrice";

export function WaiterOrderView() {
  const searchParams = useSearchParams();
  const ids = useMemo(
    () => parseOrderIdsParam(searchParams.get("ids")),
    [searchParams]
  );
  const { menuData, loading } = useMenuData();
  const dishes = useMemo(
    () => resolveOrderDishes(menuData.dishes, ids),
    [menuData.dishes, ids]
  );
  const total = useMemo(
    () => dishes.reduce((sum, d) => sum + d.price, 0),
    [dishes]
  );

  const storageKey = useMemo(
    () => `ln-order-table:${ids.join(",")}`,
    [ids]
  );
  const [tableLabel, setTableLabel] = useState("");

  useEffect(() => {
    if (!ids.length) return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) setTableLabel(saved);
    } catch {
      /* ignore */
    }
  }, [ids.length, storageKey]);

  useEffect(() => {
    if (!ids.length) return;
    try {
      if (tableLabel.trim()) sessionStorage.setItem(storageKey, tableLabel);
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [ids.length, storageKey, tableLabel]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4">
        <p className="text-sm text-zinc-500">Loading order…</p>
      </div>
    );
  }

  if (!ids.length || dishes.length === 0) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-5 py-10 text-center">
        <h1 className="text-xl font-extrabold text-white">No order found</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Scan a guest&apos;s wish-list QR code to see their dishes here.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          L&amp;N Kitchen
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Guest order</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Enter the table, then take the order to the kitchen.
        </p>
      </header>

      <label className="mb-5 block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Table / lounge
        </span>
        <input
          type="text"
          value={tableLabel}
          onChange={(e) => setTableLabel(e.target.value)}
          placeholder='e.g. Kings lounge table 3'
          className="w-full rounded-2xl border border-zinc-700 bg-[#1a1a1a] px-4 py-3.5 text-base text-white outline-none placeholder:text-zinc-600 focus:border-green-500"
        />
      </label>

      {tableLabel.trim() ? (
        <div className="mb-4 rounded-2xl bg-green-500/15 px-4 py-3 ring-1 ring-green-500/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-400">
            Serving
          </p>
          <p className="mt-0.5 text-lg font-extrabold text-white">{tableLabel.trim()}</p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl bg-white text-black">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Order summary
          </p>
          <p className="mt-0.5 text-sm font-bold text-zinc-800">
            {dishes.length} item{dishes.length === 1 ? "" : "s"}
          </p>
        </div>

        <ul className="divide-y divide-zinc-100">
          {dishes.map((dish, index) => (
            <li key={`${dish.id}-${index}`} className="flex items-start gap-3 px-4 py-3.5">
              <span className="mt-0.5 w-6 shrink-0 text-sm font-medium text-zinc-400">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-tight">{dish.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{dish.category}</p>
              </div>
              <p className="shrink-0 font-extrabold">{formatPrice(dish.price)}</p>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between bg-zinc-50 px-4 py-4">
          <span className="text-base font-extrabold">Total</span>
          <span className="text-lg font-extrabold text-green-600">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
}
