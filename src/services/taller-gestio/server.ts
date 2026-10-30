import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describeStock, type Product } from "@/data/products";
import {
  defaultCategoryImage,
  slugTallerCategory,
} from "@/services/taller-gestio/categories";
import { ensureWebItemsAvailable } from "@/services/taller-gestio/pending-stock";
import {
  isStoreDeviceCatalogId,
  markDeviceCatalogUnitsSold,
} from "@/services/taller-gestio/storefront-devices";

const WEB_SALE = "web_sale";
const WEB_ORIGIN = "Venta Web";

type ProductRow = {
  id: string;
  name: string;
  category: string;
  stock: number;
  sale_price: number;
  cost_price: number;
  image_url: string | null;
  is_active: boolean;
  sku: string;
  descripcion?: string | null;
};

export type WebSaleItem = {
  productId: string;
  title: string;
  quantity: number;
  unitPrice: number;
};

const categoryMap: Record<string, { categoryId: string; subcategoryId: string; image: string }> = {
  fundas: { categoryId: "fundas", subcategoryId: "silicona", image: "/categories/fundas.jpg" },
  vidrios: { categoryId: "vidrios-templados", subcategoryId: "", image: "/categories/protectores.jpg" },
  "vidrios templados": { categoryId: "vidrios-templados", subcategoryId: "", image: "/categories/protectores.jpg" },
  cargadores: { categoryId: "cargadores", subcategoryId: "cargadores-rapidos", image: "/categories/cargadores.jpg" },
  cables: { categoryId: "cargadores", subcategoryId: "cables", image: "/categories/cables.jpg" },
  auriculares: { categoryId: "auriculares", subcategoryId: "inalambricos", image: "/categories/auriculares.jpg" },
  soportes: { categoryId: "soporte", subcategoryId: "", image: "/categories/accesorios.jpg" },
};

export function tallerConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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

function persistableInventoryImage(image?: string) {
  const src = image?.trim() ?? "";
  if (!src) return null;
  if (src.startsWith("blob:") || src.startsWith("file:") || src.startsWith("data:")) return null;
  if (src.startsWith("/uploads/")) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return null;
}

function mapRow(row: ProductRow): Product {
  const category = row.category.trim() || "Otros";
  const key = category.toLowerCase();
  const mapped = categoryMap[key];
  const categoryId = mapped?.categoryId ?? slugTallerCategory(category);
  const stock = Math.max(0, Math.floor(Number(row.stock) || 0));
  const described = describeStock(stock);
  return {
    id: row.id,
    title: row.name,
    category,
    categoryId,
    subcategoryId: mapped?.subcategoryId ?? "",
    brand: "Genérico",
    price: Math.max(0, Math.round(Number(row.sale_price) || 0)),
    image: row.image_url || mapped?.image || defaultCategoryImage(categoryId),
    stock,
    stockLabel: described.stockLabel,
    inStock: described.inStock,
    onSale: false,
    isNew: false,
    details: row.descripcion?.trim() || undefined,
  };
}

export async function readTallerCatalog(): Promise<Product[] | null> {
  const client = adminClient();
  if (!client) return null;
  const shopId = await resolveShopId(client);
  if (!shopId) return [];
  const { data, error } = await client
    .from("products")
    .select("id, name, category, stock, sale_price, image_url, is_active, sku, descripcion")
    .eq("shop_id", shopId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ProductRow[])
    .filter((row) => row.is_active !== false)
    .map(mapRow)
    .filter((product) => product.title.trim().length > 0);
}

/** Lectura aislada: 4–5 productos de la misma categoría, sin el actual. */
export async function readRelatedTallerProductIds(input: {
  excludeId: string;
  category: string;
  limit?: number;
}): Promise<string[] | null> {
  const client = adminClient();
  if (!client) return null;
  const shopId = await resolveShopId(client);
  if (!shopId) return [];
  const excludeId = input.excludeId.trim();
  const category = input.category.trim();
  const limit = Math.min(5, Math.max(1, Math.floor(input.limit ?? 5)));
  if (!excludeId || !category) return [];
  const { data, error } = await client
    .from("products")
    .select("id")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .ilike("category", category)
    .neq("id", excludeId)
    .order("name", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => String((row as { id: string }).id)).filter(Boolean);
}

