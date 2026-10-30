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

export function isSharedProductImage(value?: string | null): value is string {
  const src = value?.trim() ?? "";
  if (!isPersistableProductImage(src)) return false;
  if (src.startsWith("/")) return false;
  if (/\/categories\//i.test(src) || /placeholder/i.test(src)) return false;
  return /^https?:\/\//i.test(src);
}

/** La foto de la base gana: así celular y escritorio ven lo mismo. */
export function pickCatalogImage(overlay?: string, remote?: string) {
  const r = remote?.trim() ?? "";
  const o = overlay?.trim() ?? "";
  if (isSharedProductImage(r)) return r;
  if (isSharedProductImage(o)) return o;
  if (isPersistableProductImage(r)) return r;
  return o || r;
}
