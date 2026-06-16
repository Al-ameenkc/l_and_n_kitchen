"use client";

import { useMenuData } from "@/hooks/useMenuData";
import { MenuApp } from "./MenuApp";

export function MenuAppLoader() {
  const { menuData, loading } = useMenuData();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#111111]">
        <p className="text-sm font-medium text-zinc-500">Loading menu…</p>
      </div>
    );
  }

  return <MenuApp menuData={menuData} />;
}
