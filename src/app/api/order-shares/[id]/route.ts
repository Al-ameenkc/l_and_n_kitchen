import { NextResponse } from "next/server";
import { MENU_IMAGES_BUCKET } from "@/lib/storage";
import type { OrderShareItem } from "@/lib/orderShare";
import { createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const SHARE_PREFIX = "order-shares";

function normalizeItems(raw: unknown): OrderShareItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { id?: unknown; qty?: unknown };
      const id = String(row.id ?? "").trim();
      if (!id) return null;
      const qty = Math.max(1, Math.min(99, Math.round(Number(row.qty) || 1)));
      return { id, qty };
    })
    .filter((item): item is OrderShareItem => Boolean(item));
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const shareId = id.trim().replace(/[^a-zA-Z0-9]/g, "");
  if (!shareId || shareId.length < 8) {
    return NextResponse.json({ error: "Invalid share link." }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.storage
      .from(MENU_IMAGES_BUCKET)
      .download(`${SHARE_PREFIX}/${shareId}.json`);

    if (error || !data) {
      return NextResponse.json({ error: "Order share not found." }, { status: 404 });
    }

    const text = await data.text();
    const parsed = JSON.parse(text) as { items?: unknown };
    const items = normalizeItems(parsed.items);
    if (!items.length) {
      return NextResponse.json({ error: "Order share is empty." }, { status: 404 });
    }

    return NextResponse.json({ id: shareId, items });
  } catch {
    return NextResponse.json({ error: "Could not load order share." }, { status: 400 });
  }
}
