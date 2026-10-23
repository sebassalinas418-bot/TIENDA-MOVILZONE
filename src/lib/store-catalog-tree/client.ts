import type { StoreCategorySlice } from "@/services/taller-gestio/categories";
import type { StoreProductPlacement } from "@/lib/store-product-placements";

type CatalogTreePatch = {
  categories?: unknown;
  placements?: unknown;
};

let queued: CatalogTreePatch | null = null;
let writing = false;

export function pushCatalogTree(patch: CatalogTreePatch) {
  queued = { ...queued, ...patch };
  void flushCatalogTree();
}

async function flushCatalogTree() {
  if (writing) return;
  writing = true;
  try {
    while (queued) {
      const body = queued;
      queued = null;
      try {
        await fetch("/api/store-catalog-tree", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(body),
        });
      } catch {
        /* se reintenta en el próximo cambio o pull */
      }
    }
  } finally {
    writing = false;
    if (queued) void flushCatalogTree();
  }
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
