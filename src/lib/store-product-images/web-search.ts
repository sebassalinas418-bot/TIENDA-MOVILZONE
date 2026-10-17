export type WebImageHit = {
  url: string;
  thumb: string;
  title: string;
};

function cseKey() {
  return (
    process.env.GOOGLE_CSE_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    (process.env.GEMINI_API_KEY?.trim()?.startsWith("AIza") ? process.env.GEMINI_API_KEY.trim() : "") ||
    ""
  );
}

function cseCx() {
  return process.env.GOOGLE_CSE_CX?.trim() || process.env.GOOGLE_SEARCH_ENGINE_ID?.trim() || "";
}

function asHits(items: Array<{ url?: string; thumb?: string; title?: string }>): WebImageHit[] {
  const seen = new Set<string>();
  const hits: WebImageHit[] = [];
  for (const item of items) {
    const url = item.url?.trim() ?? "";
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    hits.push({
      url,
      thumb: item.thumb?.trim() || url,
      title: (item.title ?? "").trim(),
    });
    if (hits.length >= 24) break;
  }
  return hits;
}

async function searchGoogleCse(query: string): Promise<WebImageHit[] | null> {
  const key = cseKey();
  const cx = cseCx();
  if (!key || !cx) return null;
  const endpoint = new URL("https://www.googleapis.com/customsearch/v1");
  endpoint.searchParams.set("key", key);
  endpoint.searchParams.set("cx", cx);
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("searchType", "image");
  endpoint.searchParams.set("num", "10");
  endpoint.searchParams.set("safe", "active");
  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    items?: { link?: string; title?: string; image?: { thumbnailLink?: string } }[];
  };
  return asHits(
    (payload.items ?? []).map((item) => ({
      url: item.link,
      thumb: item.image?.thumbnailLink,
      title: item.title,
    })),
  );
}

async function searchDuckDuckGo(query: string): Promise<WebImageHit[]> {
  const landing = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
    headers: { Accept: "text/html", "User-Agent": "MovilzoneStore/1.0" },
    cache: "no-store",
    redirect: "follow",
  });
  if (!landing.ok) throw new Error("No se pudo buscar imágenes.");
  const html = await landing.text();
  const vqd =
    html.match(/vqd=["']([\d-]+)["']/)?.[1] ||
    html.match(/vqd=([\d-]+)/)?.[1] ||
    "";
  if (!vqd) throw new Error("No se pudo iniciar la búsqueda de imágenes.");
  const api = new URL("https://duckduckgo.com/i.js");
  api.searchParams.set("l", "wt-wt");
  api.searchParams.set("o", "json");
  api.searchParams.set("q", query);
  api.searchParams.set("vqd", vqd);
  api.searchParams.set("f", ",,,,,");
  api.searchParams.set("p", "1");
  const response = await fetch(api, {
    headers: {
      Accept: "application/json",
      Referer: "https://duckduckgo.com/",
      "User-Agent": "MovilzoneStore/1.0",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("No se pudo buscar imágenes.");
  const payload = (await response.json()) as {
    results?: { image?: string; thumbnail?: string; title?: string }[];
  };
  return asHits(
    (payload.results ?? []).map((item) => ({
      url: item.image,
      thumb: item.thumbnail,
      title: item.title,
    })),
  );
}

export async function searchWebProductImages(query: string): Promise<WebImageHit[]> {
  const term = query.trim().slice(0, 120);
  if (term.length < 2) throw new Error("Escribí al menos 2 letras para buscar.");
  const cse = await searchGoogleCse(term);
  if (cse && cse.length > 0) return cse;
  return searchDuckDuckGo(term);
}
