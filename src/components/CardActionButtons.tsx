"use client";

import { motion } from "framer-motion";

interface CardActionButtonsProps {
  onOpenTrash: () => void;
  onOpenWishlist: () => void;
  trashCount?: number;
  disabled?: boolean;
  dragX?: number;
  wishPulse?: boolean;
  rejectPulse?: boolean;
}

export function CardActionButtons({
  onOpenTrash,
  onOpenWishlist,
  trashCount = 0,
  disabled,
  dragX = 0,
  wishPulse = false,
  rejectPulse = false,
}: CardActionButtonsProps) {
  const wishActive = dragX > 35 || wishPulse;
  const rejectActive = dragX < -35 || rejectPulse;

  return (
    <>
      <div className="absolute left-3 top-[34%] z-[55] flex flex-col items-center">
        <motion.button
          type="button"
          aria-label="View dismissed dishes"
          onClick={onOpenTrash}
          animate={{
            scale: rejectActive ? 1.06 : 1,
            backgroundColor: rejectActive ? "rgba(239, 68, 68, 0.55)" : "rgba(239, 68, 68, 0.22)",
          }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-red-400/35 text-red-500 backdrop-blur-md"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </motion.button>
        {trashCount > 0 && (
          <span className="mt-1 min-w-[1.25rem] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
            {trashCount}
          </span>
        )}
      </div>

      <motion.button
        type="button"
        aria-label="Open wish list"
        disabled={disabled}
        onClick={onOpenWishlist}
        animate={{
          scale: wishActive ? 1.06 : 1,
          backgroundColor: wishActive ? "rgba(34, 197, 94, 0.58)" : "rgba(34, 197, 94, 0.22)",
        }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        className="absolute right-3 top-[34%] z-[55] flex h-14 w-14 items-center justify-center rounded-full border border-green-400/35 backdrop-blur-md disabled:opacity-30"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7 transition-colors"
          fill={wishActive ? "#22c55e" : "none"}
          stroke="#22c55e"
          strokeWidth="2"
        >
          <path d="M12 21s-7-4.5-9.5-9C.5 8 3 4 7 4c2 0 3.5 1.5 5 3 1.5-1.5 3-3 5-3 4 0 6.5 4 4.5 8C19 16.5 12 21 12 21z" />
        </svg>
      </motion.button>
    </>
  );
}

interface WishListBarProps {
  wishlistCount: number;
  orderCount?: number;
  hasOrder?: boolean;
  onOpenWishlist: () => void;
  onOpenOrders?: () => void;
}

function CartIcon({ className, stroke = "currentColor" }: { className?: string; stroke?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke={stroke} strokeWidth="2">
      <circle cx="9" cy="20" r="1.5" fill={stroke} stroke="none" />
      <circle cx="17" cy="20" r="1.5" fill={stroke} stroke="none" />
      <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OrdersIcon({ className, stroke = "currentColor" }: { className?: string; stroke?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke={stroke} strokeWidth="2">
      <path d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01" strokeLinecap="round" />
    </svg>
  );
}

export function WishListBar({
  wishlistCount,
  orderCount = 0,
  hasOrder = false,
  onOpenWishlist,
  onOpenOrders,
}: WishListBarProps) {
  const count = hasOrder ? orderCount : wishlistCount;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center bg-transparent px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
      <button
        type="button"
        onClick={hasOrder ? onOpenOrders : onOpenWishlist}
        className={`pointer-events-auto flex w-auto min-w-[11rem] max-w-[16rem] items-center justify-center gap-2 rounded-full px-7 py-3 text-[0.95rem] font-extrabold shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition active:scale-[0.98] ${
          hasOrder
            ? "bg-[#2a2a2a] text-white ring-1 ring-white/10"
            : "bg-white text-black"
        }`}
      >
        {hasOrder ? "My Orders" : "My Wish List"}
        {count > 0 && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              hasOrder ? "bg-white/15 text-white" : "bg-green-500 text-white"
            }`}
          >
            {count}
          </span>
        )}
        {hasOrder ? (
          <OrdersIcon className="h-5 w-5" stroke="currentColor" />
        ) : (
          <CartIcon className="h-5 w-5" stroke="#22c55e" />
        )}
      </button>
    </div>
  );
}
