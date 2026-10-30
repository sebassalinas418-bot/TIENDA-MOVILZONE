import { createClient } from "@supabase/supabase-js";
import {
  detachCablesAsTopLevel,
  keepExistingStoreChildren,
  remapCablesPlacements,
  stripCargadoresLeftoverChildren,
  type CategoryOrigin,
  type StoreCategorySlice,
} from "@/services/taller-gestio/categories";
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

async function candidateShopIds(client: NonNullable<ReturnType<typeof socialDb>>) {
  const preferred = [
    process.env.TALLER_SHOP_ID?.trim(),
    process.env.WEB_STORE_SHOP_ID?.trim(),
  ].filter((id): id is string => Boolean(id));
  const { data } = await client
    .from("shops")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(5);
  const rest = (data ?? []).map((row) => row.id?.trim()).filter((id): id is string => Boolean(id));
  return [...new Set([...preferred, ...rest])];
}

function objectPath(shop: string) {
  return `${shop}/store-catalog-tree.json`;
}

function treeHasContent(tree: StoreCatalogTree) {
  return tree.categories.length > 0 || Object.keys(tree.placements).length > 0;
}

let lastWritten: StoreCatalogTree | null = null;
let lastWrittenAt = 0;

function rememberTree(tree: StoreCatalogTree) {
  lastWritten = tree;
  lastWrittenAt = Date.now();
}

function withRememberedStoreChildren(disk: StoreCatalogTree): StoreCatalogTree {
  if (!lastWritten || Date.now() - lastWrittenAt > 60000) return disk;
  return {
    categories: lastWritten.categories,
    placements: { ...lastWritten.placements, ...disk.placements },
  };
}

function asOrigin(value: unknown): CategoryOrigin | undefined {
  return value === "taller" || value === "store" ? value : undefined;
}

function asImage(value: unknown) {
  if (typeof value !== "string") return undefined;
  const image = value.trim();
  if (!image || image.length > 2000) return undefined;
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
  return {
    categories: stripCargadoresLeftoverChildren(detachCablesAsTopLevel(categories)),
    placements: remapCablesPlacements(placements),
  };
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
  shop: string,
  tree: StoreCatalogTree,
) {
  const body = Buffer.from(JSON.stringify(tree));
  const path = objectPath(shop);
  const options = { upsert: true as const, cacheControl: "0" };
  await client.storage.from(BUCKET).remove([path]);
  await allowCatalogJson(client);
  let { error } = await client.storage.from(BUCKET).upload(path, body, {
    ...options,
    contentType: "application/json",
  });
  if (error) {
    ({ error } = await client.storage.from(BUCKET).upload(path, body, {
      ...options,
      contentType: "image/jpeg",
    }));
  }
  return error;
}

async function downloadTree(
  client: NonNullable<ReturnType<typeof socialDb>>,
  shop: string,
): Promise<StoreCatalogTree | null> {
  const { data, error } = await client.storage.from(BUCKET).download(objectPath(shop));
  if (error || !data) return null;
  try {
    const parsed = JSON.parse(await data.text()) as { categories?: unknown; placements?: unknown };
    return withRememberedStoreChildren(sanitizeCatalogTree(parsed));
  } catch {
    return null;
  }
}

export async function readStoreCatalogTree(): Promise<StoreCatalogTree> {
  const empty: StoreCatalogTree = { categories: [], placements: {} };
  const client = socialDb();
  if (!client) return empty;
  const shops = await candidateShopIds(client);
  let fallback = empty;
  for (const shop of shops) {
    const tree = await downloadTree(client, shop);
    if (!tree) continue;
    if (treeHasContent(tree)) return tree;
    fallback = tree;
  }
  return fallback;
}

async function resolveWriteShop(client: NonNullable<ReturnType<typeof socialDb>>) {
  const shops = await candidateShopIds(client);
  for (const shop of shops) {
    const tree = await downloadTree(client, shop);
    if (tree && treeHasContent(tree)) return shop;
  }
  return shops[0] || "";
}

export async function writeStoreCatalogTree(
  patch: {
    categories?: unknown;
    placements?: unknown;
  },
  options?: { replace?: boolean },
): Promise<{ ok: true; tree: StoreCatalogTree } | { ok: false; error: string }> {
  const client = socialDb();
  if (!client) {
    return { ok: false, error: "Falta conexión para guardar el catálogo." };
  }
  const shops = await candidateShopIds(client);
  const shop = (await resolveWriteShop(client)) || shops[0] || "";
  if (!shop) {
    return { ok: false, error: "Falta conexión para guardar el catálogo." };
  }
  const current = (await downloadTree(client, shop)) ?? { categories: [], placements: {} };
  const incoming = sanitizeCatalogTree(patch);
  if (patch.categories !== undefined && incoming.categories.length === 0 && current.categories.length > 0) {
    return { ok: false, error: "No se pudo guardar la jerarquía vacía." };
  }
  const incomingCategories =
    patch.categories !== undefined
      ? options?.replace
        ? incoming.categories
        : keepExistingStoreChildren(current.categories, incoming.categories)
      : current.categories
  const tree: StoreCatalogTree = {
    categories: incomingCategories,
    placements: patch.placements !== undefined ? incoming.placements : current.placements,
  };
  let lastError: { message: string } | null = null;
  const targets = shops.length ? shops : [shop];
  for (const id of targets) {
    const error = await writeFile(client, id, tree);
    if (error) lastError = error;
  }
  if (lastError) return { ok: false, error: lastError.message };
  rememberTree(tree);
  return { ok: true, tree };
}
