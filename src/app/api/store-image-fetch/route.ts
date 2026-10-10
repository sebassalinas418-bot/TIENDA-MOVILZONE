const noStore = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

export async function GET(request: Request) {
  const href = new URL(request.url).searchParams.get("url")?.trim() ?? "";
  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    return Response.json({ error: "url" }, { status: 400, headers: noStore });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return Response.json({ error: "url" }, { status: 400, headers: noStore });
  }

  try {
    const response = await fetch(parsed, {
      headers: { Accept: "image/*,*/*;q=0.8", "User-Agent": "MovilzoneStore/1.0" },
      cache: "no-store",
      redirect: "follow",
    });
    if (!response.ok) {
      return Response.json({ error: "fetch" }, { status: 502, headers: noStore });
    }
    const type = response.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) {
      return Response.json({ error: "type" }, { status: 415, headers: noStore });
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 4_000_000) {
      return Response.json({ error: "size" }, { status: 413, headers: noStore });
    }
    return new Response(buffer, {
      headers: {
        ...noStore,
        "Content-Type": type,
      },
    });
  } catch {
    return Response.json({ error: "fetch" }, { status: 502, headers: noStore });
  }
}
