import { createClient } from "@supabase/supabase-js";
import { isSharedProductImage } from "@/lib/store-product-images/public-url";
import {
  catalogIdFromDevicePayload,
  isStoreDeviceCatalogId,
} from "@/services/taller-gestio/storefront-device-id";

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
    if (!isStoreDeviceCatalogId(id) || typeof image !== "string") continue;
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

async function persistImageOnDeviceRows(
  client: NonNullable<ReturnType<typeof socialDb>>,
  shop: string,
  catalogId: string,
  imageUrl: string,
) {
  const { data, error } = await client
    .from("device_stock")
    .select("id, payload")
    .eq("shop_id", shop);
  if (error) return false;
  let saved = false;
  for (const row of data ?? []) {
    const payload =
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : {};
    if (catalogIdFromDevicePayload(payload) !== catalogId) continue;
    const nextPayload = { ...payload, imageUrl };
    const { error: updateError } = await client
      .from("device_stock")
      .update({ payload: nextPayload, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("shop_id", shop);
    if (!updateError) saved = true;
  }
  return saved;
}

export async function writeDeviceCatalogImage(catalogId: string, imageUrl: string): Promise<boolean> {
  if (!isStoreDeviceCatalogId(catalogId) || !isSharedProductImage(imageUrl)) return false;
  const client = socialDb();
  const shop = shopId();
  if (!client || !shop) return false;
  const onRows = await persistImageOnDeviceRows(client, shop, catalogId, imageUrl.trim());
  const images = await readMap(client, shop);
  images[catalogId] = imageUrl.trim();
  const sidecarError = await writeMap(client, shop, images);
  return onRows || !sidecarError;
}