async function shopActor(client: SupabaseClient, shopId: string) {
  const { data, error } = await client
    .from("shop_members")
    .select("user_id, role")
    .eq("shop_id", shopId)
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.user_id as string | undefined;
}

export async function registerWebSale(orderId: string, items: WebSaleItem[]) {
  const client = adminClient();
  if (!client) return { ok: false as const, reason: "sin-conexion" };
  const shopId = await resolveShopId(client);
  if (!shopId) return { ok: false as const, reason: "sin-taller" };
  const userId = await shopActor(client, shopId);
  if (!userId) return { ok: false as const, reason: "sin-admin" };

  for (const item of items) {
    const quantity = Math.floor(item.quantity);
    if (!item.productId || quantity <= 0) {
      return { ok: false as const, reason: "cantidad" };
    }
    if (isStoreDeviceCatalogId(item.productId)) {
      const sold = await markDeviceCatalogUnitsSold(item.productId, quantity);
      if (!sold) return { ok: false as const, reason: "stock" };
      continue;
    }
    const { data, error } = await client
      .from("products")
      .select("id, name, stock, cost_price")
      .eq("id", item.productId)
      .eq("shop_id", shopId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { ok: false as const, reason: "producto" };
    const stock = Number(data.stock) || 0;
    if (stock < quantity) return { ok: false as const, reason: "stock" };
    const next = stock - quantity;
    const { data: updated, error: updateError } = await client
      .from("products")
      .update({ stock: next })
      .eq("id", item.productId)
      .eq("shop_id", shopId)
      .eq("stock", stock)
      .select("id");
    if (updateError) throw new Error(updateError.message);
    if (!updated?.length) return { ok: false as const, reason: "stock" };
    const movement = {
      shop_id: shopId,
      user_id: userId,
      product_id: item.productId,
      product_name: data.name || item.title,
      quantity,
      signed_quantity: -quantity,
      related_id: orderId,
      user_name: WEB_ORIGIN,
      unit_cost: data.cost_price ?? null,
      note: WEB_ORIGIN,
    };
    const inserted = await client.from("inventory_movements").insert({
      ...movement,
      movement_type: WEB_SALE,
    });
    const rejectedType = inserted.error?.code === "23514";
    const { error: movementError } = rejectedType
      ? await client.from("inventory_movements").insert({
          ...movement,
          movement_type: "manual_adjustment",
        })
      : inserted;
    if (movementError) throw new Error(movementError.message);
  }

  return { ok: true as const };
}

async function restoreWebSale(
  relatedId: string,
  items: WebSaleItem[],
) {
  const client = adminClient();
  if (!client) return { ok: false as const, reason: "sin-conexion" };
  const shopId = await resolveShopId(client);
  if (!shopId) return { ok: false as const, reason: "sin-taller" };
  const userId = await shopActor(client, shopId);
  if (!userId) return { ok: false as const, reason: "sin-admin" };

  for (const item of items) {
    const quantity = Math.floor(item.quantity);
    if (!item.productId || quantity <= 0) continue;
    const { data, error } = await client
      .from("products")
      .select("id, name, stock, cost_price")
      .eq("id", item.productId)
      .eq("shop_id", shopId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) continue;
    const stock = Number(data.stock) || 0;
    const { error: updateError } = await client
      .from("products")
      .update({ stock: stock + quantity })
      .eq("id", item.productId)
      .eq("shop_id", shopId)
      .eq("stock", stock);
    if (updateError) throw new Error(updateError.message);
    const movement = {
      shop_id: shopId,
      user_id: userId,
      product_id: item.productId,
      product_name: data.name || item.title,
      quantity,
      signed_quantity: quantity,
      related_id: relatedId,
      user_name: WEB_ORIGIN,
      unit_cost: data.cost_price ?? null,
      note: `${WEB_ORIGIN} · anulación`,
    };
    const inserted = await client.from("inventory_movements").insert({
      ...movement,
      movement_type: "sale_reversal",
    });
    if (inserted.error && inserted.error.code !== "23514") {
      throw new Error(inserted.error.message);
    }
    if (inserted.error?.code === "23514") {
      const fallback = await client.from("inventory_movements").insert({
        ...movement,
        movement_type: "manual_adjustment",
      });
      if (fallback.error) throw new Error(fallback.error.message);
    }
  }

  return { ok: true as const };
}

function itemsFromOrderRow(value: unknown): WebSaleItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const productId = String(item.productId ?? item.product_id ?? "");
    const quantity = Math.floor(Number(item.quantity || 0));
    if (!productId || quantity <= 0) return [];
    return [
      {
        productId,
        title: String(item.name ?? item.title ?? ""),
        quantity,
        unitPrice: Number(item.unitPrice ?? item.unit_price ?? 0),
      },
    ];
  });
}

