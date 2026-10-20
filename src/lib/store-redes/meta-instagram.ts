import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { SocialPost } from "@/lib/store-redes/types";

const META_KEYS = ["META_IG_USER_ID", "META_PAGE_ACCESS_TOKEN", "INSTAGRAM_IG_USER_ID", "INSTAGRAM_ACCESS_TOKEN"] as const;

let hydrated = false;

function hydrateMetaEnv() {
  if (hydrated) return;
  hydrated = true;
  for (const fileName of [".env.local", ".env"]) {
    try {
      const full = join(process.cwd(), fileName);
      if (!existsSync(full)) continue;
      for (const raw of readFileSync(full, "utf8").split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith("#")) continue;
        const cut = line.replace(/^export\s+/, "").match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!cut) continue;
        const name = cut[1];
        if (!META_KEYS.includes(name as (typeof META_KEYS)[number])) continue;
        if (process.env[name]?.trim()) continue;
        let value = cut[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[name] = value.replace(/\s+/g, "");
      }
    } catch {
      /* el archivo de env es opcional */
    }
  }
}

function metaIgUserId() {
  hydrateMetaEnv();
  return (process.env.META_IG_USER_ID || process.env.INSTAGRAM_IG_USER_ID || "").trim();
}

function metaPageToken() {
  hydrateMetaEnv();
  return (process.env.META_PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN || "").trim();
}

export function metaInstagramConfigured() {
  return Boolean(metaIgUserId() && metaPageToken());
}

export async function publishToInstagram(post: SocialPost) {
  const igUserId = metaIgUserId();
  const token = metaPageToken();
  if (!igUserId || !token) {
    return {
      ok: false as const,
      skipped: true as const,
      error:
        "El post ya está en la cola. Para subirlo a Instagram faltan META_IG_USER_ID y META_PAGE_ACCESS_TOKEN en .env.local y en Vercel. Reiniciá el servidor después de cargarlas.",
    };
  }
  const image = absoluteImageUrl(post.product.image);
  if (!isPublicImageUrl(image)) {
    return {
      ok: false as const,
      skipped: false as const,
      error:
        "Instagram no puede bajar esa foto. Tiene que ser una URL pública (https), no localhost.",
    };
  }

  const caption = `${post.caption}\n\n${post.hashtags.join(" ")}`.trim();
  const graphRoot = instagramGraphRoot(token);
  const container = await graph(`${graphRoot}/${igUserId}/media`, {
    image_url: image,
    caption,
    access_token: token,
  });
  if (!container.ok) return { ok: false as const, skipped: false as const, error: container.error };
  const creationId = container.id;
  if (!creationId) return { ok: false as const, skipped: false as const, error: "Instagram no devolvió el contenedor." };

  const ready = await waitUntilMediaReady(graphRoot, creationId, token);
  if (!ready.ok) return { ok: false as const, skipped: false as const, error: ready.error };

  const published = await publishContainer(graphRoot, igUserId, creationId, token);
  if (!published.ok) return { ok: false as const, skipped: false as const, error: published.error };
  return { ok: true as const, skipped: false as const, igMediaId: published.id || creationId };
}

function instagramGraphRoot(token: string) {
  // Tokens IG… salen de Instagram Login y van a graph.instagram.com.
  // Tokens EAA… son de Página de Facebook y van a graph.facebook.com.
  if (/^IG/i.test(token.trim())) return "https://graph.instagram.com/v21.0";
  return "https://graph.facebook.com/v21.0";
}

function absoluteImageUrl(image: string) {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  const origin = process.env.NEXT_PUBLIC_STORE_URL?.trim().replace(/\/$/, "") || "";
  if (!origin) return image;
  return `${origin}${image.startsWith("/") ? image : `/${image}`}`;
}

function isPublicImageUrl(image: string) {
  try {
    const url = new URL(image);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1" && host !== "::1" && !host.endsWith(".local");
  } catch {
    return false;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntilMediaReady(graphRoot: string, creationId: string, token: string) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const status = await graphGet(`${graphRoot}/${creationId}`, {
      fields: "status_code,status",
      access_token: token,
    });
    if (!status.ok) return { ok: false as const, error: status.error };
    const code = (status.status_code || "").toUpperCase();
    if (code === "FINISHED") return { ok: true as const };
    if (code === "ERROR" || code === "EXPIRED") {
      return {
        ok: false as const,
        error: status.status || "Instagram no pudo procesar la imagen.",
      };
    }
    await wait(2000);
  }
  return { ok: false as const, error: "Instagram tardó demasiado en procesar la imagen." };
}

async function publishContainer(
  graphRoot: string,
  igUserId: string,
  creationId: string,
  token: string
) {
  let lastError = "Media ID is not available";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const published = await graph(`${graphRoot}/${igUserId}/media_publish`, {
      creation_id: creationId,
      access_token: token,
    });
    if (published.ok) return published;
    lastError = published.error;
    if (!/media id is not available/i.test(published.error)) return published;
    await wait(2500);
  }
  return { ok: false as const, error: lastError };
}

async function graph(url: string, body: Record<string, string>) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
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

async function graphGet(url: string, query: Record<string, string>) {
  try {
    const target = new URL(url);
    for (const [key, value] of Object.entries(query)) target.searchParams.set(key, value);
    const response = await fetch(target);
    const json = (await response.json()) as {
      status_code?: string;
      status?: string;
      error?: { message?: string };
    };
    if (!response.ok) {
      return { ok: false as const, error: json.error?.message || "Error de Instagram." };
    }
    return { ok: true as const, status_code: json.status_code, status: json.status };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "No se pudo hablar con Meta." };
  }
}
