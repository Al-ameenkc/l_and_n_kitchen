"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

interface HeaderBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function HeaderBar({ searchQuery, onSearchChange }: HeaderBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const isExpanded = focused || searchQuery.length > 0;

  return (
    <header className="pointer-events-none relative z-20 shrink-0 bg-transparent px-4 pb-1 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex h-11 w-full items-center gap-2">
        <Image
          src="/images/ChatGPT_Image_Jun_15__2026__08_20_55_PM-removebg-preview.png"
          alt="L&N Kitchen"
          width={52}
          height={22}
          priority
          className="pointer-events-none h-auto w-[16vw] max-w-[52px] min-w-[40px] shrink-0"
        />

        <motion.div
          layout
          initial={false}
          animate={{
            width: isExpanded ? "calc(100% - 3.75rem)" : 124,
          }}
          transition={{
            type: "tween",
            duration: 0.48,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="pointer-events-auto ml-auto flex h-11 min-w-[124px] items-center overflow-hidden rounded-full bg-[#2a2a2a]/95 px-4 backdrop-blur-sm"
        >
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              if (!searchQuery) setFocused(false);
            }}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-sm font-normal text-white placeholder:text-zinc-500 outline-none"
          />
          {searchQuery ? (
            <button
              type="button"
              aria-label="Clear search"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSearchChange("");
                setFocused(false);
                inputRef.current?.blur();
              }}
              className="ml-2 shrink-0 text-xs text-zinc-400"
            >
              ✕
            </button>
          ) : (
            <button
              type="button"
              aria-label="Search"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setFocused(true);
                inputRef.current?.focus();
              }}
              className="ml-2 shrink-0 text-zinc-400"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </button>
          )}
        </motion.div>
      </div>
    </header>
  );
}
