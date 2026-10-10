const noStore = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

type SearchHit = { url: string; thumb: string; title: string };

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return Response.json({ images: [] as SearchHit[] }, { headers: noStore });
  }

  const images = await searchOpenverse(query);
  return Response.json({ images }, { headers: noStore });
}

async function searchOpenverse(query: string): Promise<SearchHit[]> {
  try {
    const url = new URL("https://api.openverse.org/v1/images/");
    url.searchParams.set("q", query);
    url.searchParams.set("page_size", "16");
    url.searchParams.set("license_type", "commercial");
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "MovilzoneStore/1.0" },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const body = (await response.json()) as {
      results?: { url?: string; thumbnail?: string; title?: string }[];
    };
    return (body.results ?? []).flatMap((item) => {
      const href = item.url?.trim();
      if (!href || !/^https?:\/\//.test(href)) return [];
      return [
        {
          url: href,
          thumb: item.thumbnail?.trim() || href,
          title: item.title?.trim() || query,
        },
      ];
    });
  } catch {
    return [];
  }
}
