export type WebImageHit = {
  url: string;
  thumb: string;
  title: string;
};

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

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

function extractVqd(html: string) {
  return (
    html.match(/vqd=["']([^"']+)["']/)?.[1] ||
    html.match(/\bvqd=([^&"'<\s]+)/)?.[1] ||
    ""
  );
}

function cookieHeader(response: Response) {
  const cookies =
    typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  if (cookies.length) return cookies.map((item) => item.split(";")[0]).join("; ");
  const single = response.headers.get("set-cookie");
  return single ? single.split(";")[0] : "";
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
  const landing = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images&iar=images&t=h_`, {
    headers: BROWSER_HEADERS,
    cache: "no-store",
    redirect: "follow",
  });
  if (!landing.ok) throw new Error("No se pudo buscar imágenes.");
  const html = await landing.text();
  const vqd = extractVqd(html);
  if (!vqd) throw new Error("No se pudo iniciar la búsqueda de imágenes.");
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
  if (!response.ok) throw new Error("No se pudo buscar imágenes.");
  const raw = await response.text();
  let payload: { results?: { image?: string; thumbnail?: string; title?: string }[] };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    throw new Error("No se pudo buscar imágenes.");
  }
  return asHits(
    (payload.results ?? []).map((item) => ({
      url: item.image,
      thumb: item.thumbnail,
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
  const response = await fetch(endpoint, { headers: { "User-Agent": BROWSER_UA }, cache: "no-store" });
  if (!response.ok) return [];
  const payload = (await response.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          title?: string;
          imageinfo?: { url?: string; thumburl?: string; mime?: string }[];
        }
      >;
    };
  };
  const pages = Object.values(payload.query?.pages ?? {});
  return asHits(
    pages.map((page) => {
      const info = page.imageinfo?.[0];
      return {
        url: info?.url,
        thumb: info?.thumburl || info?.url,
        title: page.title?.replace(/^File:/, "") ?? "",
      };
    }),
  );
}

export async function searchWebProductImages(query: string): Promise<WebImageHit[]> {
  const term = query.trim().slice(0, 120);
  if (term.length < 2) throw new Error("Escribí al menos 2 letras para buscar.");
  const cse = await searchGoogleCse(term);
  if (cse && cse.length > 0) return cse;
  try {
    const ddg = await searchDuckDuckGo(term);
    if (ddg.length > 0) return ddg;
  } catch {
    /* Wikimedia cubre si DuckDuckGo bloquea el scraping */
  }
  const wiki = await searchWikimedia(term);
  if (wiki.length > 0) return wiki;
  throw new Error("No se pudo buscar imágenes.");
}
