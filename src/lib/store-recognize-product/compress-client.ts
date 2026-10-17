const MAX_WIDTH = 600;
const JPEG_QUALITY = 0.6;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo leer la foto para comprimirla."));
    image.src = src;
  });
}

function canvasToJpeg(image: HTMLImageElement) {
  const scale = Math.min(1, MAX_WIDTH / Math.max(1, image.naturalWidth || image.width));
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo comprimir la foto.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (!dataUrl.startsWith("data:image/jpeg")) throw new Error("No se pudo comprimir la foto.");
  return dataUrl;
}

export async function compressImageForAi(source: File | string) {
  if (source instanceof File) {
    const objectUrl = URL.createObjectURL(source);
    try {
      return { imageBase64: canvasToJpeg(await loadImage(objectUrl)), mimeType: "image/jpeg" as const };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
  if (source.startsWith("data:image/") || source.startsWith("blob:")) {
    return { imageBase64: canvasToJpeg(await loadImage(source)), mimeType: "image/jpeg" as const };
  }
  const image = new Image();
  image.crossOrigin = "anonymous";
  const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo leer la foto para comprimirla."));
    image.src = source;
  });
  return { imageBase64: canvasToJpeg(loaded), mimeType: "image/jpeg" as const };
}
