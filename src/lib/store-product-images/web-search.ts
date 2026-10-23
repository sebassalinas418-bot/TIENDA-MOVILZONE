export type WebImageHit = {
  url: string;
  thumb: string;
  title: string;
};

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/adaptador(?:es)?/gi, "adapter"],
  [/cargador(?:es)?/gi, "charger"],
  [/auricular(?:es)?/gi, "earbuds"],
  [/funda(?:s)?/gi, "phone case"],
  [/protector(?:es)?/gi, "screen protector"],
  [/vidrio templado/gi, "tempered glass"],
  [/tipo\s*c/gi, "usb-c"],
  [/celular(?:es)?/gi, "smartphone"],
  [/cable(?:s)?/gi, "cable"],
  [/soporte(?:s)?/gi, "holder"],
];

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

function toEnglishQuery(query: string) {
  let next = query;
  for (const [pattern, replacement] of REPLACEMENTS) next = next.replace(pattern, replacement);
  return next.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
}

function queryVariants(query: string) {
  const cleaned = query.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
  const english = toEnglishQuery(cleaned);
  const present = new Set(english.split(" ").map((word) => word.toLowerCase()));
  const preferred = ["usb-c", "iphone", "charger", "hub", "hdmi", "adapter", "cable", "earbuds", "usb"]
    .filter((word) => present.has(word))
    .slice(0, 3)
    .join(" ");
  return [...new Set([preferred, english.slice(0, 80), cleaned.slice(0, 80)].filter((term) => term.length >= 2))];
}

async function getJson<T>(url: URL): Promise<T | null> {
  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return null;
  const type = (response.headers.get("content-type") ?? "").toLowerCase();
  if (type.includes("html")) return null;
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function searchCommons(query: string): Promise<WebImageHit[]> {
  const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("origin", "*");
  endpoint.searchParams.set("generator", "search");
  endpoint.searchParams.set("gsrsearch", query);
  endpoint.searchParams.set("gsrnamespace", "6");
  endpoint.searchParams.set("gsrlimit", "20");
  endpoint.searchParams.set("prop", "imageinfo");
  endpoint.searchParams.set("iiprop", "url|mime");
  endpoint.searchParams.set("iiurlwidth", "400");
  const payload = await getJson<{
    query?: { pages?: Record<string, { title?: string; imageinfo?: { url?: string; thumburl?: string }[] }> };
  }>(endpoint);
  if (!payload) return [];
  return asHits(
    Object.values(payload.query?.pages ?? {}).map((page) => {
      const info = page.imageinfo?.[0];
      return {
        url: info?.url,
        thumb: info?.thumburl || info?.url,
        title: page.title?.replace(/^File:/, "") ?? "",
      };
    }),
  );
}

async function searchWikipedia(query: string): Promise<WebImageHit[]> {
  const endpoint = new URL("https://en.wikipedia.org/w/api.php");
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("generator", "search");
  endpoint.searchParams.set("gsrsearch", query);
  endpoint.searchParams.set("gsrlimit", "16");
  endpoint.searchParams.set("prop", "pageimages");
  endpoint.searchParams.set("piprop", "thumbnail");
  endpoint.searchParams.set("pithumbsize", "400");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("origin", "*");
  const payload = await getJson<{
    query?: { pages?: Record<string, { title?: string; thumbnail?: { source?: string } }> };
  }>(endpoint);
  if (!payload) return [];
  return asHits(
    Object.values(payload.query?.pages ?? {}).map((page) => ({
      url: page.thumbnail?.source,
      thumb: page.thumbnail?.source,
      title: page.title,
    })),
  );
}

export async function searchWebProductImages(query: string): Promise<WebImageHit[]> {
  const term = query.trim();
  if (term.length < 2) throw new Error("Escribí al menos 2 letras para buscar.");
  for (const variant of queryVariants(term)) {
    const commons = await searchCommons(variant).catch(() => []);
    if (commons.length > 0) return commons;
  }
  for (const variant of queryVariants(term)) {
    const wiki = await searchWikipedia(variant).catch(() => []);
    if (wiki.length > 0) return wiki;
  }
  throw new Error("No se pudo buscar imágenes.");
}
