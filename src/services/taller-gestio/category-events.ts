import { createClient } from "@supabase/supabase-js";

export type CategoryDeletionItem = {
  productId: string;
  sku: string;
  title: string;
};

export type CategoryDeletionEvent = {
  id: string;
  deletedName: string;
  movedTo: string;
  createdAt: string;
  products: CategoryDeletionItem[];
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveShopId(client: NonNullable<ReturnType<typeof adminClient>>) {
  const preferred = [
    process.env.TALLER_SHOP_ID?.trim(),
    process.env.WEB_STORE_SHOP_ID?.trim(),
  ].filter(Boolean) as string[];
  if (preferred[0]) return preferred[0];
  const { data } = await client
    .from("shops")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function listPendingCategoryDeletionEvents(): Promise<CategoryDeletionEvent[]> {
  const client = adminClient();
  if (!client) return [];
  const shopId = await resolveShopId(client);
  if (!shopId) return [];

  const { data: events, error } = await client
    .from("shop_category_deletion_events")
    .select("id, deleted_name, moved_to, created_at")
    .eq("shop_id", shopId)
    .is("resolved_at", null)
    .order("created_at", { ascending: true })
    .limit(20);
  if (error || !events?.length) return [];

  const ids = events.map((row) => row.id as string);
  const { data: items } = await client
    .from("shop_category_deletion_event_items")
    .select("event_id, product_id, sku, product_name")
    .in("event_id", ids);

  return events.map((event) => ({
    id: event.id as string,
    deletedName: String(event.deleted_name ?? ""),
    movedTo: String(event.moved_to ?? "Otros"),
    createdAt: String(event.created_at ?? ""),
    products: (items ?? [])
      .filter((item) => item.event_id === event.id)
      .map((item) => ({
        productId: String(item.product_id ?? ""),
        sku: String(item.sku ?? ""),
        title: String(item.product_name ?? ""),
      })),
  }));
}

export async function resolveCategoryDeletionEvent(input: {
  eventId: string;
  moves: { productId: string; category: string }[];
}): Promise<{ ok: boolean; error?: string }> {
  const client = adminClient();
  if (!client) return { ok: false, error: "Sin conexión." };
  const shopId = await resolveShopId(client);
  if (!shopId) return { ok: false, error: "Sin tienda." };

  const { data: event } = await client
    .from("shop_category_deletion_events")
    .select("id, resolved_at")
    .eq("id", input.eventId)
    .eq("shop_id", shopId)
    .maybeSingle();
  if (!event || event.resolved_at) {
    return { ok: false, error: "El aviso ya no está pendiente." };
  }

  for (const move of input.moves) {
    const category = move.category.trim().slice(0, 80);
    const productId = move.productId.trim();
    if (!category || !productId) continue;
    const { error } = await client
      .from("products")
      .update({ category, updated_at: new Date().toISOString() })
      .eq("id", productId)
      .eq("shop_id", shopId);
    if (error) return { ok: false, error: error.message };
  }

  const { error } = await client
    .from("shop_category_deletion_events")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", input.eventId)
    .eq("shop_id", shopId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
