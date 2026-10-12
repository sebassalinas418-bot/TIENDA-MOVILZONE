export function isPersistableProductImage(value?: string | null) {
  const src = value?.trim() ?? "";
  if (!src) return false;
  if (src.startsWith("blob:") || src.startsWith("file:") || src.startsWith("data:")) return false;
  if (src.startsWith("/uploads/")) return false;
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function pickCatalogImage(overlay?: string, remote?: string) {
  if (isPersistableProductImage(overlay)) return overlay!.trim();
  if (isPersistableProductImage(remote)) return remote!.trim();
  return (remote || overlay || "").trim();
}
