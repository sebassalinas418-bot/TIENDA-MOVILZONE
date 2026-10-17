import { isSharedProductImage } from "@/lib/store-product-images/public-url";

export const MAX_PRODUCT_EXTRA_IMAGES = 8;

export function normalizeExtraImages(value: unknown, main?: string): string[] {
  const mainUrl = main?.trim() ?? "";
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>(mainUrl ? [mainUrl] : []);
  const extras: string[] = [];
  for (const item of value) {
    const url = typeof item === "string" ? item.trim() : "";
    if (!isSharedProductImage(url) || seen.has(url)) continue;
    seen.add(url);
    extras.push(url);
    if (extras.length >= MAX_PRODUCT_EXTRA_IMAGES) break;
  }
  return extras;
}

const STORAGE_KEY = "movilzone.product-extra-images";

export function loadExtraImagesOverlay(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const next: Record<string, string[]> = {};
    for (const [id, value] of Object.entries(parsed)) {
      const extras = normalizeExtraImages(value);
      if (id && extras.length) next[id] = extras;
    }
    return next;
  } catch {
    return {};
  }
}

export function saveExtraImagesOverlay(value: Record<string, string[]>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}
