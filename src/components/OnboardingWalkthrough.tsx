"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";

type SpotlightRect = { top: number; left: number; width: number; height: number };

interface OnboardingWalkthroughProps {
  ready?: boolean;
  skip?: boolean;
  containerRef?: RefObject<HTMLElement | null>;
  dismissRef?: RefObject<(() => void) | null>;
}

function measureInContainer(
  selector: string,
  container: HTMLElement | null
): SpotlightRect | null {
  const el = document.querySelector(selector);
  if (!el || !container) return null;
  const target = el.getBoundingClientRect();
  const root = container.getBoundingClientRect();
  const pad = 6;
  return {
    top: target.top - root.top - pad,
    left: target.left - root.left - pad,
    width: target.width + pad * 2,
    height: target.height + pad * 2,
  };
}

/** Step 0: dims/blurs around the search pill so the bar stays fully visible. */
function DimAroundRect({ rect }: { rect: SpotlightRect }) {
  const bottom = rect.top + rect.height;
  const right = rect.left + rect.width;
  const panel = "absolute bg-black/72 backdrop-blur-[4px]";

  return (
    <>
      <div className={panel} style={{ top: 0, left: 0, right: 0, height: rect.top }} />
      <div className={panel} style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />
      <div className={panel} style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }} />
      <div className={panel} style={{ top: rect.top, left: right, right: 0, height: rect.height }} />
    </>
  );
}

function SearchPulse({ rect }: { rect: SpotlightRect }) {
  const radius = rect.height / 2;

  return (
    <motion.div
      layout
      className="pointer-events-none absolute z-[2] border-2 border-green-400"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        borderRadius: radius,
      }}
      animate={{
        opacity: [0.35, 1, 0.35],
        scale: [1, 1.04, 1],
      }}
      transition={{ duration: 0.7, ease: "easeInOut", repeat: Infinity }}
    />
  );
}

/** Survives category changes; resets only when the page reloads. */
let walkthroughShownThisLoad = false;

function DeckSpotlight({ rect }: { rect: SpotlightRect }) {
  return (
    <motion.div
      layout
      className="pointer-events-none absolute z-[1]"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        borderRadius: 28,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.78)",
      }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
    />
  );
}

export function OnboardingWalkthrough({
  ready = true,
  skip = false,
  containerRef,
  dismissRef,
}: OnboardingWalkthroughProps) {
  const [step, setStep] = useState<0 | 1 | null>(null);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  const dismiss = useCallback(() => setStep(null), []);

  useEffect(() => {
    if (dismissRef) dismissRef.current = dismiss;
    return () => {
      if (dismissRef) dismissRef.current = null;
    };
  }, [dismiss, dismissRef]);

  useEffect(() => {
    if (!ready || skip) {
      setStep(null);
      return;
    }
    if (walkthroughShownThisLoad) return;
    const timer = window.setTimeout(() => {
      walkthroughShownThisLoad = true;
      setStep(0);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [ready, skip]);

  const refreshRect = useCallback(() => {
    const container = containerRef?.current ?? null;
    if (!container) return;
    setContainerHeight(container.clientHeight);
    if (step === 0) setRect(measureInContainer('[data-walkthrough="search-pill"]', container));
    if (step === 1) setRect(measureInContainer('[data-walkthrough="deck"]', container));
  }, [step, containerRef]);

  useEffect(() => {
    const container = containerRef?.current;
    if (!container || step === null) return;

    const run = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(refreshRect);
      });
    };

    run();
    const ro = new ResizeObserver(run);
    ro.observe(container);
    window.addEventListener("resize", run);
    const t1 = window.setTimeout(run, 150);
    const t2 = window.setTimeout(run, 400);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", run);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [refreshRect, step, containerRef]);

  const finish = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const next = useCallback(() => {
    if (step === 0) setStep(1);
    else finish();
  }, [step, finish]);

  const tooltipTop =
    rect && containerHeight
      ? Math.min(rect.top + rect.height + 16, containerHeight * 0.52)
      : 0;

  return (
    <AnimatePresence>
      {step !== null && rect ? (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`pointer-events-auto absolute inset-0 z-[80] overflow-hidden ${
            step === 1 ? "backdrop-blur-[2px]" : ""
          }`}
        >
          {step === 0 ? (
            <>
              <div className="pointer-events-none absolute inset-0 z-[1]">
                <DimAroundRect rect={rect} />
              </div>
              <SearchPulse rect={rect} />
            </>
          ) : (
            <DeckSpotlight rect={rect} />
          )}

          {step === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-x-0 z-[3] px-6"
              style={{ top: tooltipTop }}
            >
              <div className="mx-auto max-w-[280px] rounded-2xl bg-[#1a1a1a]/95 p-5 text-center ring-1 ring-white/10">
                <p className="text-base font-extrabold text-white">Find your dish</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Use search to jump straight to what you&apos;re craving.
                </p>
                <button
                  type="button"
                  onClick={next}
                  className="mt-4 w-full rounded-full bg-green-500 py-3 text-sm font-bold text-white"
                >
                  Next
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center px-8">
                <div className="relative h-[min(38vh,240px)] w-full max-w-[260px]">
                  <motion.div
                    className="absolute inset-x-4 top-6 h-[min(30vh,200px)] overflow-hidden rounded-[1.75rem] border-2 border-white/90 bg-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
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
              </div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] z-[3] px-6"
              >
                <div className="mx-auto max-w-[280px] rounded-2xl bg-[#1a1a1a]/95 p-5 text-center ring-1 ring-white/10">
                  <p className="text-base font-extrabold text-white">Swipe to browse</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Swipe right to add to wish list · left to skip
                  </p>
                  <button
                    type="button"
                    onClick={finish}
                    className="mt-4 w-full rounded-full bg-green-500 py-3 text-sm font-bold text-white"
                  >
                    Start
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
