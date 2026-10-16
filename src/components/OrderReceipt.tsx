"use client";

import Image from "next/image";
import type { DbOrder } from "@/lib/orders-db";
import { formatOrderNumber, RESTAURANT } from "@/lib/restaurant";
import { formatPrice } from "@/utils/formatPrice";

interface OrderReceiptProps {
  order: DbOrder;
  className?: string;
  receiptId?: string;
}

export function OrderReceipt({ order, className = "", receiptId = "order-receipt" }: OrderReceiptProps) {
  return (
    <div
      className={`mx-auto w-full max-w-sm bg-white px-6 py-8 text-black ${className}`}
      id={receiptId}
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative h-16 w-40">
          <Image
            src={RESTAURANT.logoPath}
            alt={RESTAURANT.name}
            fill
            className="object-contain"
            unoptimized
          />
        </div>
        <p className="mt-4 text-sm font-semibold text-zinc-800">{RESTAURANT.name}</p>
        <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-zinc-600">
          {RESTAURANT.address}
        </p>
      </div>

      <div className="mt-6 border-y border-dashed border-zinc-300 py-4 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Order ID
        </p>
        <p className="mt-1 text-2xl font-extrabold tracking-wider text-zinc-900">
          {formatOrderNumber(order.order_number)}
        </p>
        {order.table_label ? (
          <p className="mt-2 text-xs text-zinc-500">{order.table_label}</p>
        ) : null}
      </div>

      <ul className="mt-5 space-y-3">
        {order.items.map((item, index) => (
          <li key={`${item.id}-${index}`} className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-tight text-zinc-900">{item.name}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {item.category} · Qty {item.qty}
              </p>
            </div>
            <p className="shrink-0 font-extrabold text-zinc-900">
              {formatPrice(item.price * item.qty)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-4">
        <span className="text-base font-extrabold text-zinc-900">Total</span>
        <span className="text-lg font-extrabold text-green-700">
          {formatPrice(Number(order.total))}
        </span>
      </div>

      <p className="mt-8 text-center text-sm leading-relaxed text-zinc-600">
        {RESTAURANT.receiptThanks}
      </p>
    </div>
  );
}

export function printOrderReceipt(order: DbOrder, receiptId = "order-receipt"): void {
  if (!order.order_number) return;

  const receiptRoot = document.getElementById(receiptId);
  if (!receiptRoot) return;

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=480,height=720");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt ${formatOrderNumber(order.order_number)}</title>
        <style>
          body { margin: 0; font-family: Calibri, Arial, sans-serif; background: #fff; color: #111; }
          img { max-width: 160px; height: auto; }
        </style>
      </head>
      <body>${receiptRoot.outerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}
