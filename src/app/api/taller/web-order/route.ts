import {
  isStoreAdminSession,
  readStoreSessionCookie,
} from "@/lib/store-session-cookie";
import {
  cancelIncomingWebOrder,
  listWebOrderStatuses,
  recordIncomingWebOrder,
  type WebSaleItem,
} from "@/services/taller-gestio/server";

function actorOf(request: Request) {
  const session = readStoreSessionCookie(request);
  if (!session) return null;
  return { email: session.email, isAdmin: isStoreAdminSession(session), name: session.name };
}

export async function GET(request: Request) {
  const actor = actorOf(request);
  if (!actor) return Response.json({ ok: false, orders: [] }, { status: 401 });
  const ids = new URL(request.url).searchParams.get("ids")?.split(",") ?? [];
  try {
    const orders = await listWebOrderStatuses({
      ids,
      email: actor.email,
      isAdmin: actor.isAdmin,
    });
    return Response.json({ ok: true, orders });
  } catch {
    return Response.json({ ok: false, orders: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const actor = actorOf(request);
  if (!actor) return Response.json({ ok: false }, { status: 401 });
  const body = (await request.json()) as {
    orderId?: string;
    customerName?: string;
    customerEmail?: string;
    notes?: string;
    createdAt?: string;
    items?: WebSaleItem[];
  };
  if (!body.orderId || !Array.isArray(body.items) || body.items.length === 0) {
    return Response.json({ ok: false }, { status: 400 });
  }
  try {
    const result = await recordIncomingWebOrder({
      orderId: body.orderId,
      customerName: actor.name || body.customerName,
      customerEmail: actor.email,
      notes: body.notes,
      createdAt: body.createdAt,
      items: body.items,
    });
    return Response.json(result, { status: result.ok ? 201 : 409 });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const actor = actorOf(request);
  if (!actor) return Response.json({ ok: false }, { status: 401 });
  const body = (await request.json()) as { orderId?: string; action?: string };
  if (!body.orderId || body.action !== "cancel") {
    return Response.json({ ok: false }, { status: 400 });
  }
  try {
    const result = await cancelIncomingWebOrder(body.orderId, actor);
    if (!result.ok && result.reason === "forbidden") {
      return Response.json(result, { status: 403 });
    }
    return Response.json(result, { status: result.ok ? 200 : 409 });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
