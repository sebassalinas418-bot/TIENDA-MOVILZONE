import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describeStock, type Product } from "@/data/products";
import { readDeviceCatalogImages } from "@/lib/store-device-images/server";
import { isSharedProductImage } from "@/lib/store-product-images/public-url";
import { defaultCategoryImage } from "@/services/taller-gestio/categories";

export const STORE_DEVICE_ID_PREFIX = "eq-";

const CELULARES = {
  category: "Celulares",
  categoryId: "celulares",
  image: defaultCategoryImage("celulares"),
} as const;

type DevicePayload = {
  brand?: unknown;
  model?: unknown;
  condition?: unknown;
  status?: unknown;
  color?: unknown;
  storage?: unknown;
  notes?: unknown;
  salePrice?: unknown;
  costPrice?: unknown;
  precio_costo_usd?: unknown;
  margen_ganancia?: unknown;
};

type DeviceStockRow = {
  id: string;
  device_code: string;
  payload: DevicePayload | null;
  precio_costo_usd?: number | null;
  margen_ganancia?: number | null;
};

type CatalogDevice = {
  rowId: string;
  catalogId: string;
  brand: string;
  model: string;
  condition: string;
  status: string;
  color: string;
  storage: string;
  notes: string;
  saleArs: number;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveShopId(client: SupabaseClient) {
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

export function isStoreDeviceCatalogId(id: string) {
  return id.startsWith(STORE_DEVICE_ID_PREFIX);
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function slugPart(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "x"
  );
}

function catalogIdFor(device: {
  brand: string;
  model: string;
  color: string;
  storage: string;
  condition: string;
}) {
  return `${STORE_DEVICE_ID_PREFIX}${[
    slugPart(device.brand),
    slugPart(device.model),
    slugPart(device.color),
    slugPart(device.storage),
    slugPart(device.condition),
  ].join("-")}`;
}

function subcategoryId(condition: string) {
  return condition.toLowerCase() === "usado" ? "celulares-usados" : "celulares-nuevos";
}

function saleArsFor(
  payload: DevicePayload,
  row: DeviceStockRow,
  quote: number,
) {
  const costUsdStored = asNumber(payload.precio_costo_usd ?? row.precio_costo_usd);
  const marginStored = payload.margen_ganancia ?? row.margen_ganancia;
  const hasUsd = costUsdStored > 0;
  const costUsd =
    hasUsd ? costUsdStored : quote > 0 && asNumber(payload.costPrice) > 0 ? asNumber(payload.costPrice) / quote : 0;
  const hasMargin = Number.isFinite(Number(marginStored));
  const costArs = asNumber(payload.costPrice);
  const saleStored = asNumber(payload.salePrice);
  const marginPercent = hasMargin
    ? Math.max(0, Number(marginStored))
    : costArs > 0 && saleStored > 0
      ? ((saleStored - costArs) / costArs) * 100
      : 0;
  if (quote > 0 && costUsd > 0) {
    return Math.max(0, Math.round(costUsd * (1 + marginPercent / 100) * quote));
  }
  if (saleStored >= 1000) return Math.round(saleStored);
  return 0;
}

async function readCriptoVenta() {
  try {
    const response = await fetch("https://dolarapi.com/v1/dolares/cripto", {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return 0;
    const body = (await response.json()) as { venta?: unknown };
    const venta = Number(body.venta);
    return Number.isFinite(venta) && venta > 0 ? venta : 0;
  } catch {
    return 0;
  }
}

function mapRow(row: DeviceStockRow, quote: number): CatalogDevice | null {
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  const brand = asText(payload.brand);
  const model = asText(payload.model);
  if (!brand && !model) return null;
  const condition = asText(payload.condition) === "Usado" ? "Usado" : "Nuevo";
  const status = asText(payload.status) || "En stock";
  const color = asText(payload.color);
  const storage = asText(payload.storage);
  const device = { brand, model, color, storage, condition };
  return {
    rowId: row.id,
    catalogId: catalogIdFor(device),
    brand,
    model,
    condition,
    status,
    color,
    storage,
    notes: asText(payload.notes),
    saleArs: saleArsFor(payload, row, quote),
  };
}

async function loadDeviceRows(client: SupabaseClient, shopId: string): Promise<DeviceStockRow[]> {
  const full = await client
    .from("device_stock")
    .select("id, device_code, payload, precio_costo_usd, margen_ganancia")
    .eq("shop_id", shopId);
  if (!full.error) return (full.data ?? []) as DeviceStockRow[];
  const basic = await client.from("device_stock").select("id, device_code, payload").eq("shop_id", shopId);
  if (basic.error) throw new Error(basic.error.message);
  return (basic.data ?? []) as DeviceStockRow[];
}

function inStockDevices(rows: DeviceStockRow[], quote: number) {
  return rows
    .map((row) => mapRow(row, quote))
    .filter((item): item is CatalogDevice => item !== null && item.status === "En stock");
}

export async function readDeviceStorefrontProducts(): Promise<Product[]> {
  const client = adminClient();
  if (!client) return [];
  const shopId = await resolveShopId(client);
  if (!shopId) return [];
  const [quote, rows, catalogImages] = await Promise.all([
    readCriptoVenta(),
    loadDeviceRows(client, shopId),
    readDeviceCatalogImages(),
  ]);
  const grouped = new Map<string, CatalogDevice[]>();
  for (const item of inStockDevices(rows, quote)) {
    const list = grouped.get(item.catalogId) ?? [];
    list.push(item);
    grouped.set(item.catalogId, list);
  }

  const products: Product[] = [];
  for (const [id, units] of grouped) {
    const first = units[0];
    if (!first) continue;
    const priced = units.map((unit) => unit.saleArs).filter((price) => price > 0);
    const price = priced.length ? Math.min(...priced) : 0;
    if (price <= 0) continue;
    const stock = units.length;
    const described = describeStock(stock);
    const specs = [first.color, first.storage].filter(Boolean).join(" · ");
    const title = `${first.brand} ${first.model}`.trim();
    const details = [first.condition, specs, first.notes].filter(Boolean).join(" · ");
    const catalogImage = catalogImages[id];
    products.push({
      id,
      title: specs ? `${title} (${specs})` : title,
      category: CELULARES.category,
      categoryId: CELULARES.categoryId,
      subcategoryId: subcategoryId(first.condition),
      brand: first.brand || "Genérico",
      price,
      image: isSharedProductImage(catalogImage) ? catalogImage : CELULARES.image,
      stock,
      stockLabel: described.stockLabel,
      inStock: described.inStock,
      onSale: false,
      isNew: first.condition === "Nuevo",
      details: details || undefined,
    });
  }
  return products.sort((a, b) => a.title.localeCompare(b.title, "es"));
}

export async function markDeviceCatalogUnitsSold(catalogId: string, quantity: number): Promise<boolean> {
  if (!isStoreDeviceCatalogId(catalogId) || quantity <= 0) return false;
  const client = adminClient();
  if (!client) return false;
  const shopId = await resolveShopId(client);
  if (!shopId) return false;
  const quote = await readCriptoVenta();
  const rows = await loadDeviceRows(client, shopId);
  const matches = inStockDevices(rows, quote).filter((item) => item.catalogId === catalogId);
  if (matches.length < quantity) return false;
  const take = matches.slice(0, quantity);
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const unit of take) {
    const row = byId.get(unit.rowId);
    if (!row) return false;
    const payload = { ...(row.payload && typeof row.payload === "object" ? row.payload : {}), status: "Vendido" };
    const { error } = await client
      .from("device_stock")
      .update({ payload, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("shop_id", shopId);
    if (error) throw new Error(error.message);
  }
  return true;
}
