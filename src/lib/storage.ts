import type { SupabaseClient } from "@supabase/supabase-js";

export const MENU_IMAGES_BUCKET = "menu-images";
export const ORDER_SHARES_BUCKET = "order-shares";

/** Ensures the public Supabase storage bucket exists (creates it if missing). */
export async function ensureMenuImagesBucket(supabase: SupabaseClient) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const exists = buckets?.some(
    (b) => b.id === MENU_IMAGES_BUCKET || b.name === MENU_IMAGES_BUCKET
  );
  if (exists) return;

  const { error } = await supabase.storage.createBucket(MENU_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
  });

  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

/** Private bucket for short QR wish-list payloads (JSON). */
export async function ensureOrderSharesBucket(supabase: SupabaseClient) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const exists = buckets?.some(
    (b) => b.id === ORDER_SHARES_BUCKET || b.name === ORDER_SHARES_BUCKET
  );
  if (exists) return;

  const { error } = await supabase.storage.createBucket(ORDER_SHARES_BUCKET, {
    public: false,
    fileSizeLimit: 1 * 1024 * 1024,
    allowedMimeTypes: ["application/json", "text/plain"],
  });

  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}
