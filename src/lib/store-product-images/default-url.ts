import { isSharedProductImage } from "@/lib/store-product-images/public-url";

const DEFAULT_PATH = "/brand/logo-lockup.png";

/** URL http(s) estática para guardar un producto sin foto propia. */
export function defaultStoreProductImageUrl() {
  if (typeof window !== "undefined" && window.location.origin) {
    return `${window.location.origin}${DEFAULT_PATH}`;
  }
  return DEFAULT_PATH;
}

export function imageUrlForProductSave(value?: string | null) {
  const src = value?.trim() ?? "";
  if (isSharedProductImage(src)) return src;
  if (/^https?:\/\//i.test(src) && !/\/categories\//i.test(src)) return src;
  return defaultStoreProductImageUrl();
}
