import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { canAccessStoreRedesRequest } from "@/lib/store-redes/access";

const BUCKET = "product-images";
const MAX_BYTES = 3 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  await connection();
  if (!canAccessStoreRedesRequest(request)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Archivo requerido." }, { status: 400 });
  }
  const ext = TYPES[file.type];
  if (!ext) {
    return Response.json({ error: "Usá JPG, PNG o WebP." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "La imagen no puede superar 3 MB." }, { status: 413 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const shopId = process.env.TALLER_SHOP_ID?.trim();
  if (!url || !key || !shopId) {
    return Response.json({ error: "Falta conexión de Storage." }, { status: 500 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const objectPath = `${shopId}/${randomUUID()}.${ext}`;
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await client.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: file.type,
    upsert: true,
  });
  if (error) {
    return Response.json({ error: `Storage: ${error.message}` }, { status: 502 });
  }

  const { data } = client.storage.from(BUCKET).getPublicUrl(objectPath);
  const publicUrl = data?.publicUrl?.trim() ?? "";
  if (!/^https?:\/\//i.test(publicUrl)) {
    return Response.json({ error: "No se obtuvo la URL pública de Storage." }, { status: 502 });
  }

  return Response.json({ url: publicUrl });
}
