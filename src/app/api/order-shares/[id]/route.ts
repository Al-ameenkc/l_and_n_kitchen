import { NextResponse } from "next/server";
import { ensureOrderSharesBucket, ORDER_SHARES_BUCKET } from "@/lib/storage";
import type { OrderShareItem } from "@/lib/orderShare";
import {
  getOrderByShareId,
  isMissingOrdersSchemaError,
  publicOrderPayload,
  writeOrderSharePayload,
} from "@/lib/orders-db";
import { createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

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

    try {
      const linked = await getOrderByShareId(shareId, supabase);
      if (linked) {
        return NextResponse.json({
          id: shareId,
          items: linked.items.map((item) => ({ id: item.id, qty: item.qty })),
          order: publicOrderPayload(linked),
          customer_token: linked.customer_token,
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (!isMissingOrdersSchemaError(message)) throw e;
    }

    await ensureOrderSharesBucket(supabase);
    const { data, error } = await supabase.storage
      .from(ORDER_SHARES_BUCKET)
      .download(`${shareId}.json`);

    if (error || !data) {
      return NextResponse.json({ error: "Order share not found." }, { status: 404 });
    }

    const text = await data.text();
    const parsed = JSON.parse(text) as {
      items?: unknown;
      order_id?: string;
      customer_token?: string;
      locked_items?: unknown;
      status?: string;
      total?: number;
    };
    const items = normalizeItems(parsed.items);
    if (!items.length) {
      return NextResponse.json({ error: "Order share is empty." }, { status: 404 });
    }

    return NextResponse.json({
      id: shareId,
      items,
      order_id: parsed.order_id ?? null,
      customer_token: parsed.customer_token ?? null,
      locked_items: parsed.locked_items ?? [],
      status: parsed.status ?? null,
      total: parsed.total ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Could not load order share." }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const shareId = id.trim().replace(/[^a-zA-Z0-9]/g, "");
  if (!shareId || shareId.length < 8) {
    return NextResponse.json({ error: "Invalid share link." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { items?: unknown };
    const items = normalizeItems(body.items);
    if (!items.length) {
      return NextResponse.json({ error: "No items to share." }, { status: 400 });
    }

    const supabase = createServiceClient();

    try {
      const linked = await getOrderByShareId(shareId, supabase);
      if (linked) {
        return NextResponse.json({
          id: shareId,
          items: linked.items.map((item) => ({ id: item.id, qty: item.qty })),
          order: publicOrderPayload(linked),
          customer_token: linked.customer_token,
          linked: true,
        });
      }
    } catch {
      /* share not linked yet */
    }

    await writeOrderSharePayload(
      shareId,
      {
        items,
        created_at: new Date().toISOString(),
      },
      supabase
    );

    return NextResponse.json({ id: shareId, items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update share";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
