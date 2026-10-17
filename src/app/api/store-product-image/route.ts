import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { canAccessStoreRedesRequest } from "@/lib/store-redes/access";
import { isSharedProductImage } from "@/lib/store-product-images/public-url";

const BUCKET = "product-images";
const MAX_BYTES = 20 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function socialDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function shopId() {
  return process.env.TALLER_SHOP_ID?.trim() || "";
}

async function writeProductImageUrl(productId: string, imageUrl: string) {
  if (!productId || productId.startsWith("extra-") || !isSharedProductImage(imageUrl)) return false;
  const client = socialDb();
  const shop = shopId();
  if (!client || !shop) return false;
  const { error } = await client
    .from("products")
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("shop_id", shop);
  return !error;
}

export async function POST(request: Request) {
  await connection();
  if (!canAccessStoreRedesRequest(request)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const productId = String(form.get("productId") ?? "").trim();
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

  const client = socialDb();
  const shop = shopId();
  if (!client || !shop) {
    return Response.json({ error: "Falta conexión de Storage." }, { status: 500 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const objectPath = `${shop}/${randomUUID()}.${ext}`;
  const { error } = await client.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: file.type,
    upsert: true,
  });
  if (error) {
    return Response.json({ error: `Storage: ${error.message}` }, { status: 502 });
  }

  const { data } = client.storage.from(BUCKET).getPublicUrl(objectPath);
  const publicUrl = data?.publicUrl?.trim() ?? "";
  if (!isSharedProductImage(publicUrl)) {
    return Response.json({ error: "No se obtuvo la URL pública de Storage." }, { status: 502 });
  }

  const saved = productId ? await writeProductImageUrl(productId, publicUrl) : false;
  return Response.json({ url: publicUrl, saved });
}

export async function PUT(request: Request) {
  await connection();
  if (!canAccessStoreRedesRequest(request)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }
  const body = (await request.json()) as { productId?: string; image?: string };
  const productId = body.productId?.trim() ?? "";
  const image = body.image?.trim() ?? "";
  if (!productId || !isSharedProductImage(image)) {
    return Response.json({ error: "Falta producto o URL pública." }, { status: 400 });
  }
  const saved = await writeProductImageUrl(productId, image);
  if (!saved) {
    return Response.json({ error: "No se pudo guardar image_url en el producto." }, { status: 502 });
  }
  return Response.json({ ok: true, url: image });
}
