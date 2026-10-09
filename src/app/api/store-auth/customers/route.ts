import { isStoreAdminSession, readStoreSessionCookie } from "@/lib/store-session-cookie";
import { listStoreCustomers } from "@/services/store-customers/server";

export async function GET(request: Request) {
  const session = readStoreSessionCookie(request);
  if (!isStoreAdminSession(session)) {
    return Response.json({ ok: false, customers: [], error: "No autorizado." }, { status: 401 });
  }
  try {
    const result = await listStoreCustomers();
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch {
    return Response.json({ ok: false, customers: [], error: "No se pudieron listar los correos." }, { status: 500 });
  }
}
