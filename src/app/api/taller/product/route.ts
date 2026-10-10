import { saveTallerProduct, tokenIsTallerAdmin } from "@/services/taller-gestio/server";

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!(await tokenIsTallerAdmin(token))) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const body = (await request.json()) as {
    id?: string;
    title?: string;
    price?: number;
    stock?: number;
    category?: string;
    image?: string;
  };
  if (!body.title?.trim() || typeof body.price !== "number" || typeof body.stock !== "number") {
    return Response.json({ ok: false }, { status: 400 });
  }
  try {
    const result = await saveTallerProduct({
      id: body.id,
      title: body.title,
      price: body.price,
      stock: body.stock,
      category: body.category?.trim() || "Otros",
      image: body.image,
    });
    return Response.json(result, { status: result.ok ? 200 : 409 });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
