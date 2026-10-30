import { createClient } from "@supabase/supabase-js";
import { tallerConfigured } from "@/services/taller-gestio/server";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveShopId(
  client: NonNullable<ReturnType<typeof adminClient>>,
) {
  const preferred = process.env.TALLER_SHOP_ID?.trim();
  if (preferred) return preferred;
  const { data } = await client
    .from("shops")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Nombres vivos: tabla compartida + category de productos. */
export async function readTallerInventoryCategoryNames(): Promise<string[]> {
  if (!tallerConfigured()) return [];
  const client = adminClient();
  if (!client) return [];
  const shopId = await resolveShopId(client);
  if (!shopId) return [];

  const names = new Set<string>();
  const table = await client
    .from("shop_product_categories")
    .select("name")
    .eq("shop_id", shopId);
  if (!table.error) {
    for (const row of table.data ?? []) {
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (name) names.add(name);
    }
  }

  const products = await client
    .from("products")
    .select("category")
    .eq("shop_id", shopId)
    .eq("is_active", true);
  if (!products.error) {
    for (const row of products.data ?? []) {
      const name = typeof row.category === "string" ? row.category.trim() : "";
      if (name) names.add(name);
    }
  }

  return [...names];
}
