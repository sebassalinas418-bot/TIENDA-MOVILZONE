import { createClient } from "@supabase/supabase-js";
import { writeDeviceCatalogImage } from "@/lib/store-device-images/server";
import { isSharedProductImage } from "@/lib/store-product-images/public-url";
import { isStoreDeviceCatalogId } from "@/services/taller-gestio/storefront-device-id";

/**
 * Persistencia única de foto de catálogo.
 * Productos → products.image_url
 * Celulares/Equipos (eq-) → device_stock.payload.imageUrl
 * Categorías nuevas de inventario regular reutilizan el mismo camino de productos.
 */
export async function persistCatalogImageUrl(productId: string, imageUrl: string) {
  if (!productId || productId.startsWith("extra-") || !isSharedProductImage(imageUrl)) {
    return false;
  }
  if (isStoreDeviceCatalogId(productId)) {
    return writeDeviceCatalogImage(productId, imageUrl);
  }
  return writeInventoryProductImageUrl(productId, imageUrl);
}

function socialDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function shopId() {
  return process.env.TALLER_SHOP_ID?.trim() || "";
}

async function writeInventoryProductImageUrl(productId: string, imageUrl: string) {
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
