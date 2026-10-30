import { connection } from "next/server";
import { revalidatePath } from "next/cache";

const noStore = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

function allow(request: Request) {
  const expected =
    process.env.STORE_CATALOG_SYNC_SECRET?.trim() ||
    process.env.WEB_STORE_SESSION_SECRET?.trim() ||
    "";
  if (!expected) return true;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return token === expected;
}

export async function POST(request: Request) {
  await connection();
  if (!allow(request)) {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 401, headers: noStore });
  }
  try {
    revalidatePath("/tienda");
    revalidatePath("/");
    revalidatePath("/admin");
  } catch {
    /* cacheComponents puede ignorar el path */
  }
  return Response.json({ ok: true }, { headers: noStore });
}
