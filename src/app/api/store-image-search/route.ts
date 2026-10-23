import { connection } from "next/server";
import { canAccessStoreRedesRequest } from "@/lib/store-redes/access";
import { searchWebProductImages } from "@/lib/store-product-images/web-search";

export const maxDuration = 60;

export async function GET(request: Request) {
  await connection();
  if (!canAccessStoreRedesRequest(request)) {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  try {
    const items = await searchWebProductImages(query);
    return Response.json({ ok: true, items });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo buscar imágenes." },
      { status: 400 },
    );
  }
}
