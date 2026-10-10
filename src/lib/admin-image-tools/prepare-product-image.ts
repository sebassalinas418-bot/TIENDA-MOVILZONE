const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const PRODUCT_IMAGE_INPUT_MAX_BYTES = 20 * 1024 * 1024;
export const PRODUCT_IMAGE_UPLOAD_MAX_BYTES = 3 * 1024 * 1024;

const MAX_DIMENSION = 1600;
const TARGET_BYTES = 1.5 * 1024 * 1024;
const INITIAL_QUALITY = 0.82;
const MIN_QUALITY = 0.55;

export function validateProductImageSource(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    return "Formato no permitido. Usá JPG, PNG o WebP.";
  }
  if (file.size > PRODUCT_IMAGE_INPUT_MAX_BYTES) {
    return "La imagen no puede superar 20 MB.";
  }
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo comprimir la imagen."));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function scaledSize(width: number, height: number, maxSide: number) {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

export async function compressProductImage(file: File): Promise<File> {
  if (file.size <= TARGET_BYTES) {
    const image = await loadImage(file);
    const needsResize = Math.max(image.naturalWidth, image.naturalHeight) > MAX_DIMENSION;
    if (!needsResize) return file;
  }

  const image = await loadImage(file);
  const { width, height } = scaledSize(image.naturalWidth, image.naturalHeight, MAX_DIMENSION);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo comprimir la imagen.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const outputType = "image/jpeg";
  let quality = INITIAL_QUALITY;
  let blob = await canvasToBlob(canvas, outputType, quality);

  while (blob.size > PRODUCT_IMAGE_UPLOAD_MAX_BYTES && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - 0.08);
    blob = await canvasToBlob(canvas, outputType, quality);
  }

  if (blob.size > PRODUCT_IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error("No se pudo comprimir la imagen por debajo de 3 MB. Probá con otra foto.");
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "producto";
  return new File([blob], `${baseName}.jpg`, {
    type: outputType,
    lastModified: Date.now(),
  });
}

export async function prepareProductImageFile(file: File): Promise<File> {
  const sourceError = validateProductImageSource(file);
  if (sourceError) throw new Error(sourceError);
  return compressProductImage(file);
}

export function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}
