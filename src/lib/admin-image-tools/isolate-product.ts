import { fileToDataUrl, prepareProductImageFile } from "@/lib/admin-image-tools/prepare-product-image";
import { removeProductImageBackground } from "@/lib/admin-image-tools/remove-product-image-background";

const PREVIEW_MAX = 720;
const PREVIEW_MAX_CHARS = 700_000;

function loadImageFromFile(file: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    image.src = url;
  });
}

async function fileToStorePreview(file: File) {
  const image = await loadImageFromFile(file);
  const scale = Math.min(1, PREVIEW_MAX / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return fileToDataUrl(file);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const png = canvas.toDataURL("image/png");
  if (png.length <= PREVIEW_MAX_CHARS) return png;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.88);
}

async function srcToFile(src: string) {
  if (src.startsWith("data:") || src.startsWith("/") || src.startsWith("blob:")) {
    const response = await fetch(src);
    if (!response.ok) throw new Error("fetch");
    const blob = await response.blob();
    return new File([blob], "producto.png", { type: blob.type || "image/png" });
  }

  const response = await fetch(`/api/store-image-fetch?url=${encodeURIComponent(src)}`);
  if (!response.ok) throw new Error("fetch");
  const blob = await response.blob();
  return new File([blob], "producto.jpg", { type: blob.type || "image/jpeg" });
}

export async function isolateProductFile(file: File) {
  const prepared = await prepareProductImageFile(file);
  const processed = await removeProductImageBackground(prepared, { alreadyPrepared: true });
  return fileToStorePreview(processed);
}

export async function isolateProductImage(src: string) {
  return isolateProductFile(await srcToFile(src));
}
