"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WaiterOrderEditor, type WaiterMenuDish } from "@/components/WaiterOrderEditor";
import { MAX_ACTIVE_TABLES } from "@/lib/waiter-limits";

const STORAGE_KEY = "ln-waiter-device";

type Offer = {
  id: string;
  table_label: string;
  seconds_left: number;
  items: { name: string; qty: number }[];
  total: number;
};

type ActiveTable = {
  id: string;
  table_label: string;
  assignment_state: "accepted" | "confirmed" | string;
  total: number;
  items: { id: string; name: string; qty: number; price: number }[];
};

type Session = {
  waiter: {
    name: string;
    staff_id: string;
    place: number | null;
    active_tables: number;
    busy: boolean;
    on_duty: boolean;
  };
  offer: Offer | null;
  tables: ActiveTable[];
};

export function WaiterDevice() {
  const [staffId, setStaffId] = useState("");
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [menuDishes, setMenuDishes] = useState<WaiterMenuDish[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { staff_id?: string };
      if (parsed.staff_id) {
        setStaffId(parsed.staff_id);
        setReady(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const refresh = useCallback(async (id: string) => {
    const res = await fetch(`/api/waiter/session?staff_id=${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not reach the queue");
    setSession(data as Session);
    setError("");
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const loadMenu = async () => {
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });
        const data = (await res.json()) as { dishes?: WaiterMenuDish[] };
        if (!cancelled) setMenuDishes(data.dishes ?? []);
      } catch {
        /* the add list stays empty until the menu loads */
      }
    };
    void loadMenu();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !staffId.trim()) return;
    let cancelled = false;
    const load = async () => {
      try {
        await refresh(staffId.trim());
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not reach the queue");
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [ready, refresh, staffId]);

  const clock = async (action: "in" | "out") => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/waiter/duty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: staffId.trim(), action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update duty");
      if (action === "out") {
        localStorage.removeItem(STORAGE_KEY);
        setReady(false);
        setSession(null);
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ staff_id: staffId.trim() }));
      setReady(true);
      await refresh(staffId.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update duty");
    } finally {
      setBusy(false);
    }
  };

  const confirmRaw = useCallback(
    async (raw: string) => {
      setBusy(true);
      setScanMessage("");
      setError("");
      try {
        const res = await fetch("/api/waiter/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staff_id: staffId.trim(), qr_token: raw }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not confirm the order");
        setScanMessage(
          data.already
            ? `${data.table_label} was already confirmed.`
            : `${data.table_label} is confirmed. You can change the dishes now.`
        );
        await refresh(staffId.trim());
        if (data.order_id) setOpenOrderId(String(data.order_id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not confirm the order");
      } finally {
        setBusy(false);
      }
    },
    [refresh, staffId]
  );

  useEffect(() => {
    if (!scanning) return;
    const video = videoRef.current;
    if (!video) return;
    let stop = false;
    let stream: MediaStream | null = null;

    const Detector = (
      window as Window & {
        BarcodeDetector?: new (options?: { formats?: string[] }) => {
          detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
        };
      }
    ).BarcodeDetector;

    const run = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !Detector) {
        setScanning(false);
        setError("This browser can't scan QR codes. Open the waiter page in Chrome or Safari.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stop) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        const detector = new Detector({ formats: ["qr_code"] });
        const tick = async () => {
          if (stop) return;
          try {
            const codes = await detector.detect(video);
            const raw = codes.find((code) => code.rawValue)?.rawValue;
            if (raw) {
              stop = true;
              stream?.getTracks().forEach((track) => track.stop());
              setScanning(false);
              await confirmRaw(raw);
              return;
            }
          } catch {
            /* wait for the next frame */
          }
          if (!stop) window.setTimeout(() => void tick(), 250);
        };
        void tick();
      } catch (e) {
        if (!stop) {
          setScanning(false);
          setError(e instanceof Error ? e.message : "Could not open the camera");
        }
      }
    };
    void run();

    return () => {
      stop = true;
      stream?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    };
  }, [confirmRaw, scanning]);

  const changeOrder = async (
    orderId: string,
    change: { action: "add" | "remove" | "set_qty"; dish_id: string; qty?: number }
  ) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/waiter/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: staffId.trim(),
          order_id: orderId,
          ...change,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update the order");
      await refresh(staffId.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the order");
    } finally {
      setBusy(false);
    }
  };

  const respond = async (action: "accept" | "pass") => {
    if (!session?.offer) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/waiter/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: staffId.trim(),
          order_id: session.offer.id,
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update the offer");
      await refresh(staffId.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the offer");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex h-full flex-col justify-center px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-green-400">Waiter device</p>
        <h1 className="mt-2 text-3xl font-extrabold">Start your shift</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Turn this device on to join the queue. The first waiter on duty is called first.
        </p>
        <label className="mt-8 text-sm font-semibold text-zinc-300" htmlFor="waiter-id">
          Waiter ID
        </label>
        <input
          id="waiter-id"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          className="mt-2 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-lg outline-none focus:border-green-500"
          placeholder="W001"
          autoCapitalize="characters"
        />
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        <button
          type="button"
          disabled={busy || !staffId.trim()}
          onClick={() => void clock("in")}
          className="mt-6 rounded-full bg-green-500 py-4 text-base font-bold text-white disabled:opacity-40"
        >
          {busy ? "Joining…" : "I'm here"}
        </button>
      </div>
    );
  }

  const waiter = session?.waiter;
  const offer = session?.offer;
  const openOrder = session?.tables.find(
    (table) => table.id === openOrderId && table.assignment_state === "confirmed"
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-400">On duty</p>
          <h1 className="text-2xl font-extrabold">{waiter?.name ?? "Waiter"}</h1>
          <p className="text-sm text-zinc-400">
            {waiter?.place ? `Queue #${waiter.place}` : "Joining queue…"} · {waiter?.active_tables ?? 0}/
            {MAX_ACTIVE_TABLES} tables
            {waiter?.busy ? " · Busy" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void clock("out")}
          className="rounded-full border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300"
        >
          End shift
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      {offer ? (
        <section className="mt-6 rounded-3xl bg-white p-5 text-black">
          <p className="text-xs font-bold uppercase tracking-wide text-green-700">New order</p>
          <p className="mt-1 text-4xl font-extrabold">{offer.table_label}</p>
          <p className="mt-1 text-sm text-zinc-600">
            {offer.seconds_left}s to accept · {offer.items.length} dish{offer.items.length === 1 ? "" : "es"} · ₦
            {Number(offer.total).toLocaleString()}
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {offer.items.slice(0, 6).map((item) => (
              <li key={`${item.name}-${item.qty}`}>
                {item.qty} × {item.name}
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={busy}
            onClick={() => void respond("accept")}
            className="mt-5 w-full rounded-full bg-green-500 py-4 text-base font-bold text-white"
          >
            Accept and go to the table
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void respond("pass")}
            className="mt-2 w-full py-2 text-sm font-semibold text-zinc-500"
          >
            Pass to the next waiter
          </button>
        </section>
      ) : openOrder ? null : (
        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900 px-5 py-8 text-center">
          <p className="text-lg font-bold">Waiting for the next table</p>
          <p className="mt-1 text-sm text-zinc-500">
            {waiter?.busy
              ? "You have 5 tables. One has to close before you get another."
              : "Stay on this screen. A new order rings here for 20 seconds."}
          </p>
        </section>
      )}

      {openOrder ? (
        <WaiterOrderEditor
          tableLabel={openOrder.table_label}
          items={openOrder.items ?? []}
          total={openOrder.total}
          dishes={menuDishes}
          busy={busy}
          onBack={() => setOpenOrderId(null)}
          onAdd={(dishId) => void changeOrder(openOrder.id, { action: "add", dish_id: dishId })}
          onSetQty={(dishId, qty) =>
            void changeOrder(openOrder.id, { action: "set_qty", dish_id: dishId, qty })
          }
          onRemove={(dishId) => void changeOrder(openOrder.id, { action: "remove", dish_id: dishId })}
        />
      ) : null}

      <section className="mt-6">
        <h2 className="text-sm font-bold text-zinc-300">Your tables</h2>
        {session?.tables.length ? (
          <ul className="mt-2 space-y-2">
            {session.tables.map((table) => {
              const confirmed = table.assignment_state === "confirmed";
              return (
                <li key={table.id}>
                  <button
                    type="button"
                    disabled={!confirmed}
                    onClick={() => setOpenOrderId(table.id)}
                    className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-left disabled:opacity-80"
                  >
                    <p className="font-bold">{table.table_label}</p>
                    <p className="text-xs text-zinc-500">
                      {confirmed ? "Tap to change dishes" : "Scan the customer's order QR"} · ₦
                      {Number(table.total).toLocaleString()}
                    </p>
                    {confirmed && table.items?.length ? (
                      <p className="mt-1 text-xs text-zinc-400">
                        {table.items.map((item) => `${item.qty} × ${item.name}`).join(", ")}
                      </p>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">No tables yet.</p>
        )}
      </section>

      <section className="mt-6">
        <button
          type="button"
          disabled={busy || scanning}
          onClick={() => {
            setError("");
            setScanMessage("");
            setScanning(true);
          }}
          className="w-full rounded-full bg-white py-4 text-base font-bold text-black disabled:opacity-40"
        >
          Scan order QR
        </button>
        <p className="mt-2 text-center text-xs text-zinc-500">
          Scan the QR on the customer's phone. The order reaches admin only after this scan.
        </p>
        {scanMessage ? <p className="mt-2 text-center text-sm text-green-400">{scanMessage}</p> : null}
      </section>

      {scanning ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <video ref={videoRef} className="min-h-0 flex-1 object-cover" playsInline muted />
          <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
            <p className="mb-3 text-center text-sm text-zinc-300">Point the camera at the customer's order QR</p>
            <button
              type="button"
              onClick={() => setScanning(false)}
              className="w-full rounded-full border border-zinc-600 py-3 text-sm font-bold text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
