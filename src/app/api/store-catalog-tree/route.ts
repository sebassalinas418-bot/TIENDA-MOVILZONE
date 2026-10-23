import { connection } from "next/server";
import { readStoreCatalogTree, writeStoreCatalogTree } from "@/services/store-catalog-tree/server";

const noStore = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function GET() {
  await connection();
  const tree = await readStoreCatalogTree();
  return Response.json({ ok: true, ...tree }, { headers: noStore });
}

export async function PUT(request: Request) {
  await connection();
  let body: { categories?: unknown; placements?: unknown } = {};
  try {
    body = (await request.json()) as { categories?: unknown; placements?: unknown };
  } catch {
    return Response.json({ ok: false, error: "JSON inválido." }, { status: 400, headers: noStore });
  }
  const result = await writeStoreCatalogTree(body);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 503, headers: noStore });
  }
  return Response.json({ ok: true, ...result.tree }, { headers: noStore });
}
