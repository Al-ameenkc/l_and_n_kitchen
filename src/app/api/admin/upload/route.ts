import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { ensureMenuImagesBucket, MENU_IMAGES_BUCKET } from "@/lib/storage";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = createServiceClient();

  try {
    await ensureMenuImagesBucket(supabase);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create storage bucket.";
    return NextResponse.json(
      {
        error: `${msg} In Supabase Dashboard → Storage, create a public bucket named "${MENU_IMAGES_BUCKET}".`,
      },
      { status: 500 }
    );
  }

  const { error } = await supabase.storage.from(MENU_IMAGES_BUCKET).upload(path, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });

  if (error) {
    if (/bucket not found/i.test(error.message)) {
      return NextResponse.json(
        {
          error: `Storage bucket "${MENU_IMAGES_BUCKET}" not found. In Supabase Dashboard → Storage → New bucket, name it exactly "${MENU_IMAGES_BUCKET}" and set it to Public.`,
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data } = supabase.storage.from(MENU_IMAGES_BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
