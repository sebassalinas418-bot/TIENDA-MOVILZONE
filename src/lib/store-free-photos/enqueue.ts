import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { captionHeadline, captionHashtags, ensureFreePhotoFooter } from "@/lib/store-free-photos/caption";
import { readSocialSchedule, storeRedesShopId } from "@/lib/store-redes/server";
import { scheduleHours } from "@/lib/store-redes/schedule";
import type { SocialPost } from "@/lib/store-redes/types";

const POSTS = "taller_social_posts";
const BUCKET = "product-images";
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function socialDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function nextScheduledFor(hours: string[]) {
  const zone = "America/Argentina/Buenos_Aires";
  const now = new Date();
  const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
  const clockFmt = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const today = dateFmt.format(now);
  const [hourNow, minuteNow] = clockFmt.format(now).split(":").map(Number);
  const nowMins = hourNow * 60 + minuteNow;
  const slots = hours.length ? hours : ["11:00"];
  for (const slot of slots) {
    const [h, m] = slot.split(":").map(Number);
    if (h * 60 + m > nowMins) return `${today}T${slot}:00-03:00`;
  }
  const tomorrow = new Date(`${today}T12:00:00-03:00`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return `${dateFmt.format(tomorrow)}T${slots[0]}:00-03:00`;
}

export async function uploadFreePhoto(file: File) {
  const ext = TYPES[file.type] || "jpg";
  const client = socialDb();
  const shop = storeRedesShopId();
  if (!client || !shop) return { ok: false as const, error: "Falta conexión de Storage." };
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > 8 * 1024 * 1024) return { ok: false as const, error: "La imagen no puede superar 8 MB." };
  const objectPath = `${shop}/redes-free/${randomUUID()}.${ext}`;
  const { error } = await client.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: true,
  });
  if (error) return { ok: false as const, error: `Storage: ${error.message}` };
  const { data } = client.storage.from(BUCKET).getPublicUrl(objectPath);
  const publicUrl = data?.publicUrl?.trim() ?? "";
  if (!publicUrl) return { ok: false as const, error: "No se obtuvo la URL pública." };
  return { ok: true as const, url: publicUrl };
}

export async function enqueueFreePhotoPost(input: {
  caption: string;
  imageUrl: string;
  headline?: string;
  hour?: string;
}) {
  const shop = storeRedesShopId();
  if (!shop) return { ok: false as const, error: "Falta TALLER_SHOP_ID." };
  const caption = ensureFreePhotoFooter(input.caption);
  const headline = (input.headline || captionHeadline(caption)).trim() || "Foto libre";
  const { schedule } = await readSocialSchedule(shop);
  const hour = input.hour?.trim();
  const post: SocialPost = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    scheduledFor: hour ? nextScheduledFor([hour]) : nextScheduledFor(scheduleHours(schedule)),
    publishedAt: null,
    status: "ready",
    product: {
      id: `free-${randomUUID()}`,
      title: headline,
      category: "foto-libre",
      price: 0,
      image: input.imageUrl,
      inStock: true,
    },
    headline,
    caption,
    hashtags: captionHashtags(caption),
    features: [],
    provider: "gemini",
  };
  const client = socialDb();
  if (!client) return { ok: false as const, error: "Sin tabla de posts todavía.", post };
  const { error } = await client.from(POSTS).upsert(
    {
      id: post.id,
      shop_id: shop,
      payload: post,
    },
    { onConflict: "id" },
  );
  if (error) return { ok: false as const, error: error.message, post };
  return { ok: true as const, post };
}
