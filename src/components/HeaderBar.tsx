"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import type { Dish } from "@/types/menu";
import { formatPrice } from "@/utils/formatPrice";
import { searchDishes } from "@/utils/searchDishes";

interface HeaderBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dishes: Dish[];
}

export function HeaderBar({
  searchQuery,
  onSearchChange,
  dishes,
}: HeaderBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const isExpanded = focused || searchQuery.length > 0;

  const suggestions = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    return searchDishes(dishes, q).slice(0, 12);
  }, [dishes, searchQuery]);

  const showDropdown = focused && searchQuery.trim().length > 0;

  useEffect(() => {
    if (!focused) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setFocused(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [focused]);

  return (
    <header className="pointer-events-none relative z-50 shrink-0 bg-transparent px-4 pb-1 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex h-11 w-full items-center gap-2">
        <Image
          src="/images/ChatGPT_Image_Jun_15__2026__08_20_55_PM-removebg-preview.png"
          alt="L&N Kitchen"
          width={52}
          height={22}
          priority
          className="pointer-events-none h-auto w-[16vw] max-w-[52px] min-w-[40px] shrink-0"
        />

        <div ref={wrapRef} className="pointer-events-auto relative ml-auto flex min-w-0 flex-1 justify-end">
          <motion.div
            layout
            initial={false}
            animate={{
              width: isExpanded ? "100%" : 124,
            }}
            transition={{
              type: "tween",
              duration: 0.48,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex h-11 max-w-full items-center overflow-hidden rounded-full bg-[#2a2a2a]/95 px-4 backdrop-blur-sm"
          >
            <input
              id="menu-search"
              name="menu-search"
              ref={inputRef}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              role="combobox"
              aria-expanded={showDropdown}
              aria-controls="menu-search-suggestions"
              aria-autocomplete="list"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                if (!searchQuery.trim()) setFocused(false);
              }}
              placeholder="Search"
              className="menu-search-input min-w-0 flex-1 bg-transparent text-sm font-normal text-white placeholder:text-zinc-500 outline-none"
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

          {showDropdown && (
            <div
              id="menu-search-suggestions"
              role="listbox"
              className="absolute right-0 top-[calc(100%+0.4rem)] z-[60] w-full min-w-[16rem] overflow-hidden rounded-2xl bg-[#1c1c1c] shadow-[0_16px_40px_rgba(0,0,0,0.55)] ring-1 ring-zinc-700/70"
            >
              {suggestions.length === 0 ? (
                <p className="px-4 py-3 text-sm text-zinc-500">No dishes match “{searchQuery.trim()}”</p>
              ) : (
                <ul className="max-h-[min(50vh,18rem)] overflow-y-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {suggestions.map((dish) => (
                    <li key={dish.id} role="option">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onSearchChange(dish.name);
                          setFocused(false);
                          inputRef.current?.blur();
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5 active:bg-white/10"
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-700">
                          <Image
                            src={dish.image}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{dish.name}</p>
                          <p className="truncate text-xs text-zinc-500">{dish.category}</p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-green-400">
                          {formatPrice(dish.price)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
