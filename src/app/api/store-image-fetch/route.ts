const noStore = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

function sniffImageType(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

async function downloadImage(href: string) {
  const parsed = new URL(href);
  const response = await fetch(parsed, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
      Referer: `${parsed.origin}/`,
      "User-Agent": BROWSER_UA,
    },
    cache: "no-store",
    redirect: "follow",
  });
  if (!response.ok) return null;
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < 32 || buffer.byteLength > 4_000_000) return null;
  const sniffed = sniffImageType(buffer);
  const headerType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const type = sniffed || (headerType.startsWith("image/") ? headerType : null);
  if (!type) return null;
  return { buffer, type };
}

export async function GET(request: Request) {
  const href = new URL(request.url).searchParams.get("url")?.trim() ?? "";
  const fallback = new URL(request.url).searchParams.get("thumb")?.trim() ?? "";
  const candidates = [href, fallback].filter(Boolean);
  if (!candidates.length) {
    return Response.json({ error: "url" }, { status: 400, headers: noStore });
  }

  for (const candidate of candidates) {
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      continue;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
    try {
      const downloaded = await downloadImage(parsed.href);
      if (!downloaded) continue;
      return new Response(downloaded.buffer, {
        headers: {
          ...noStore,
          "Content-Type": downloaded.type,
        },
      });
    } catch {
      /* probar la siguiente URL */
    }
  }

  return Response.json({ error: "fetch" }, { status: 502, headers: noStore });
}
