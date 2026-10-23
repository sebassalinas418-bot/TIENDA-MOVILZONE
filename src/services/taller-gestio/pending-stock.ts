import { createClient } from "@supabase/supabase-js";
import { sumReservedByProduct } from "@/lib/web-pending-stock/availability";
import {
  isStoreDeviceCatalogId,
  readDeviceStorefrontProducts,
} from "@/services/taller-gestio/storefront-devices";

export type PendingSaleItem = {
  productId: string;
  quantity: number;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveShopId() {
  const client = adminClient();
  if (!client) return null;
  const preferred = process.env.TALLER_SHOP_ID?.trim();
  if (preferred) return preferred;
  const { data, error } = await client
    .from("shops")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

/** Unidades comprometidas en web_orders pendientes. No toca products.stock. */
export async function readPendingReservations(): Promise<Record<string, number>> {
  const client = adminClient();
  if (!client) return {};
  const shopId = await resolveShopId();
  if (!shopId) return {};
  const { data, error } = await client
    .from("web_orders")
    .select("items")
    .eq("shop_id", shopId)
    .eq("status", "pendiente")
    .eq("stock_deducted", false);
  if (error) throw new Error(error.message);
  return sumReservedByProduct(data ?? []);
}

export async function ensureWebItemsAvailable(items: PendingSaleItem[]) {
  const client = adminClient();
  if (!client) return { ok: false as const, reason: "sin-conexion" as const };
  const shopId = await resolveShopId();
  if (!shopId) return { ok: false as const, reason: "sin-taller" as const };

  const needed: Record<string, number> = {};
  for (const item of items) {
    const productId = String(item.productId ?? "").trim();
    const quantity = Math.floor(Number(item.quantity) || 0);
    if (!productId || quantity <= 0) continue;
    needed[productId] = (needed[productId] ?? 0) + quantity;
  }
  const ids = Object.keys(needed);
  if (!ids.length) return { ok: false as const, reason: "reservado" as const };

  const accessoryIds = ids.filter((id) => !isStoreDeviceCatalogId(id));
  const deviceIds = ids.filter(isStoreDeviceCatalogId);

  const reserved = await readPendingReservations();
  const physical: Record<string, number> = {};

  if (accessoryIds.length) {
    const stockResult = await client
      .from("products")
      .select("id, stock")
      .eq("shop_id", shopId)
      .in("id", accessoryIds);
    if (stockResult.error) throw new Error(stockResult.error.message);
    for (const row of stockResult.data ?? []) {
      physical[String(row.id)] = Math.max(0, Math.floor(Number(row.stock) || 0));
    }
  }

  if (deviceIds.length) {
    const listed = await readDeviceStorefrontProducts();
    for (const item of listed) physical[item.id] = item.stock;
  }

  for (const [productId, quantity] of Object.entries(needed)) {
    const available = Math.max(0, (physical[productId] ?? 0) - (reserved[productId] ?? 0));
    if (quantity > available) return { ok: false as const, reason: "reservado" as const };
  }
  return { ok: true as const };
}
