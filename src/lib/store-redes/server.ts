import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { draftInstagramCopy, normalizeSocialAiEngine, socialGeminiKey } from "@/lib/store-redes/copy-ai";
import { socialOpenAiKey } from "@/lib/store-redes/gemini-key";
import { metaInstagramConfigured, publishToInstagram } from "@/lib/store-redes/meta-instagram";
import { pickSocialProduct } from "@/lib/store-redes/pick-product";
import { pickImageFromRow, preferRealProductImage } from "@/lib/store-redes/product-image";
import { clampHour, normalizeScheduleHours, socialScheduleMatch } from "@/lib/store-redes/schedule";
import { normalizeTemplateMode, pickNextTemplate } from "@/lib/store-redes/templates";
import {
  defaultSocialSchedule,
  type SocialAiEngine,
  type SocialPost,
  type SocialProductSnap,
  type SocialSchedule,
} from "@/lib/store-redes/types";

const POSTS = "taller_social_posts";
const SCHEDULE = "taller_social_schedule";

export function storeRedesShopId() {
  return process.env.TALLER_SHOP_ID?.trim() || "";
}

function socialDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function socialMarketingStatus() {
  const gemini = Boolean(socialGeminiKey());
  const openai = Boolean(socialOpenAiKey());
  return {
    ai: gemini || openai,
    gemini,
    openai,
    instagram: metaInstagramConfigured(),
  };
}

export async function listSocialPosts(shopId: string) {
  const client = socialDb();
  if (!client) return { ok: true as const, posts: [] as SocialPost[] };
  const { data, error } = await client
    .from(POSTS)
    .select("id, payload, created_at")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) return { ok: true as const, posts: [] as SocialPost[], warning: error.message };
  const posts = (data ?? []).map((row) => {
    const payload = (row.payload ?? {}) as SocialPost;
    return { ...payload, id: String(row.id), createdAt: payload.createdAt || String(row.created_at) };
  });
  return { ok: true as const, posts };
}

export async function readSocialSchedule(shopId: string) {
  const client = socialDb();
  if (!client) return { ok: true as const, schedule: defaultSocialSchedule() };
  const { data, error } = await client.from(SCHEDULE).select("payload").eq("shop_id", shopId).maybeSingle();
  if (error || !data?.payload) return { ok: true as const, schedule: defaultSocialSchedule() };
  const payload = data.payload as SocialSchedule;
  const hours = normalizeScheduleHours(payload.hours, payload.hour);
  return {
    ok: true as const,
    schedule: {
      ...defaultSocialSchedule(),
      ...payload,
      hours,
      hour: clampHour(Number.parseInt(hours[0]?.slice(0, 2) || "11", 10)),
      templateMode: normalizeTemplateMode(payload.templateMode),
      templateId: payload.templateId || defaultSocialSchedule().templateId,
      lastTemplateIndex: Number.isFinite(payload.lastTemplateIndex) ? payload.lastTemplateIndex : -1,
    },
  };
}

export async function saveSocialSchedule(shopId: string, patch: Partial<SocialSchedule>) {
  const current = await readSocialSchedule(shopId);
  const hours = normalizeScheduleHours(patch.hours ?? current.schedule.hours, patch.hour ?? current.schedule.hour);
  const hour = clampHour(Number.parseInt(hours[0]?.slice(0, 2) || "11", 10));
  const schedule: SocialSchedule = {
    ...current.schedule,
    ...patch,
    hours,
    hour,
    lastRunBySlot: patch.lastRunBySlot ?? current.schedule.lastRunBySlot ?? {},
    productPool: patch.productPool ?? current.schedule.productPool,
    templateMode: normalizeTemplateMode(patch.templateMode ?? current.schedule.templateMode),
    templateId: patch.templateId ?? current.schedule.templateId,
    lastTemplateIndex: patch.lastTemplateIndex ?? current.schedule.lastTemplateIndex ?? -1,
    templateSlots: {
      ...(current.schedule.templateSlots ?? {}),
      ...(patch.templateSlots ?? {}),
    },
  };
  const client = socialDb();
  if (!client) return { ok: false as const, error: "Sin conexión para guardar la programación.", schedule };
  const { error } = await client.from(SCHEDULE).upsert({
    shop_id: shopId,
    payload: schedule,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false as const, error: error.message, schedule };
  return { ok: true as const, schedule };
}

export async function generateSocialPost(
  shopId: string,
  input: {
    product?: SocialProductSnap;
    products?: SocialProductSnap[];
    random?: boolean;
    engine?: SocialAiEngine;
    templateId?: string;
  },
) {
  const pool = input.products ?? (input.product ? [input.product] : []);
  const picked = input.random || !input.product ? pickSocialProduct(pool, input.product?.id) : input.product;
  if (!picked) return { ok: false as const, error: "No hay productos para armar el post." };
  const { schedule } = await readSocialSchedule(shopId);
  const template = pickNextTemplate({
    ...schedule,
    templateId: input.templateId || schedule.templateId,
  });
  const product = await hydrateSocialProductPhoto(shopId, picked);
  const copy = await draftInstagramCopy(product, normalizeSocialAiEngine(input.engine));
  const post: SocialPost = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    scheduledFor: null,
    publishedAt: null,
    status: "ready",
    product,
    headline: copy.headline,
    caption: copy.caption,
    hashtags: copy.hashtags,
    features: copy.features,
    provider: copy.provider,
    templateId: template.templateId,
  };
  const stored = await persistPost(shopId, post);
  await saveSocialSchedule(shopId, { lastTemplateIndex: template.lastTemplateIndex });
  const hint = [copy.hint, stored.ok ? "" : stored.error].filter(Boolean).join(" ");
  if (!stored.ok) return { ok: true as const, post, warning: hint || stored.error };
  return { ok: true as const, post: stored.post, warning: hint || undefined };
}

