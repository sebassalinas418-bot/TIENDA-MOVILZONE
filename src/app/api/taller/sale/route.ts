import { registerWebSale, tokenIsTallerAdmin, type WebSaleItem } from "@/services/taller-gestio/server";

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!(await tokenIsTallerAdmin(token))) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const body = (await request.json()) as { orderId?: string; items?: WebSaleItem[] };
  if (!body.orderId || !Array.isArray(body.items) || body.items.length === 0) {
    return Response.json({ ok: false }, { status: 400 });
  }
  try {
    const result = await registerWebSale(body.orderId, body.items);
    return Response.json(result, { status: result.ok ? 200 : 409 });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
