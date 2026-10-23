import { connection } from "next/server";
import { canAccessStoreRedesRequest } from "@/lib/store-redes/access";

export const maxDuration = 30;

const SEARCH_FAIL = "Falla en la búsqueda, intenta más tarde";

type SerperImage = {
  title?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
};

function sanitizeQuery(raw: string) {
  return raw.normalize("NFC").replace(/\s+/g, " ").trim().slice(0, 120);
}

export async function GET(request: Request) {
  await connection();
  if (!canAccessStoreRedesRequest(request)) {
    return Response.json({ ok: false, error: "No autorizado. Entrá de nuevo al admin." }, { status: 401 });
  }

  const query = sanitizeQuery(new URL(request.url).searchParams.get("q") ?? "");
  if (query.length < 2) {
    return Response.json({ ok: false, error: "Escribí al menos 2 letras para buscar." }, { status: 400 });
  }

  const apiKey = process.env.SERPER_API_KEY?.trim() ?? "";
  if (!apiKey) {
    return Response.json({ ok: false, error: SEARCH_FAIL }, { status: 500 });
  }

  try {
    const response = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 20 }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return Response.json({ ok: false, error: SEARCH_FAIL }, { status: 502 });
    }

    const payload = (await response.json()) as { images?: SerperImage[] };
    const seen = new Set<string>();
    const items: { url: string; thumb: string; title: string }[] = [];
    for (const image of payload.images ?? []) {
      const url = image.imageUrl?.trim() ?? "";
      if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
      seen.add(url);
      items.push({
        url,
        thumb: image.thumbnailUrl?.trim() || url,
        title: (image.title ?? "").trim(),
      });
      if (items.length >= 24) break;
    }

    return Response.json({ ok: true, items });
  } catch {
    return Response.json({ ok: false, error: SEARCH_FAIL }, { status: 502 });
  }
}