export async function cancelIncomingWebOrder(
  orderId: string,
  actor?: { email: string; isAdmin: boolean },
) {
  const client = adminClient();
  if (!client) return { ok: false as const, reason: "sin-conexion" };
  const shopId = await resolveShopId(client);
  if (!shopId) return { ok: false as const, reason: "sin-taller" };

  const { data: order, error } = await client
    .from("web_orders")
    .select("id, status, stock_deducted, items, customer_email")
    .eq("shop_id", shopId)
    .eq("order_number", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) return { ok: true as const };
  if (order.status === "cancelado") return { ok: true as const };
  const owner = String(order.customer_email ?? "").trim().toLowerCase();
  if (actor && !actor.isAdmin && owner && owner !== actor.email) {
    return { ok: false as const, reason: "forbidden" };
  }

  if (order.stock_deducted) {
    const restored = await restoreWebSale(String(order.id), itemsFromOrderRow(order.items));
    if (!restored.ok) return restored;
  }

  const { error: updateError } = await client
    .from("web_orders")
    .update({ status: "cancelado", stock_deducted: false })
    .eq("id", order.id)
    .eq("shop_id", shopId);
  if (updateError) throw new Error(updateError.message);
  return { ok: true as const };
}

export async function listWebOrderStatuses(input?: {
  ids?: string[];
  email?: string;
  isAdmin?: boolean;
}) {
  const client = adminClient();
  if (!client) return [];
  const shopId = await resolveShopId(client);
  if (!shopId) return [];
  const ids = [...new Set((input?.ids ?? []).map((id) => id.trim()).filter(Boolean))].slice(0, 80);
  if (!ids.length) return [];
  let query = client
    .from("web_orders")
    .select("order_number, status, customer_email")
    .eq("shop_id", shopId)
    .in("order_number", ids);
  if (input?.email && !input.isAdmin) query = query.eq("customer_email", input.email);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function recordIncomingWebOrder(input: {
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  notes?: string;
  createdAt?: string;
  items: WebSaleItem[];
}) {
  const client = adminClient();
  if (!client) return { ok: false as const, reason: "sin-conexion" };
  const shopId = await resolveShopId(client);
  if (!shopId) return { ok: false as const, reason: "sin-taller" };

  const { data: existing, error: existingError } = await client
    .from("web_orders")
    .select("id")
    .eq("shop_id", shopId)
    .eq("order_number", input.orderId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) {
    const email = input.customerEmail?.trim().toLowerCase() ?? "";
    if (email) {
      await client
        .from("web_orders")
        .update({
          customer_email: email,
          customer_name: input.customerName?.trim() || "Cliente tienda web",
        })
        .eq("id", existing.id);
    }
    return { ok: true as const };
  }

  const available = await ensureWebItemsAvailable(input.items);
  if (!available.ok) return { ok: false as const, reason: available.reason };

  const lines = input.items.map((item) => {
    const quantity = Math.floor(item.quantity);
    const unitPrice = Math.max(0, Math.round(Number(item.unitPrice) || 0));
    return {
      productId: item.productId,
      sku: "",
      name: item.title,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
    };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const createdAt =
    input.createdAt && !Number.isNaN(new Date(input.createdAt).getTime())
      ? input.createdAt
      : undefined;

  const { error } = await client.from("web_orders").insert({
    shop_id: shopId,
    order_number: input.orderId,
    origin: "web_store",
    status: "pendiente",
    customer_name: input.customerName?.trim() || "Cliente tienda web",
    customer_phone: "",
    customer_email: input.customerEmail?.trim().toLowerCase() || "",
    payment_method: "transferencia",
    items: lines,
    subtotal,
    total: subtotal,
    notes: input.notes?.trim() || "",
    stock_deducted: false,
    ...(createdAt ? { created_at: createdAt, updated_at: createdAt } : {}),
  });

  if (error?.code === "23505") return { ok: true as const };
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

export async function saveTallerProduct(input: {
  id?: string;
  title: string;
  price: number;
  stock: number;
  category: string;
  image?: string;
  details?: string;
}) {
  const client = adminClient();
  if (!client) return { ok: false as const, reason: "sin-conexion" };
  const shopId = await resolveShopId(client);
  if (!shopId) return { ok: false as const, reason: "sin-taller" };
  const userId = await shopActor(client, shopId);
  if (!userId) return { ok: false as const, reason: "sin-admin" };
  const price = Math.max(1, Math.round(input.price));
  const stock = Math.max(0, Math.floor(input.stock));
  const descripcion = input.details != null ? input.details.trim() : undefined;

  if (input.id) {
    const { data: current, error: readError } = await client
      .from("products")
      .select("sale_price, cost_price")
      .eq("id", input.id)
      .eq("shop_id", shopId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!current) return { ok: false as const, reason: "producto" };
    const persistImage = persistableInventoryImage(input.image);
    const { error } = await client
      .from("products")
      .update({
        name: input.title.trim(),
        sale_price: price,
        stock,
        category: input.category,
        ...(persistImage ? { image_url: persistImage } : {}),
        ...(descripcion != null ? { descripcion } : {}),
      })
      .eq("id", input.id)
      .eq("shop_id", shopId);
    if (error) throw new Error(error.message);
    if (Number(current.sale_price) !== price) {
      await client.from("product_price_history").insert({
        shop_id: shopId,
        user_id: userId,
        product_id: input.id,
        cost_price: current.cost_price ?? 0,
        sale_price: price,
        note: WEB_ORIGIN,
      });
    }
    return { ok: true as const, id: input.id };
  }

  const sku = `WEB-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await client
    .from("products")
    .insert({
      shop_id: shopId,
      user_id: userId,
      sku,
      name: input.title.trim(),
      category: input.category,
      stock,
      sale_price: price,
      cost_price: 0,
      image_url: persistableInventoryImage(input.image),
      descripcion: descripcion || null,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { ok: true as const, id: data.id as string };
}

export async function verifyTallerAdmin(email: string, password: string) {
  const anon = anonClient();
  const admin = adminClient();
  if (!anon || !admin) return null;
  const { data, error } = await anon.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error || !data.user) return null;
  const shopId = await resolveShopId(admin);
  if (!shopId) return null;
  const { data: member, error: memberError } = await admin
    .from("shop_members")
    .select("role")
    .eq("shop_id", shopId)
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (memberError) throw new Error(memberError.message);
  const role = member?.role as string | undefined;
  const listedAdmin = process.env.TALLER_ADMIN_EMAIL?.trim().toLowerCase();
  const isAdmin = role === "owner" || role === "admin" || listedAdmin === data.user.email?.toLowerCase();
  if (!isAdmin) return null;
  const name =
    (typeof data.user.user_metadata?.display_name === "string" && data.user.user_metadata.display_name) ||
    data.user.email?.split("@")[0] ||
    "Admin";
  return {
    name,
    email: data.user.email ?? email,
    accessToken: data.session?.access_token ?? "",
  };
}

export async function tokenIsTallerAdmin(accessToken: string) {
  const anon = anonClient();
  const admin = adminClient();
  if (!anon || !admin || !accessToken) return false;
  const { data, error } = await anon.auth.getUser(accessToken);
  if (error || !data.user) return false;
  const shopId = await resolveShopId(admin);
  if (!shopId) return false;
  const { data: member } = await admin
    .from("shop_members")
    .select("role")
    .eq("shop_id", shopId)
    .eq("user_id", data.user.id)
    .maybeSingle();
  const role = member?.role as string | undefined;
  const listedAdmin = process.env.TALLER_ADMIN_EMAIL?.trim().toLowerCase();
  return role === "owner" || role === "admin" || listedAdmin === data.user.email?.toLowerCase();
}
