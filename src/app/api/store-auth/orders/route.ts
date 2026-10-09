import { readStoreSessionCookie } from "@/lib/store-session-cookie";
import { listStoreOrdersForEmail } from "@/services/store-customers/server";

export async function GET(request: Request) {
  const session = readStoreSessionCookie(request);
  if (!session) return Response.json({ ok: false, orders: [], error: "No autorizado." }, { status: 401 });
  try {
    const result = await listStoreOrdersForEmail(session.email);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return Response.json({ ok: false, orders: [], error: "No se pudieron leer los pedidos." }, { status: 500 });
  }
}
