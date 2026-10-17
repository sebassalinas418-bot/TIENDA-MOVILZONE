import { prepareProductImageFile } from "@/lib/admin-image-tools/prepare-product-image";
import { isPersistableProductImage } from "@/lib/store-product-images/public-url";

export async function uploadStoreProductImage(
  file: File,
  productId?: string,
  options?: { asIs?: boolean },
) {
  const toUpload = options?.asIs ? file : await prepareProductImageFile(file);
  const body = new FormData();
  body.append("file", toUpload);
  if (productId) body.append("productId", productId);
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

export async function uploadStoreProductImageFromDataUrl(dataUrl: string, productId?: string) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], "producto.jpg", { type: blob.type || "image/jpeg" });
  return uploadStoreProductImage(file, productId);
}

export async function persistStoreProductImage(productId: string, image: string) {
  if (!productId || productId.startsWith("extra-")) return false;
  const response = await fetch("/api/store-product-image", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, image }),
  });
  return response.ok;
}
