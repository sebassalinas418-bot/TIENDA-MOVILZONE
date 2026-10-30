import { connection } from "next/server";
import { canAccessStoreRedesRequest } from "@/lib/store-redes/access";
import {
  listPendingCategoryDeletionEvents,
  resolveCategoryDeletionEvent,
} from "@/services/taller-gestio/category-events";
import { tokenIsTallerAdmin } from "@/services/taller-gestio/server";

const noStore = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

async function allow(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (token && (await tokenIsTallerAdmin(token))) return true;
  return canAccessStoreRedesRequest(request);
}

export async function GET(request: Request) {
  await connection();
  if (!(await allow(request))) {
    return Response.json({ ok: false, events: [] }, { status: 401, headers: noStore });
  }
  const events = await listPendingCategoryDeletionEvents();
  return Response.json({ ok: true, events }, { headers: noStore });
}

export async function POST(request: Request) {
  await connection();
  if (!(await allow(request))) {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 401, headers: noStore });
  }
  let body: { eventId?: unknown; moves?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "JSON inválido." }, { status: 400, headers: noStore });
  }
  const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
  const moves = Array.isArray(body.moves)
    ? body.moves
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as { productId?: unknown; category?: unknown };
          if (typeof row.productId !== "string" || typeof row.category !== "string") return null;
          return { productId: row.productId.trim(), category: row.category.trim() };
        })
        .filter((item): item is { productId: string; category: string } => Boolean(item?.productId && item.category))
    : [];
  if (!eventId) {
    return Response.json({ ok: false, error: "Falta el aviso." }, { status: 400, headers: noStore });
  }
  const result = await resolveCategoryDeletionEvent({ eventId, moves });
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 409, headers: noStore });
  }
  return Response.json({ ok: true }, { headers: noStore });
}
