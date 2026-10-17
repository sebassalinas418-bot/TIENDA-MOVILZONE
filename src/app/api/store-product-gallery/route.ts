import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canAccessStoreRedesRequest } from "@/lib/store-redes/access";
import { normalizeExtraImages } from "@/lib/store-product-images/extras";

const BUCKET = "product-images";
const noStore = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
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

function objectPath() {
  return `${shopId()}/store-galleries.json`;
}

async function readGalleries(): Promise<Record<string, string[]>> {
  const client = socialDb();
  const shop = shopId();
  if (!client || !shop) return {};
  const { data, error } = await client.storage.from(BUCKET).download(objectPath());
  if (error || !data) return {};
  try {
    const parsed = JSON.parse(await data.text()) as Record<string, unknown>;
    const next: Record<string, string[]> = {};
    for (const [id, value] of Object.entries(parsed ?? {})) {
      const extras = normalizeExtraImages(value);
      if (id && extras.length) next[id] = extras;
    }
    return next;
  } catch {
    return {};
  }
}

export async function GET() {
  await connection();
  const galleries = await readGalleries();
  return Response.json({ ok: true, galleries }, { headers: noStore });
}

export async function PUT(request: Request) {
  await connection();
  if (!canAccessStoreRedesRequest(request)) {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 401, headers: noStore });
  }
  const body = (await request.json()) as { productId?: string; extras?: unknown };
  const productId = body.productId?.trim() ?? "";
  if (!productId || productId.startsWith("extra-")) {
    return Response.json({ ok: false, error: "Falta el producto." }, { status: 400, headers: noStore });
  }
  const extras = normalizeExtraImages(body.extras);
  const client = socialDb();
  const shop = shopId();
  if (!client || !shop) {
    return Response.json({ ok: false, error: "Falta conexión de Storage." }, { status: 500, headers: noStore });
  }
  const galleries = await readGalleries();
  if (extras.length) galleries[productId] = extras;
  else delete galleries[productId];
  const { error } = await client.storage.from(BUCKET).upload(
    objectPath(),
    Buffer.from(JSON.stringify(galleries)),
    { contentType: "application/json", upsert: true },
  );
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 502, headers: noStore });
  }
  return Response.json({ ok: true, extras }, { headers: noStore });
}