async function hydrateSocialProductPhoto(shopId: string, product: SocialProductSnap): Promise<SocialProductSnap> {
  const client = socialDb();
  if (!client || !product.id) return product;
  const { data } = await client.from("products").select("*").eq("id", product.id).eq("shop_id", shopId).maybeSingle();
  const row = (data ?? null) as Record<string, unknown> | null;
  const fromDb = pickImageFromRow(row);
  const image = preferRealProductImage([fromDb, product.image]);
  const name = typeof row?.name === "string" ? row.name.trim() : "";
  const category = typeof row?.category === "string" ? row.category.trim() : "";
  const sale = Number(row?.sale_price);
  return {
    ...product,
    title: name || product.title,
    category: category || product.category,
    price: Number.isFinite(sale) && sale > 0 ? Math.round(sale) : product.price,
    image: image || product.image,
  };
}

export async function publishSocialPost(shopId: string, id: string) {
  const listed = await listSocialPosts(shopId);
  const post = listed.posts.find((item) => item.id === id);
  if (!post) return { ok: false as const, error: "No encontramos ese post." };
  const result = await publishToInstagram(post);
  const next: SocialPost = result.ok
    ? {
        ...post,
        status: "published",
        publishedAt: new Date().toISOString(),
        igMediaId: result.igMediaId,
        publishError: undefined,
      }
    : { ...post, status: result.skipped ? "ready" : "failed", publishError: result.error };
  await persistPost(shopId, next);
  return result.ok
    ? { ok: true as const, post: next }
    : { ok: false as const, error: result.error, post: next, skipped: result.skipped };
}

export async function runDueSocialPosts(shopId: string) {
  const { schedule } = await readSocialSchedule(shopId);
  const slot = socialScheduleMatch(schedule);
  if (!slot) {
    return { ok: true as const, ran: false as const, reason: "Todavía no toca publicar." };
  }
  const generated = await generateSocialPost(shopId, {
    products: schedule.productPool,
    random: true,
    engine: normalizeSocialAiEngine(schedule.engine),
  });
  if (!generated.ok) return generated;
  const ranAt = new Date().toISOString();
  await saveSocialSchedule(shopId, {
    lastRunAt: ranAt,
    lastRunBySlot: { ...(schedule.lastRunBySlot ?? {}), [slot]: ranAt },
  });
  const published = await publishSocialPost(shopId, generated.post.id);
  return { ok: true as const, ran: true as const, post: published.post ?? generated.post, publish: published };
}

export async function deleteSocialPost(shopId: string, id: string) {
  const client = socialDb();
  if (!client) return { ok: false as const, error: "Sin conexión para borrar el post." };
  const { error } = await client.from(POSTS).delete().eq("id", id).eq("shop_id", shopId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, id };
}

export async function clearSocialPosts(shopId: string) {
  const client = socialDb();
  if (!client) return { ok: false as const, error: "Sin conexión para vaciar la cola." };
  const { error } = await client.from(POSTS).delete().eq("shop_id", shopId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

async function persistPost(shopId: string, post: SocialPost) {
  const client = socialDb();
  if (!client) return { ok: false as const, error: "Sin tabla de posts todavía.", post };
  const { error } = await client.from(POSTS).upsert(
    {
      id: post.id,
      shop_id: shopId,
      payload: post,
    },
    { onConflict: "id" },
  );
  if (error) return { ok: false as const, error: error.message, post };
  return { ok: true as const, post };
}
