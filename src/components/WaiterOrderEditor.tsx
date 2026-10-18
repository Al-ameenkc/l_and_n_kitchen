"use client";

import { useMemo, useState } from "react";

export type WaiterOrderLine = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

export type WaiterMenuDish = {
  id: string;
  name: string;
  category: string;
  price: number;
};

export function WaiterOrderEditor({
  tableLabel,
  items,
  total,
  dishes,
  busy,
  onBack,
  onAdd,
  onSetQty,
  onRemove,
}: {
  tableLabel: string;
  items: WaiterOrderLine[];
  total: number;
  dishes: WaiterMenuDish[];
  busy: boolean;
  onBack: () => void;
  onAdd: (dishId: string) => void;
  onSetQty: (dishId: string, qty: number) => void;
  onRemove: (dishId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return dishes
      .filter((dish) => {
        if (!needle) return true;
        return `${dish.name} ${dish.category}`.toLowerCase().includes(needle);
      })
      .slice(0, 12);
  }, [dishes, query]);

  return (
    <section className="mt-6 rounded-3xl bg-zinc-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-green-400">Confirmed order</p>
          <h2 className="text-2xl font-extrabold">{tableLabel}</h2>
          <p className="text-sm text-zinc-400">₦{Number(total).toLocaleString()}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300"
        >
          Back
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl bg-black px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-zinc-500">₦{Number(item.price).toLocaleString()} each</p>
              </div>
              <p className="text-sm font-bold">₦{(item.price * item.qty).toLocaleString()}</p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                disabled={busy || item.qty <= 1}
                onClick={() => onSetQty(item.id, item.qty - 1)}
                className="h-9 w-9 rounded-full bg-zinc-800 text-lg font-bold disabled:opacity-30"
              >
                −
              </button>
              <span className="w-8 text-center font-bold">{item.qty}</span>
              <button
                type="button"
                disabled={busy || item.qty >= 99}
                onClick={() => onSetQty(item.id, item.qty + 1)}
                className="h-9 w-9 rounded-full bg-zinc-800 text-lg font-bold disabled:opacity-30"
              >
                +
              </button>
              <button
                type="button"
                disabled={busy || items.length <= 1}
                onClick={() => onRemove(item.id)}
                className="ml-auto text-xs font-semibold text-red-400 disabled:opacity-30"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="mt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the menu"
            className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-sm outline-none focus:border-green-500"
          />
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {matches.map((dish) => (
              <li key={dish.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAdd(dish.id)}
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left hover:bg-black disabled:opacity-40"
                >
                  <span>
                    <span className="block text-sm font-semibold">{dish.name}</span>
                    <span className="text-xs text-zinc-500">{dish.category}</span>
                  </span>
                  <span className="text-sm font-bold">₦{Number(dish.price).toLocaleString()}</span>
                </button>
              </li>
            ))}
            {!matches.length ? <li className="px-3 py-2 text-sm text-zinc-500">No dishes match.</li> : null}
          </ul>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => setAdding(true)}
          className="mt-4 w-full rounded-full bg-white py-3 text-sm font-bold text-black disabled:opacity-40"
        >
          Add a dish
        </button>
      )}
    </section>
  );
}
