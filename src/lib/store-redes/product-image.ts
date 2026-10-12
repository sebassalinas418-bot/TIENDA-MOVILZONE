import type { SocialProductSnap } from "@/lib/store-redes/types";

const IMAGE_KEYS = [
  "image_url",
  "imagen",
  "image",
  "photo",
  "photo_url",
  "foto",
  "cover_url",
  "thumbnail_url",
] as const;

export function isCategoryPlaceholder(src?: string | null) {
  if (!src?.trim()) return true;
  return /\/categories\//i.test(src) || /placeholder/i.test(src);
}

export function pickImageFromRow(row: Record<string, unknown> | null | undefined) {
  if (!row) return "";
  for (const key of IMAGE_KEYS) {
    const value = row[key];
    if (typeof value === "string" && value.trim() && !isCategoryPlaceholder(value)) {
      return value.trim();
    }
  }
  return "";
}

export function preferRealProductImage(candidates: Array<string | undefined | null>) {
  for (const item of candidates) {
    const value = item?.trim();
    if (value && !isCategoryPlaceholder(value)) return value;
  }
  return candidates.find((item) => item?.trim())?.trim() || "";
}

export function redesCardImageSrc(src: string) {
  const value = src.trim();
  if (!value) return "";
  if (value.startsWith("data:") || value.startsWith("blob:") || value.startsWith("/")) return value;
  if (!/^https?:\/\//i.test(value)) return value;
  return `/api/store-image-fetch?url=${encodeURIComponent(value)}`;
}
