"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { toPng } from "html-to-image";
import { useMenuData } from "@/hooks/useMenuData";
import { parseOrderItemsParam, resolveOrderDishes, type OrderShareItem } from "@/lib/orderShare";
import { formatPrice } from "@/utils/formatPrice";

function slugForFilename(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

type WaiterProfile = {
  id: string;
  staff_id: string;
  name: string;
  image_url: string | null;
};

export function WaiterOrderView() {
  const searchParams = useSearchParams();
  const shareId = searchParams.get("s")?.trim() ?? "";
  const legacyItems = useMemo(
    () => parseOrderItemsParam(searchParams.get("ids")),
    [searchParams]
  );
  const [sharedItems, setSharedItems] = useState<OrderShareItem[] | null>(null);
  const [shareLoading, setShareLoading] = useState(Boolean(shareId));
  const [shareLoadError, setShareLoadError] = useState("");

  useEffect(() => {
    if (!shareId) {
      setSharedItems(null);
      setShareLoading(false);
      setShareLoadError("");
      return;
    }

    let cancelled = false;
    setShareLoading(true);
    setShareLoadError("");

    fetch(`/api/order-shares/${encodeURIComponent(shareId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Order share not found");
        if (!cancelled) setSharedItems(data.items as OrderShareItem[]);
      })
      .catch((e) => {
        if (!cancelled) {
          setSharedItems([]);
          setShareLoadError(e instanceof Error ? e.message : "Could not load order");
        }
      })
      .finally(() => {
        if (!cancelled) setShareLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const orderItems = shareId ? sharedItems ?? [] : legacyItems;
  const { menuData, loading } = useMenuData();
  const dishes = useMemo(
    () => resolveOrderDishes(menuData.dishes, orderItems),
    [menuData.dishes, orderItems]
  );
  const total = useMemo(
    () => dishes.reduce((sum, d) => sum + d.price * d.qty, 0),
    [dishes]
  );
  const itemCount = useMemo(
    () => dishes.reduce((sum, d) => sum + d.qty, 0),
    [dishes]
  );

  const storageKey = useMemo(
    () =>
      shareId
        ? `ln-order-table:s:${shareId}`
        : `ln-order-table:${orderItems.map((i) => `${i.id}:${i.qty}`).join(",")}`,
    [shareId, orderItems]
  );
  const waiterStorageKey = "ln-waiter-profile";

  const [tableLabel, setTableLabel] = useState("");
  const [waiterStaffId, setWaiterStaffId] = useState("");
  const [waiterName, setWaiterName] = useState("");
  const [waiterProfile, setWaiterProfile] = useState<WaiterProfile | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orderItems.length) return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) setTableLabel(saved);
    } catch {
      /* ignore */
    }
  }, [orderItems.length, storageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(waiterStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { staff_id?: string; name?: string };
      if (parsed.staff_id) setWaiterStaffId(parsed.staff_id);
      if (parsed.name) setWaiterName(parsed.name);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!orderItems.length) return;
    try {
      if (tableLabel.trim()) sessionStorage.setItem(storageKey, tableLabel);
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [orderItems.length, storageKey, tableLabel]);

  useEffect(() => {
    const staffId = waiterStaffId.trim();
    if (!staffId) {
      setWaiterProfile(null);
      setLookupError("");
      return;
    }

    const controller = new AbortController();
    setWaiterProfile(null);
    const timer = setTimeout(async () => {
      setLookupBusy(true);
      setLookupError("");
      try {
        const res = await fetch(
          `/api/waiters/lookup?staff_id=${encodeURIComponent(staffId)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!res.ok) {
          setWaiterProfile(null);
          setLookupError(data.error ?? "Waiter not found");
          return;
        }
        const profile = data as WaiterProfile;
        setWaiterProfile(profile);
        setWaiterName((current) => current.trim() || profile.name);
        try {
          localStorage.setItem(
            waiterStorageKey,
            JSON.stringify({ staff_id: profile.staff_id, name: profile.name })
          );
        } catch {
          /* ignore */
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setWaiterProfile(null);
        setLookupError("Could not look up waiter");
      } finally {
        setLookupBusy(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [waiterStaffId]);

  const canAct =
    tableLabel.trim().length > 0 &&
    waiterStaffId.trim().length > 0 &&
    (waiterName.trim().length > 0 || Boolean(waiterProfile)) &&
    Boolean(waiterProfile) &&
    dishes.length > 0;

  const downloadOrderImage = async () => {
    if (!tableLabel.trim() || !ticketRef.current) return;
    setDownloading(true);
    setDownloadError("");
    try {
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const tableSlug = slugForFilename(tableLabel.trim()) || "table";
      link.download = `ln-order-${tableSlug}-${stamp}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setDownloadError("Couldn’t create the image. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  const assignToAdmin = async () => {
    if (!canAct) return;
    setAssigning(true);
    setAssignError("");
    setAssignSuccess("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_label: tableLabel.trim(),
          waiter_staff_id: waiterStaffId.trim(),
          waiter_name: waiterName.trim() || waiterProfile?.name,
          dish_ids: dishes.map((d) => d.id),
          items: dishes.map((d) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            price: d.price,
            qty: d.qty,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAssignError(data.error ?? "Could not assign order");
        return;
      }
      const when = data.assigned_at
        ? new Date(data.assigned_at).toLocaleString()
        : new Date().toLocaleString();
      setAssignSuccess(`Assigned to admin at ${when}`);
      try {
        localStorage.setItem(
          waiterStorageKey,
          JSON.stringify({
            staff_id: waiterStaffId.trim(),
            name: waiterName.trim() || waiterProfile?.name || "",
          })
        );
      } catch {
        /* ignore */
      }
    } catch {
      setAssignError("Could not assign order. Check your connection.");
    } finally {
      setAssigning(false);
    }
  };

  if (loading || shareLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4">
        <p className="text-sm text-zinc-500">Loading order…</p>
      </div>
    );
  }

  if (shareLoadError) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-5 py-10 text-center">
        <h1 className="text-xl font-extrabold text-white">Order unavailable</h1>
        <p className="mt-2 text-sm text-zinc-400">{shareLoadError}</p>
      </div>
    );
  }

  if (!orderItems.length || dishes.length === 0) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-5 py-10 text-center">
        <h1 className="text-xl font-extrabold text-white">No order found</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Scan a guest&apos;s wish-list QR code to see their dishes here.
        </p>
      </div>
    );
  }

  const displayWaiterName = waiterName.trim() || waiterProfile?.name || "";

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          L&amp;N Kitchen
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Guest order</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Enter the table and your waiter details, then assign to admin.
        </p>
      </header>

      <div className="mb-4 space-y-4">
        <label className="block">
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

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Waiter ID
          </span>
          <input
            type="text"
            value={waiterStaffId}
            onChange={(e) => setWaiterStaffId(e.target.value)}
            placeholder="e.g. W001"
            className="w-full rounded-2xl border border-zinc-700 bg-[#1a1a1a] px-4 py-3.5 text-base text-white outline-none placeholder:text-zinc-600 focus:border-green-500"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Waiter name
          </span>
          <input
            type="text"
            value={waiterName}
            onChange={(e) => setWaiterName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-2xl border border-zinc-700 bg-[#1a1a1a] px-4 py-3.5 text-base text-white outline-none placeholder:text-zinc-600 focus:border-green-500"
          />
        </label>

        {lookupBusy && (
          <p className="text-sm text-zinc-500">Looking up waiter…</p>
        )}
        {lookupError && !lookupBusy && (
          <p className="text-sm text-red-400">{lookupError}</p>
        )}

        {waiterProfile && (
          <div className="flex items-center gap-3 rounded-2xl bg-[#1a1a1a] px-4 py-3 ring-1 ring-zinc-700">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-zinc-800">
              {waiterProfile.image_url ? (
                <Image
                  src={waiterProfile.image_url}
                  alt={displayWaiterName || waiterProfile.staff_id}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                  No photo
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold text-white">
                {displayWaiterName || waiterProfile.name}
              </p>
              <p className="text-xs text-zinc-500">ID {waiterProfile.staff_id}</p>
            </div>
          </div>
        )}
      </div>

      <div
        ref={ticketRef}
        className="overflow-hidden rounded-2xl bg-white text-black"
      >
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            L&amp;N Kitchen — Guest order
          </p>
          {tableLabel.trim() ? (
            <>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-green-700">
                Table / lounge
              </p>
              <p className="mt-0.5 text-xl font-extrabold leading-tight text-zinc-900">
                {tableLabel.trim()}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm font-medium text-zinc-400">
              Assign a table above
            </p>
          )}
          {(displayWaiterName || waiterProfile) && (
            <div className="mt-3 flex items-center gap-2">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-200">
                {waiterProfile?.image_url ? (
                  <Image
                    src={waiterProfile.image_url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-zinc-800">
                  {displayWaiterName || waiterProfile?.name}
                </p>
                <p className="text-xs text-zinc-500">
                  Waiter {waiterProfile?.staff_id || waiterStaffId.trim()}
                </p>
              </div>
            </div>
          )}
          <p className="mt-2 text-sm font-bold text-zinc-800">
            {itemCount} item{itemCount === 1 ? "" : "s"}
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
                <p className="mt-0.5 text-xs text-zinc-500">
                  {dish.category} · Qty {dish.qty}
                </p>
              </div>
              <p className="shrink-0 font-extrabold">{formatPrice(dish.price * dish.qty)}</p>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between bg-zinc-50 px-4 py-4">
          <span className="text-base font-extrabold">Total</span>
          <span className="text-lg font-extrabold text-green-600">{formatPrice(total)}</span>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <button
          type="button"
          disabled={!canAct || assigning}
          onClick={assignToAdmin}
          className="w-full rounded-2xl bg-white px-4 py-3.5 text-base font-extrabold text-black disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {assigning ? "Assigning…" : "Assign to admin"}
        </button>
        <button
          type="button"
          disabled={!tableLabel.trim() || downloading}
          onClick={downloadOrderImage}
          className="w-full rounded-2xl bg-green-600 px-4 py-3.5 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {downloading
            ? "Preparing image…"
            : tableLabel.trim()
              ? "Download order image"
              : "Enter table to download"}
        </button>
        {assignSuccess && (
          <p className="text-center text-sm text-green-400">{assignSuccess}</p>
        )}
        {assignError && (
          <p className="text-center text-sm text-red-400">{assignError}</p>
        )}
        {downloadError && (
          <p className="text-center text-sm text-red-400">{downloadError}</p>
        )}
        {!assignSuccess && !assignError && !downloadError && (
          <p className="text-center text-xs text-zinc-500">
            Assign sends table, waiter details, wish list, and timestamp to the admin dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
