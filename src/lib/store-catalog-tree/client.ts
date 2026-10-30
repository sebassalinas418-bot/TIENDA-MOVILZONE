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
  if (writing) return { ok: true };
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
