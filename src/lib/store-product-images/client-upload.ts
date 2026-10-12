import { prepareProductImageFile } from "@/lib/admin-image-tools/prepare-product-image";
import { isPersistableProductImage } from "@/lib/store-product-images/public-url";

export async function uploadStoreProductImage(file: File) {
  const prepared = await prepareProductImageFile(file);
  const body = new FormData();
  body.append("file", prepared);
  const response = await fetch("/api/store-product-image", {
    method: "POST",
    body,
    credentials: "include",
  });
  const payload = (await response.json()) as { url?: string; error?: string };
  const url = payload.url?.trim() ?? "";
  if (!response.ok || !isPersistableProductImage(url) || url.startsWith("/")) {
    throw new Error(payload.error || "No se pudo subir la imagen a Storage.");
  }
  return url;
}

export async function uploadStoreProductImageFromDataUrl(dataUrl: string) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], "producto.jpg", { type: blob.type || "image/jpeg" });
  return uploadStoreProductImage(file);
}
