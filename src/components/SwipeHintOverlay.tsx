"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const STORAGE_KEY = "ln-swipe-hint-v2";

interface SwipeHintOverlayProps {
  active: boolean;
}

export function SwipeHintOverlay({ active }: SwipeHintOverlayProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) return;
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) return;

    const timer = window.setTimeout(() => setShow(true), 650);
    return () => window.clearTimeout(timer);
  }, [active]);

  const dismiss = useCallback(() => setShow(false), []);

  useEffect(() => {
    if (!show) return;
    const timer = window.setTimeout(dismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [show, dismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          aria-label="Dismiss swipe tutorial"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={dismiss}
          className="pointer-events-auto absolute inset-0 z-[70] flex flex-col items-center justify-center bg-black/45 px-8 backdrop-blur-[2px]"
        >
          <div className="relative h-[min(38vh,260px)] w-full max-w-[280px]">
            <motion.div
              className="absolute inset-x-4 top-6 h-[min(32vh,220px)] overflow-hidden rounded-[1.75rem] border-2 border-white/90 bg-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
              animate={{ x: [0, 72, 0, -72, 0] }}
              transition={{
                duration: 3.2,
                times: [0, 0.22, 0.45, 0.68, 1],
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 0.4,
              }}
            >
              <div className="h-[55%] bg-zinc-300/40" />
              <div className="flex h-[45%] flex-col justify-center gap-2 px-4">
                <div className="h-3 w-3/4 rounded bg-zinc-400/50" />
                <div className="h-2 w-1/2 rounded bg-zinc-400/30" />
              </div>
            </motion.div>

            <motion.div
              className="absolute right-0 top-[38%] flex h-10 w-10 items-center justify-center rounded-full border border-green-400/40 bg-green-500/25 text-green-400"
              animate={{ opacity: [0.3, 1, 0.3, 0.3, 0.3], scale: [0.9, 1.08, 0.9, 0.9, 0.9] }}
              transition={{ duration: 3.2, times: [0, 0.22, 0.45, 0.68, 1], repeat: Infinity, repeatDelay: 0.4 }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12 21s-7-4.5-9.5-9C.5 8 3 4 7 4c2 0 3.5 1.5 5 3 1.5-1.5 3-3 5-3 4 0 6.5 4 4.5 8C19 16.5 12 21 12 21z" />
              </svg>
            </motion.div>

            <motion.div
              className="absolute left-0 top-[38%] flex h-10 w-10 items-center justify-center rounded-full border border-red-400/40 bg-red-500/25 text-red-400"
              animate={{ opacity: [0.3, 0.3, 0.3, 1, 0.3], scale: [0.9, 0.9, 0.9, 1.08, 0.9] }}
              transition={{ duration: 3.2, times: [0, 0.22, 0.45, 0.68, 1], repeat: Infinity, repeatDelay: 0.4 }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </motion.div>
          </div>

          <motion.p
            className="mt-6 text-center text-sm font-semibold text-white"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            Swipe right to save · Swipe left to skip
          </motion.p>
          <p className="mt-2 text-xs text-zinc-400">Tap anywhere to dismiss</p>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function markSwipeHintSeen() {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, "1");
}
