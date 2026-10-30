import type { StoreCategorySlice } from "@/services/taller-gestio/categories";
import type { StoreProductPlacement } from "@/lib/store-product-placements";

type CatalogTreePatch = {
  categories?: unknown;
  placements?: unknown;
};

let queued: CatalogTreePatch | null = null;
let writing = false;
let holdPublish = false;
let extraDirty = false;
const listeners = new Set<() => void>();

function notifyQueue() {
  for (const listener of listeners) listener();
}

export function subscribeCatalogTreeQueue(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function catalogTreeIsPending() {
  return queued !== null || extraDirty;
}

export function markAdminCatalogDirty() {
  if (!holdPublish) return;
  extraDirty = true;
  notifyQueue();
}

export function setCatalogTreePublishHold(hold: boolean) {
  holdPublish = hold;
}

export function pushCatalogTree(patch: CatalogTreePatch) {
  if (queued) queued = { ...queued, ...patch };
  else queued = { ...patch };
  notifyQueue();
  if (!holdPublish) void flushCatalogTree();
}

/** Evita que un PUT encolado restaure una subcategoría ya borrada en Storage. */
export function syncQueuedCategories(categories: StoreCategorySlice[]) {
  if (!queued) return;
  queued = { ...queued, categories };
  notifyQueue();
}

export async function persistPublishedCatalogTree(categories: StoreCategorySlice[]) {
  const response = await fetch("/api/store-catalog-tree", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ action: "replace", categories }),
  });
  let body: { ok?: boolean; error?: string; categories?: StoreCategorySlice[] } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = {};
  }
  if (!response.ok || !body.ok) {
    throw new Error(body.error || "No se pudo guardar la jerarquía.");
  }
  if (Array.isArray(body.categories)) syncQueuedCategories(body.categories);
  return body;
}

export async function promotePublishedSubcategory(parentId: string, childId: string) {
  const response = await fetch("/api/store-catalog-tree", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ action: "promote", parentId, childId }),
  });
  let body: { ok?: boolean; error?: string; categories?: StoreCategorySlice[] } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = {};
  }
  if (!response.ok || !body.ok) {
    throw new Error(body.error || "No se pudo publicar la categoría principal.");
  }
  if (Array.isArray(body.categories)) syncQueuedCategories(body.categories);
  return body;
}

export async function deletePublishedSubcategory(parentId: string, childId: string) {
  const params = new URLSearchParams({ parentId, childId });
  const response = await fetch(`/api/store-catalog-tree?${params}`, {
    method: "DELETE",
    credentials: "include",
    cache: "no-store",
  });
  let body: { ok?: boolean; error?: string; categories?: StoreCategorySlice[] } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = {};
  }
  if (!response.ok || !body.ok) {
    throw new Error(body.error || "No se pudo eliminar la subcategoría.");
  }
  if (Array.isArray(body.categories)) syncQueuedCategories(body.categories);
  return body;
}

function restoreQueued(body: CatalogTreePatch) {
  const arrived = queued;
  if (arrived) queued = { ...body, ...arrived };
  else queued = body;
}

export async function publishQueuedCatalogTree(): Promise<{ ok: boolean; error?: string }> {
  extraDirty = false;
  const result = await flushCatalogTree({ force: true });
  if (!result.ok) extraDirty = true;
  notifyQueue();
  return result;
}

async function flushCatalogTree(options?: { force?: boolean }): Promise<{ ok: boolean; error?: string }> {
  if (holdPublish && !options?.force) return { ok: true };
  let wait = 0;
  while (writing) {
    if (wait > 80) return { ok: false, error: "No se pudieron publicar los cambios." };
    await new Promise((resolve) => setTimeout(resolve, 50));
    wait += 1;
  }
  if (!queued) return { ok: true };
  writing = true;
  let lastError: string | undefined;
  try {
    while (queued) {
      const body = queued;
      queued = null;
      try {
        const response = await fetch("/api/store-catalog-tree", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          restoreQueued(body);
          lastError = "No se pudieron publicar los cambios.";
          break;
        }
      } catch {
        restoreQueued(body);
        lastError = "No se pudieron publicar los cambios.";
        break;
      }
    }
  } finally {
    writing = false;
    notifyQueue();
    if (queued && !lastError && !holdPublish) void flushCatalogTree();
  }
  return lastError ? { ok: false, error: lastError } : { ok: true };
}

export async function fetchCatalogTree(): Promise<{
  categories: StoreCategorySlice[];
  placements: Record<string, StoreProductPlacement>;
} | null> {
  try {
    const response = await fetch("/api/store-catalog-tree", { cache: "no-store" });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      categories?: StoreCategorySlice[];
      placements?: Record<string, StoreProductPlacement>;
    };
    return {
      categories: Array.isArray(body.categories) ? body.categories : [],
      placements:
        body.placements && typeof body.placements === "object" && !Array.isArray(body.placements)
          ? body.placements
          : {},
    };
  } catch {
    return null;
  }
}
