export type StoreProductPlacement = {
  categoryId: string
  subcategoryId?: string
}

const STORAGE_KEY = "movilzone.product-placements"

export function loadProductPlacements(): Record<string, StoreProductPlacement> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, StoreProductPlacement>
    if (!parsed || typeof parsed !== "object") return {}
    const next: Record<string, StoreProductPlacement> = {}
    for (const [id, value] of Object.entries(parsed)) {
      if (!value?.categoryId) continue
      next[id] = {
        categoryId: value.categoryId,
        subcategoryId: value.subcategoryId || undefined,
      }
    }
    return next
  } catch {
    return {}
  }
}

export function saveProductPlacements(
  placements: Record<string, StoreProductPlacement>,
) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(placements))
}

export function storeVisibleCategory(
  productId: string,
  fallback: { categoryId: string; subcategoryId?: string },
  placements: Record<string, StoreProductPlacement>,
) {
  const placed = placements[productId]
  if (!placed) return { categoryId: fallback.categoryId, subcategoryId: fallback.subcategoryId ?? "" }
  return {
    categoryId: placed.categoryId,
    subcategoryId: placed.subcategoryId ?? "",
  }
}
