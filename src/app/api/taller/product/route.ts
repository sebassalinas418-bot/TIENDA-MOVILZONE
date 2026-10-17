import { connection } from "next/server";
import { canAccessStoreRedesRequest } from "@/lib/store-redes/access";
import { saveTallerProduct, tokenIsTallerAdmin } from "@/services/taller-gestio/server";

export async function POST(request: Request) {
  await connection();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const tallerOk = token ? await tokenIsTallerAdmin(token) : false;
  if (!tallerOk && !canAccessStoreRedesRequest(request)) {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  const body = (await request.json()) as {
    id?: string;
    title?: string;
    price?: number;
    stock?: number;
    category?: string;
    image?: string;
    details?: string;
  };
  if (!body.title?.trim() || typeof body.price !== "number" || typeof body.stock !== "number") {
    return Response.json({ ok: false, error: "Faltan nombre, precio o stock." }, { status: 400 });
  }
  try {
    const result = await saveTallerProduct({
      id: body.id?.startsWith("extra-") ? undefined : body.id,
      title: body.title,
      price: body.price,
      stock: body.stock,
      category: body.category?.trim() || "Otros",
      image: body.image,
      details: typeof body.details === "string" ? body.details : undefined,
    });
    if (!result.ok) {
      return Response.json(
        { ok: false, error: "reason" in result ? String(result.reason) : "No se pudo guardar el producto." },
        { status: 409 },
      );
    }
    return Response.json(result, { status: 200 });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo guardar el producto." },
      { status: 500 },
    );
  }
}
