import type { SocialPost } from "@/lib/store-redes/types";

export function metaInstagramConfigured() {
  return Boolean(process.env.META_IG_USER_ID?.trim() && process.env.META_PAGE_ACCESS_TOKEN?.trim());
}

export async function publishToInstagram(post: SocialPost) {
  const igUserId = process.env.META_IG_USER_ID?.trim();
  const token = process.env.META_PAGE_ACCESS_TOKEN?.trim();
  if (!igUserId || !token) {
    return {
      ok: false as const,
      skipped: true as const,
      error: "Falta conectar Meta: META_IG_USER_ID y META_PAGE_ACCESS_TOKEN.",
    };
  }
  const image = absoluteImageUrl(post.product.image);
  if (!image.startsWith("http")) {
    return { ok: false as const, skipped: false as const, error: "La foto del producto no es una URL pública." };
  }

  const caption = `${post.caption}\n\n${post.hashtags.join(" ")}`.trim();
  const container = await graph(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
    image_url: image,
    caption,
    access_token: token,
  });
  if (!container.ok) return { ok: false as const, skipped: false as const, error: container.error };
  const creationId = container.id;
  if (!creationId) return { ok: false as const, skipped: false as const, error: "Instagram no devolvió el contenedor." };

  const published = await graph(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    creation_id: creationId,
    access_token: token,
  });
  if (!published.ok) return { ok: false as const, skipped: false as const, error: published.error };
  return { ok: true as const, skipped: false as const, igMediaId: published.id || creationId };
}

function absoluteImageUrl(image: string) {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  const origin = process.env.NEXT_PUBLIC_STORE_URL?.trim().replace(/\/$/, "") || "";
  if (!origin) return image;
  return `${origin}${image.startsWith("/") ? image : `/${image}`}`;
}

async function graph(url: string, body: Record<string, string>) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as { id?: string; error?: { message?: string } };
    if (!response.ok) {
      return { ok: false as const, error: json.error?.message || "Error de Instagram." };
    }
    return { ok: true as const, id: json.id };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "No se pudo hablar con Meta." };
  }
}
