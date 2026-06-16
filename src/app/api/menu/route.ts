import { NextResponse } from "next/server";
import { getMenuData } from "@/lib/menu-db";

export async function GET() {
  const menu = await getMenuData();
  return NextResponse.json(menu);
}
