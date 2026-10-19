import { createClient } from "@supabase/supabase-js";
import {
  mergeStoredTemplateLayouts,
  parseStoredTemplateLayouts,
  slotsToDefaultLayout,
  type StoredTemplateLayouts,
} from "@/lib/store-redes/template-layout";
import type { TemplateSlots } from "@/lib/store-redes/slots";

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

export async function readDefaultTemplateLayout(shopId: string): Promise<StoredTemplateLayouts | null> {
  const client = adminClient();
  if (!client || !shopId) return null;
  const { data, error } = await client
    .from(TABLE)
    .select("default_template_layout")
    .eq("shop_id", shopId)
    .maybeSingle();
  if (error || !data) return null;
  return parseStoredTemplateLayouts(data.default_template_layout);
}

export async function saveDefaultTemplateLayout(
  shopId: string,
  slots: TemplateSlots,
  templateId: string,
): Promise<{ ok: true; layout: StoredTemplateLayouts } | { ok: false; error: string }> {
  const client = adminClient();
  if (!client || !shopId) return { ok: false, error: "Sin conexión para guardar la plantilla." };
  const nextLayout = slotsToDefaultLayout(slots, templateId);
  const current = await readDefaultTemplateLayout(shopId);
  const layout = mergeStoredTemplateLayouts(current, nextLayout);
  const { data: row } = await client.from(TABLE).select("hidden_product_ids").eq("shop_id", shopId).maybeSingle();
  const { error } = await client.from(TABLE).upsert(
    {
      shop_id: shopId,
      hidden_product_ids: Array.isArray(row?.hidden_product_ids) ? row.hidden_product_ids : [],
      default_template_layout: layout,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "shop_id" },
  );
  if (error) {
    return {
      ok: false,
      error: error.message.includes("default_template_layout")
        ? "Falta el campo default_template_layout. Corré supabase/web_store_settings_template_layout.sql."
        : error.message,
    };
  }
  return { ok: true, layout };
}
