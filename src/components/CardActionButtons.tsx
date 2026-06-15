"use client";

import { motion } from "framer-motion";

interface CardActionButtonsProps {
  onReject: () => void;
  onOpenWishlist: () => void;
  onOpenTrash?: () => void;
  disabled?: boolean;
  dragX?: number;
  wishPulse?: boolean;
  rejectPulse?: boolean;
}

export function CardActionButtons({
  onReject,
  onOpenWishlist,
  onOpenTrash,
  disabled,
  dragX = 0,
  wishPulse = false,
  rejectPulse = false,
}: CardActionButtonsProps) {
  const wishActive = dragX > 35 || wishPulse;
  const rejectActive = dragX < -35 || rejectPulse;

  return (
    <>
      <motion.button
        type="button"
        aria-label="Reject dish"
        disabled={disabled}
        onClick={onReject}
        onContextMenu={(e) => {
          e.preventDefault();
          onOpenTrash?.();
        }}
        animate={{
          scale: rejectActive ? 1.06 : 1,
          backgroundColor: rejectActive ? "rgba(239, 68, 68, 0.55)" : "rgba(239, 68, 68, 0.22)",
        }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        className="absolute left-3 top-[34%] z-[55] flex h-14 w-14 items-center justify-center rounded-full border border-red-400/35 text-red-500 backdrop-blur-md disabled:opacity-30"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </motion.button>

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
  count: number;
  onOpen: () => void;
}

export function WishListBar({ count, onOpen }: WishListBarProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center bg-transparent px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
      <button
        type="button"
        onClick={onOpen}
        className="pointer-events-auto flex w-auto min-w-[11.5rem] max-w-[16.5rem] items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-extrabold text-black shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition active:scale-[0.98]"
      >
        My Wish List
        {count > 0 && (
          <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white">
            {count}
          </span>
        )}
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#22c55e" strokeWidth="2">
          <path d="M12 21s-7-4.5-9.5-9C.5 8 3 4 7 4c2 0 3.5 1.5 5 3 1.5-1.5 3-3 5-3 4 0 6.5 4 4.5 8C19 16.5 12 21 12 21z" />
        </svg>
      </button>
    </div>
  );
}
