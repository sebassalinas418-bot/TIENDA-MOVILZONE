import { createClient } from "@supabase/supabase-js";
import { isSharedProductImage } from "@/lib/store-product-images/public-url";

const DEVICE_CATALOG_PREFIX = "eq-";

const BUCKET = "product-images";

function socialDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function shopId() {
  return process.env.TALLER_SHOP_ID?.trim() || "";
}

function objectPath(shop: string) {
  return `${shop}/store-device-catalog-images.json`;
}

function asImageMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const next: Record<string, string> = {};
  for (const [id, image] of Object.entries(value as Record<string, unknown>)) {
    if (!id.startsWith(DEVICE_CATALOG_PREFIX) || typeof image !== "string") continue;
    const url = image.trim();
    if (isSharedProductImage(url)) next[id] = url;
  }
  return next;
}

async function readMap(
  client: NonNullable<ReturnType<typeof socialDb>>,
  shop: string,
): Promise<Record<string, string>> {
  const { data, error } = await client.storage.from(BUCKET).download(objectPath(shop));
  if (error || !data) return {};
  try {
    return asImageMap(JSON.parse(await data.text()));
  } catch {
    return {};
  }
}

async function writeMap(
  client: NonNullable<ReturnType<typeof socialDb>>,
  shop: string,
  images: Record<string, string>,
) {
  const body = Buffer.from(JSON.stringify(images));
  const path = objectPath(shop);
  const tryUpload = (contentType: string) =>
    client.storage.from(BUCKET).upload(path, body, { contentType, upsert: true });

  let { error } = await tryUpload("image/jpeg");
  if (error) {
    ({ error } = await tryUpload("application/json"));
  }
  return error;
}

export async function readDeviceCatalogImages(): Promise<Record<string, string>> {
  const client = socialDb();
  const shop = shopId();
  if (!client || !shop) return {};
  return readMap(client, shop);
}

export async function writeDeviceCatalogImage(catalogId: string, imageUrl: string): Promise<boolean> {
  if (!catalogId.startsWith(DEVICE_CATALOG_PREFIX) || !isSharedProductImage(imageUrl)) return false;
  const client = socialDb();
  const shop = shopId();
  if (!client || !shop) return false;
  const images = await readMap(client, shop);
  images[catalogId] = imageUrl.trim();
  const error = await writeMap(client, shop, images);
  return !error;
}
