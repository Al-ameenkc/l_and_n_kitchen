import { NextResponse } from "next/server";
import { ensureMenuImagesBucket, MENU_IMAGES_BUCKET } from "@/lib/storage";
import type { OrderShareItem } from "@/lib/orderShare";
import { createServiceClient } from "@/lib/supabase/server";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { items?: unknown };
    const items = normalizeItems(body.items);
    if (!items.length) {
      return NextResponse.json({ error: "No items to share." }, { status: 400 });
    }

    const supabase = createServiceClient();
    await ensureMenuImagesBucket(supabase);

    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const payload = JSON.stringify({
      items,
      created_at: new Date().toISOString(),
    });

    const { error } = await supabase.storage
      .from(MENU_IMAGES_BUCKET)
      .upload(`${SHARE_PREFIX}/${id}.json`, Buffer.from(payload, "utf8"), {
        contentType: "application/json",
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create share link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
