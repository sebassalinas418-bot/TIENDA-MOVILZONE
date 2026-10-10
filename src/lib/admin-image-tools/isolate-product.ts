function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

async function toLocalSrc(src: string) {
  if (src.startsWith("data:") || src.startsWith("/")) return src;
  const response = await fetch(`/api/store-image-fetch?url=${encodeURIComponent(src)}`);
  if (!response.ok) throw new Error("fetch");
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

function colorAt(data: Uint8ClampedArray, index: number) {
  const i = index * 4;
  return [data[i], data[i + 1], data[i + 2]] as const;
}

function similar(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  tolerance: number,
) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= tolerance;
}

export async function isolateProductFile(file: File) {
  return isolateProductImage(await fileToDataUrl(file));
}

export async function isolateProductImage(src: string) {
  const local = await toLocalSrc(src);
  const img = await loadImage(local);
  if (local.startsWith("blob:")) URL.revokeObjectURL(local);

  const max = 720;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(img, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  const mask = new Uint8Array(width * height);
  const starts = [0, width - 1, (height - 1) * width, height * width - 1];

  for (const start of starts) {
    if (mask[start]) continue;
    const bg = colorAt(data, start);
    const queue = [start];
    mask[start] = 1;
    let head = 0;
    while (head < queue.length) {
      const index = queue[head++];
      const x = index % width;
      const y = (index - x) / width;
      const neighbors = [index - 1, index + 1, index - width, index + width];
      const valid = [x > 0, x < width - 1, y > 0, y < height - 1];
      for (let n = 0; n < 4; n += 1) {
        if (!valid[n]) continue;
        const next = neighbors[n];
        if (mask[next] || !similar(colorAt(data, next), bg, 78)) continue;
        mask[next] = 1;
        queue.push(next);
      }
    }
  }

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i]) {
      data[i * 4 + 3] = 0;
      continue;
    }
    const x = i % width;
    const y = (i - x) / width;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  context.putImageData(imageData, 0, 0);
  if (maxX <= minX || maxY <= minY) return canvas.toDataURL("image/png");

  const pad = 16;
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(width, maxX + pad + 1) - sx;
  const sh = Math.min(height, maxY + pad + 1) - sy;
  const cropped = document.createElement("canvas");
  cropped.width = sw;
  cropped.height = sh;
  const crop = cropped.getContext("2d");
  if (!crop) return canvas.toDataURL("image/png");
  crop.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return cropped.toDataURL("image/png");
}
