"use client";

import { useEffect, useState } from "react";
import type { MenuData } from "@/types/menu";

export function useMenuData() {
  const [menuData, setMenuData] = useState<MenuData>({
    categories: [],
    dishes: [],
    categoryImages: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/menu")
      .then((r) => r.json())
      .then((data: MenuData) => {
        if (!cancelled) {
          setMenuData(data);
        }
      })
      .catch(() => {
        /* keep empty state */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { menuData, loading };
}
