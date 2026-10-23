export type WebImageHit = {
  url: string;
  thumb: string;
  title: string;
};

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const APP_UA = "MovilZoneStore/1.0 (https://movilzone.vercel.app; product-image-search)";

const BROWSER_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
  "User-Agent": BROWSER_UA,
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

function mergeHits(groups: WebImageHit[][]) {
  return asHits(groups.flat().map((item) => ({ url: item.url, thumb: item.thumb, title: item.title })));
}

async function withTimeout<T>(task: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function extractVqd(html: string) {
  return html.match(/vqd=["']([^"']+)["']/)?.[1] || html.match(/\bvqd=([^&"'<\s]+)/)?.[1] || "";
}

function cookieHeader(response: Response) {
  const cookies =
    typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  if (cookies.length) return cookies.map((item) => item.split(";")[0]).join("; ");
  const single = response.headers.get("set-cookie");
  return single ? single.split(";")[0] : "";
}

async function readJson<T>(response: Response): Promise<T | null> {
  const type = (response.headers.get("content-type") ?? "").toLowerCase();
  const raw = await response.text();
  if (!response.ok) return null;
  if (type.includes("html") || raw.trimStart().startsWith("<")) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function searchGoogleCse(query: string): Promise<WebImageHit[]> {
  const key = cseKey();
  const cx = cseCx();
  if (!key || !cx) return [];
  const endpoint = new URL("https://www.googleapis.com/customsearch/v1");
  endpoint.searchParams.set("key", key);
  endpoint.searchParams.set("cx", cx);
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("searchType", "image");
  endpoint.searchParams.set("num", "10");
  endpoint.searchParams.set("safe", "active");
  const response = await fetch(endpoint, { cache: "no-store" });
  const payload = await readJson<{
    items?: { link?: string; title?: string; image?: { thumbnailLink?: string } }[];
  }>(response);
  if (!payload) return [];
  return asHits(
    (payload.items ?? []).map((item) => ({
      url: item.link,
      thumb: item.image?.thumbnailLink,
      title: item.title,
    })),
  );
}

async function searchDuckDuckGo(query: string): Promise<WebImageHit[]> {
  const landing = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images&iar=images&t=h_`, {
    headers: BROWSER_HEADERS,
    cache: "no-store",
    redirect: "follow",
  });
  if (!landing.ok) return [];
  const html = await landing.text();
  const vqd = extractVqd(html);
  if (!vqd) return [];
  const api = new URL("https://duckduckgo.com/i.js");
  api.searchParams.set("o", "json");
  api.searchParams.set("q", query);
  api.searchParams.set("u", "bing");
  api.searchParams.set("l", "ar-es");
  api.searchParams.set("vqd", vqd);
  api.searchParams.set("p", "1");
  api.searchParams.set("f", ",,,");
  const headers: Record<string, string> = {
    Accept: "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": BROWSER_HEADERS["Accept-Language"],
    Referer: "https://duckduckgo.com/",
    "User-Agent": BROWSER_UA,
  };
  const cookie = cookieHeader(landing);
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(api, { headers, cache: "no-store" });
  const payload = await readJson<{ results?: { image?: string; thumbnail?: string; title?: string }[] }>(response);
  if (!payload) return [];
  return asHits(
    (payload.results ?? []).map((item) => ({
      url: item.image,
      thumb: item.thumbnail,
      title: item.title,
    })),
  );
}

async function searchOpenverse(query: string): Promise<WebImageHit[]> {
  const endpoint = new URL("https://api.openverse.org/v1/images/");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("page_size", "20");
  endpoint.searchParams.set("mature", "false");
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json", "User-Agent": APP_UA },
    cache: "no-store",
  });
  const payload = await readJson<{ results?: { url?: string; thumbnail?: string; title?: string }[] }>(response);
  if (!payload) return [];
  return asHits(
    (payload.results ?? []).map((item) => ({
      url: item.url,
      thumb: item.url,
      title: item.title,
    })),
  );
}

async function searchWikimedia(query: string): Promise<WebImageHit[]> {
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
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json", "User-Agent": APP_UA },
    cache: "no-store",
  });
  const payload = await readJson<{
    query?: {
      pages?: Record<string, { title?: string; imageinfo?: { url?: string; thumburl?: string }[] }>;
    };
  }>(response);
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

async function searchMercadoLibre(query: string): Promise<WebImageHit[]> {
  const endpoint = new URL("https://api.mercadolibre.com/sites/MLA/search");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("limit", "20");
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
    cache: "no-store",
  });
  const payload = await readJson<{ results?: { title?: string; thumbnail?: string }[] }>(response);
  if (!payload) return [];
  return asHits(
    (payload.results ?? []).map((item) => {
      const thumb = (item.thumbnail ?? "").replace(/^http:/, "https:");
      const url = thumb.replace(/-I\.(jpg|jpeg|webp|png)$/i, "-O.$1");
      return { url: url || thumb, thumb, title: item.title };
    }),
  );
}

export async function searchWebProductImages(query: string): Promise<WebImageHit[]> {
  const term = query.trim().slice(0, 120);
  if (term.length < 2) throw new Error("Escribí al menos 2 letras para buscar.");

  const cse = await withTimeout(searchGoogleCse(term), 5000, []);
  if (cse.length > 0) return cse;

  const [ddg, mercado, openverse, wiki] = await Promise.all([
    withTimeout(searchDuckDuckGo(term).catch(() => []), 7000, []),
    withTimeout(searchMercadoLibre(term).catch(() => []), 7000, []),
    withTimeout(searchOpenverse(term).catch(() => []), 10000, []),
    withTimeout(searchWikimedia(term).catch(() => []), 7000, []),
  ]);
  const hits = mergeHits([ddg, mercado, openverse, wiki]);
  if (hits.length > 0) return hits;
  throw new Error("No se pudo buscar imágenes.");
}
