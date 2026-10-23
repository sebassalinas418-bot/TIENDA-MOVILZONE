import { createClient } from "@supabase/supabase-js";
import type { CategoryOrigin, StoreCategorySlice } from "@/services/taller-gestio/categories";
import type { StoreProductPlacement } from "@/lib/store-product-placements";

const BUCKET = "product-images";
const MAX_CATEGORIES = 80;
const MAX_CHILDREN = 40;
const MAX_PLACEMENTS = 2500;

export type StoreCatalogTree = {
  categories: StoreCategorySlice[];
  placements: Record<string, StoreProductPlacement>;
};

function socialDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function shopId() {
  return process.env.TALLER_SHOP_ID?.trim() || "";
}

function objectPath() {
  return `${shopId()}/store-catalog-tree.json`;
}

function asOrigin(value: unknown): CategoryOrigin | undefined {
  return value === "taller" || value === "store" ? value : undefined;
}

function asImage(value: unknown) {
  if (typeof value !== "string") return undefined;
  const image = value.trim();
  if (!image || image.length > 500) return undefined;
  if (image.startsWith("/") || /^https?:\/\//i.test(image)) return image;
  return undefined;
}

function asName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").trim().slice(0, 80);
}

function asId(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 80);
}

function sanitizeChild(value: unknown): StoreCategorySlice["children"][number] | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = asId(row.id);
  const name = asName(row.name);
  if (!id || !name) return null;
  const image = asImage(row.image);
  const origin = asOrigin(row.origin);
  return { id, name, ...(image ? { image } : {}), ...(origin ? { origin } : {}) };
}

function sanitizeCategory(value: unknown): StoreCategorySlice | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = asId(row.id);
  const name = asName(row.name);
  if (!id || !name) return null;
  const children: StoreCategorySlice["children"] = [];
  if (Array.isArray(row.children)) {
    for (const child of row.children) {
      const next = sanitizeChild(child);
      if (next) children.push(next);
      if (children.length >= MAX_CHILDREN) break;
    }
  }
  return {
    id,
    name,
    image: asImage(row.image) || "/categories/todo.jpg",
    origin: asOrigin(row.origin),
    children,
  };
}

export function sanitizeCatalogTree(input: {
  categories?: unknown;
  placements?: unknown;
}): StoreCatalogTree {
  const categories: StoreCategorySlice[] = [];
  if (Array.isArray(input.categories)) {
    const seen = new Set<string>();
    for (const item of input.categories) {
      const next = sanitizeCategory(item);
      if (!next || seen.has(next.id)) continue;
      seen.add(next.id);
      categories.push(next);
      if (categories.length >= MAX_CATEGORIES) break;
    }
  }
  const placements: Record<string, StoreProductPlacement> = {};
  if (input.placements && typeof input.placements === "object" && !Array.isArray(input.placements)) {
    for (const [productId, value] of Object.entries(input.placements as Record<string, unknown>)) {
      const id = productId.trim().slice(0, 80);
      if (!id || !value || typeof value !== "object") continue;
      const row = value as Record<string, unknown>;
      const categoryId = asId(row.categoryId);
      if (!categoryId) continue;
      const subcategoryId = asId(row.subcategoryId);
      placements[id] = {
        categoryId,
        ...(subcategoryId ? { subcategoryId } : {}),
      };
      if (Object.keys(placements).length >= MAX_PLACEMENTS) break;
    }
  }
  return { categories, placements };
}

async function allowCatalogJson(client: NonNullable<ReturnType<typeof socialDb>>) {
  const { data } = await client.storage.getBucket(BUCKET);
  const allowed = data?.allowed_mime_types ?? [];
  if (!allowed.length || allowed.includes("application/json")) return;
  await client.storage.updateBucket(BUCKET, {
    public: data?.public ?? true,
    fileSizeLimit: data?.file_size_limit ?? undefined,
    allowedMimeTypes: [...allowed, "application/json"],
  });
}

async function writeFile(
  client: NonNullable<ReturnType<typeof socialDb>>,
  tree: StoreCatalogTree,
) {
  const body = Buffer.from(JSON.stringify(tree));
  const path = objectPath();
  const tryUpload = (contentType: string) =>
    client.storage.from(BUCKET).upload(path, body, { contentType, upsert: true });

  let { error } = await tryUpload("image/jpeg");
  if (error) {
    await allowCatalogJson(client);
    ({ error } = await tryUpload("application/json"));
  }
  return error;
}

export async function readStoreCatalogTree(): Promise<StoreCatalogTree> {
  const empty: StoreCatalogTree = { categories: [], placements: {} };
  const client = socialDb();
  const shop = shopId();
  if (!client || !shop) return empty;
  const { data, error } = await client.storage.from(BUCKET).download(objectPath());
  if (error || !data) return empty;
  try {
    const parsed = JSON.parse(await data.text()) as { categories?: unknown; placements?: unknown };
    return sanitizeCatalogTree(parsed);
  } catch {
    return empty;
  }
}

export async function writeStoreCatalogTree(patch: {
  categories?: unknown;
  placements?: unknown;
}): Promise<{ ok: true; tree: StoreCatalogTree } | { ok: false; error: string }> {
  const client = socialDb();
  const shop = shopId();
  if (!client || !shop) {
    return { ok: false, error: "Falta conexión para guardar el catálogo." };
  }
  const current = await readStoreCatalogTree();
  const incoming = sanitizeCatalogTree(patch);
  const tree: StoreCatalogTree = {
    categories: patch.categories !== undefined ? incoming.categories : current.categories,
    placements: patch.placements !== undefined ? incoming.placements : current.placements,
  };
  const error = await writeFile(client, tree);
  if (error) return { ok: false, error: error.message };
  return { ok: true, tree };
}
