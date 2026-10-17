"use client";

import { useCallback, useEffect, useState } from "react";
import { qrImageUrl } from "@/lib/orderShare";
import { MAX_ACTIVE_TABLES } from "@/lib/waiter-limits";

type QueueRow = {
  id: string;
  name: string;
  staff_id: string;
  place: number | null;
  active_tables: number;
  busy: boolean;
};

type FloorTable = {
  id: string;
  table_number: number;
  qr_token: string;
  status: "free" | "taken";
  waiter_name: string;
  order_status: string | null;
};

type OfferRow = {
  id: string;
  table_label: string;
  waiter_name: string;
  assignment_state: string;
  seconds_left: number | null;
  total: number;
};

export function AdminFloor() {
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [offDuty, setOffDuty] = useState<QueueRow[]>([]);
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [error, setError] = useState("");
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(12);
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/floor", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not load the floor");
    setQueue(data.queue ?? []);
    setOffDuty(data.off_duty ?? []);
    setTables(data.tables ?? []);
    setOffers(data.offers ?? []);
    setError("");
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    let cancelled = false;
    const run = async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the floor");
      }
    };
    void run();
    const timer = window.setInterval(() => void run(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [load]);

  const createTables = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create tables");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create tables");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-8 space-y-8">
      <div>
        <h2 className="font-bold">Floor</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Waiters join from their device at /waiter. The first one on duty is called first. Accepting an
          order sends them to the back. Five open tables makes a waiter busy.
        </p>
      </div>
      {error ? <p className="text-sm text-amber-300">{error}</p> : null}

      <section>
        <h3 className="text-sm font-bold text-zinc-300">Queue</h3>
        {queue.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No waiter is on duty.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {queue.map((waiter) => (
              <li
                key={waiter.id}
                className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3"
              >
                <div>
                  <p className="font-semibold">
                    #{waiter.place} {waiter.name}
                  </p>
                  <p className="text-xs text-zinc-500">ID {waiter.staff_id}</p>
                </div>
                <p className={`text-sm font-semibold ${waiter.busy ? "text-amber-300" : "text-green-400"}`}>
                  {waiter.active_tables}/{MAX_ACTIVE_TABLES}
                  {waiter.busy ? " busy" : " available"}
                </p>
              </li>
            ))}
          </ol>
        )}
        {offDuty.length > 0 ? (
          <p className="mt-3 text-xs text-zinc-500">
            Off duty: {offDuty.map((waiter) => waiter.name).join(", ")}
          </p>
        ) : null}
      </section>

      <section>
        <h3 className="text-sm font-bold text-zinc-300">Calling now</h3>
        {offers.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No order is waiting for a waiter.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {offers.map((offer) => (
              <li key={offer.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm">
                <span className="font-semibold">{offer.table_label}</span>
                <span className="text-zinc-400">
                  {" "}
                  · {offer.assignment_state === "offered" ? offer.waiter_name || "waiter" : "looking for a waiter"}
                  {offer.seconds_left != null && offer.assignment_state === "offered"
                    ? ` · ${offer.seconds_left}s`
                    : ""}
                  {" "}
                  · ₦{Number(offer.total).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-sm font-bold text-zinc-300">Tables</h3>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void createTables();
            }}
          >
            <input
              type="number"
              min={1}
              value={from}
              onChange={(e) => setFrom(Number(e.target.value))}
              aria-label="First table number"
              className="w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
            />
            <span className="text-xs text-zinc-500">to</span>
            <input
              type="number"
              min={1}
              value={to}
              onChange={(e) => setTo(Number(e.target.value))}
              aria-label="Last table number"
              className="w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
            >
              {saving ? "Saving…" : "Add tables"}
            </button>
          </form>
        </div>
        {tables.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Add table numbers to print their QR codes.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tables.map((table) => {
              const url = origin ? `${origin}/t/${table.qr_token}` : "";
              return (
                <li key={table.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-extrabold">Table {table.table_number}</p>
                      <p className={`text-xs font-semibold ${table.status === "taken" ? "text-amber-300" : "text-green-400"}`}>
                        {table.status === "taken" ? "Taken" : "Free"}
                        {table.waiter_name ? ` · ${table.waiter_name}` : ""}
                      </p>
                    </div>
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrImageUrl(url, 96)}
                        alt={`QR code for table ${table.table_number}`}
                        width={96}
                        height={96}
                        className="rounded-lg bg-white p-1"
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
