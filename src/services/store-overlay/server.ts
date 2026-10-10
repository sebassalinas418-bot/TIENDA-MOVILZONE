import { createClient } from "@supabase/supabase-js";

const TABLE = "web_store_settings";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

function shopId() {
  return process.env.TALLER_SHOP_ID?.trim() || "";
}

function asIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export async function readStoreOverlayHidden(): Promise<string[] | null> {
  const client = adminClient();
  const id = shopId();
  if (!client || !id) return null;
  const { data, error } = await client
    .from(TABLE)
    .select("hidden_product_ids")
    .eq("shop_id", id)
    .maybeSingle();
  if (error) return null;
  if (!data) return [];
  return asIds(data.hidden_product_ids);
}

export async function writeStoreOverlayHidden(hidden: string[]): Promise<boolean> {
  const client = adminClient();
  const id = shopId();
  if (!client || !id) return false;
  const ids = asIds(hidden);
  const { error } = await client.from(TABLE).upsert(
    {
      shop_id: id,
      hidden_product_ids: ids,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "shop_id" },
  );
  return !error;
}
