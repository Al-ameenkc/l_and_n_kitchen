"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MenuData } from "@/types/menu";
import { createBrowserClient } from "@/lib/supabase/client";

async function fetchMenu(): Promise<MenuData> {
  const res = await fetch("/api/menu", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load menu");
  return res.json();
}

export function useMenuData() {
  const [menuData, setMenuData] = useState<MenuData>({
    categories: [],
    dishes: [],
    categoryImages: {},
  });
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchMenu();
      setMenuData(data);
    } catch {
      /* keep last good state */
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      void refresh();
    }, 120);
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;

    refresh().then(() => {
      if (cancelled) return;
    });

    const supabase = createBrowserClient();
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;

    if (supabase) {
      channel = supabase
        .channel("menu-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "dishes" },
          () => scheduleRefresh()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "categories" },
          () => scheduleRefresh()
        )
        .subscribe();
    }

    const onFocus = () => scheduleRefresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    });

    const poll = window.setInterval(() => {
      void refresh();
    }, 15000);

    return () => {
      cancelled = true;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      if (channel && supabase) {
        void supabase.removeChannel(channel);
      }
    };
  }, [refresh, scheduleRefresh]);

  return { menuData, loading, refresh };
}
