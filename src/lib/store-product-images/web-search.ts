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

const PRODUCT_WORDS =
  /^(adapter|charger|earbuds|hub|usb-c|usb|hdmi|hdtv|cable|iphone|samsung|xiaomi|holder|smartphone|screen|protector|case|glass|type-c|lightning|magsafe|watch|airpods)$/i;

function queryVariants(query: string) {
  const cleaned = query.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
  const english = toEnglishQuery(cleaned);
  const tokens = english.split(" ").filter((word) => word.length > 1);
  const present = new Set(tokens.map((word) => word.toLowerCase()));
  const preferred = [
    "usb-c",
    "iphone",
    "charger",
    "hub",
    "hdmi",
    "hdtv",
    "adapter",
    "cable",
    "earbuds",
    "smartphone",
    "usb",
  ].filter((word) => present.has(word));
  const product = tokens.filter((word) => PRODUCT_WORDS.test(word)).join(" ");
  const shortEn = (preferred.slice(0, 3).join(" ") || product || tokens.slice(0, 5).join(" ")).trim();
  return [...new Set([shortEn, english.slice(0, 80)].filter((term) => term.length >= 2))];
}

async function searchOpenverse(query: string): Promise<WebImageHit[]> {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", query);
  url.searchParams.set("page_size", "16");
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "MovilzoneStore/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return [];
  const type = (response.headers.get("content-type") ?? "").toLowerCase();
  if (!type.includes("json")) return [];
  const body = (await response.json()) as {
    results?: { url?: string; thumbnail?: string; title?: string }[];
  };
  return asHits(
    (body.results ?? []).map((item) => ({
      url: item.url,
      thumb: item.thumbnail || item.url,
      title: item.title,
    })),
  );
}

async function searchWikipedia(query: string): Promise<WebImageHit[]> {
  const endpoint = new URL("https://en.wikipedia.org/w/api.php");
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("generator", "search");
  endpoint.searchParams.set("gsrsearch", query);
  endpoint.searchParams.set("gsrlimit", "12");
  endpoint.searchParams.set("prop", "pageimages");
  endpoint.searchParams.set("piprop", "thumbnail");
  endpoint.searchParams.set("pithumbsize", "400");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("origin", "*");
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json", "User-Agent": "MovilzoneStore/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as {
    query?: { pages?: Record<string, { title?: string; thumbnail?: { source?: string } }> };
  };
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
  const variants = queryVariants(term);
  for (const variant of variants) {
    const wiki = await searchWikipedia(variant).catch(() => []);
    if (wiki.length > 0) return wiki;
  }
  for (const variant of variants) {
    const openverse = await searchOpenverse(variant).catch(() => []);
    if (openverse.length > 0) return openverse;
  }
  throw new Error("No se pudo buscar imágenes.");
}
